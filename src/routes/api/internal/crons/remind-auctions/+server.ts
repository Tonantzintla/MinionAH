import { CRON_SECRET, FIREBASE_SERVICE_CLIENT_EMAIL, FIREBASE_SERVICE_PRIVATE_KEY, FIREBASE_SERVICE_PROJECT_ID, MINIONAH_SECRET } from "$env/static/private";
import { captureCheckIn } from "@sentry/sveltekit";
import { json } from "@sveltejs/kit";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const checkInId = captureCheckIn({
    monitorSlug: "remind-auctions",
    status: "in_progress"
  });

  const authorization = request.headers.get("Authorization");

  if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
    console.error("Invalid Authorization header", authorization);
    captureCheckIn({
      checkInId,
      monitorSlug: "remind-auctions",
      status: "error"
    });
    return json(
      { success: false, error: "Invalid Authorization header" },
      {
        status: 401,
        statusText: "Unauthorized"
      }
    );
  }

  try {
    const now = new Date();
    const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;
    const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;

    // Get auctions that are about to expire
    const response = await prisma.auction.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                // For bumped auctions: check if they're approaching expiration
                timeBumped: {
                  not: null,
                  // Between 11-14 days old from bump
                  lt: new Date(now.getTime() - THREE_DAYS),
                  gt: new Date(now.getTime() - TWO_WEEKS)
                }
              },
              {
                // For non-bumped auctions: check original creation date
                AND: {
                  timeBumped: null,
                  timeCreated: {
                    // At least 2 weeks old
                    lt: new Date(now.getTime() - TWO_WEEKS)
                  }
                }
              }
            ]
          },
          {
            OR: [
              { timeEmailed: null },
              {
                timeEmailed: {
                  // Only email if last reminder was sent more than 3 days ago
                  lt: new Date(now.getTime() - THREE_DAYS)
                }
              }
            ]
          }
        ]
      },
      include: {
        user: {
          include: {
            settings: {
              include: {
                notificationSettings: true,
                profileSettings: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        },
        minion: {
          select: {
            name: true
          }
        }
      }
    });

    console.info("Query time:", new Date());
    console.info("Found", response.length, "auctions that are about to expire");
    console.info("Results:", response);

    // Send reminders to users
    const firebaseApp =
      getApps().length === 0
        ? initializeApp(
            {
              credential: cert({
                clientEmail: FIREBASE_SERVICE_CLIENT_EMAIL,
                projectId: FIREBASE_SERVICE_PROJECT_ID,
                privateKey: Buffer.from(FIREBASE_SERVICE_PRIVATE_KEY, "base64").toString("utf-8")
              })
            },
            "admin"
          )
        : getApp("admin");

    const messaging = getMessaging(firebaseApp);

    let promiseFactories: (() => Promise<any>)[] = [];
    let emails: {
      username: string;
      userEmail: string;
      auctions: {
        id: string;
        minionId: string;
      }[];
    }[] = [];

    // Group auctions by user
    const userAuctions = response.reduce(
      (acc, auction) => {
        const userId = auction.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: auction.user,
            auctions: []
          };
        }
        acc[userId].auctions.push({
          id: auction.id,
          amount: auction.amount,
          minionId: auction.minion_id,
          minionName: auction.minion.name
        });
        return acc;
      },
      {} as Record<string, { user: any; auctions: any[] }>
    );

    // Process each user's notifications
    for (const [userId, data] of Object.entries(userAuctions)) {
      const { user, auctions } = data;
      const { settings } = user;

      if (!settings?.notificationSettings?.socialNotifications) {
        console.info("Skipping user", user.id, "aka", user.username, "because they have social notifications disabled");
        continue;
      }

      // Prepare notification content
      const auctionCount = auctions.length;
      const notificationTitle = `${auctionCount} ${auctionCount === 1 ? "Auction" : "Auctions"} About to Expire`;
      const notificationBody = auctions.map((a) => `${a.amount} ${a.minionName}`).join(", ");

      if (settings?.notificationSettings?.notificationType === "ALL" || settings?.notificationSettings?.notificationType === "DEVICE") {
        const message: MulticastMessage = {
          notification: {
            title: notificationTitle,
            body: notificationBody,
            imageUrl: `https://res.cloudinary.com/minionah/image/upload/v1/minions/head/${auctions[0].minionId}`
          },
          tokens: settings.notificationSettings.fcmTokens,
          webpush: {
            fcmOptions: {
              link: "https://minionah.com/profile"
            },
            notification: {
              icon: `https://res.cloudinary.com/minionah/image/upload/v1/minions/head/${auctions[0].minionId}`,
              image: `https://res.cloudinary.com/minionah/image/upload/v1/minions/head/${auctions[0].minionId}`,
              tag: `bump-summary-${userId}`,
              renotify: true
            }
          }
        };

        promiseFactories.push(() =>
          messaging.sendEachForMulticast(message).catch((error) => {
            console.error("Error sending message:", error);
          })
        );
      }

      if (settings?.notificationSettings?.notificationType === "ALL" || settings?.notificationSettings?.notificationType === "EMAIL") {
        if (settings?.profileSettings?.email) {
          emails.push({
            username: user.username,
            userEmail: settings.profileSettings.email,
            auctions: auctions.map((a) => ({
              id: a.id.toString(),
              minionId: a.minionId.toString()
            }))
          });
        }
      }
    }

    if (emails.length !== 0) {
      promiseFactories.push(() =>
        fetch("https://next.minionah.com/api/resend/auctionreminder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MINIONAH_SECRET}`
          },
          body: JSON.stringify(emails)
        }).catch((error) => {
          console.error("Error sending emails:", error);
        })
      );
    }

    console.info("Sending notifications to", Object.keys(userAuctions).length, "users");

    await Promise.all(promiseFactories.map((factory) => factory()));

    console.info(`Sent ${promiseFactories.length} notifications`);

    captureCheckIn({
      checkInId,
      monitorSlug: "remind-auctions",
      status: "ok"
    });

    return json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("Error sending reminders", e);

    captureCheckIn({
      checkInId,
      monitorSlug: "remind-auctions",
      status: "error"
    });

    return json({ success: false, error: e }, { status: 500, statusText: "Internal Server Error" });
  }
};
