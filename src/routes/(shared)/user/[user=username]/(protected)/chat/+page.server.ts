import { DISCORD_BOT_API_SECRET, FIREBASE_SERVICE_CLIENT_EMAIL, FIREBASE_SERVICE_PRIVATE_KEY, FIREBASE_SERVICE_PROJECT_ID, MINIONAH_SECRET, app_id, secret } from "$env/static/private";
import { PUBLIC_cluster, PUBLIC_key } from "$env/static/public";
import { sanitize } from "@jill64/universal-sanitizer";
import { error, fail, redirect } from "@sveltejs/kit";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import Pusher from "pusher";
import type { PageServerLoad } from "./$types";
import { MessageType, type iMessage } from "./+page.svelte";

export const load = (async ({ params, locals }) => {
  const user = locals.user;

  if (!user) {
    redirect(302, "/login");
  }

  const username = params.user;

  const user2 = await prisma.user.findUnique({
    where: {
      username
    }
  });

  if (!user2) {
    redirect(302, "/");
  }

  if (user.id === user2?.id) {
    redirect(302, `/user/${user.username}`);
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: {
        OR: [
          {
            user1_id: {
              equals: user.id
            },
            user2_id: {
              equals: user2?.id
            }
          },
          {
            user1_id: {
              equals: user2?.id
            },
            user2_id: {
              equals: user.id
            }
          }
        ]
      }
    });

    if (!chat) {
      return { chat, user, user2, params, messages: [] };
    }

    await prisma.chat.update({
      where: {
        id: chat.id
      },
      data: {
        user1Read: user.id === chat.user1_id ? true : chat.user1Read,
        user2Read: user.id === chat.user2_id ? true : chat.user2Read
      }
    });

    const messages = await prisma.message.findMany({
      where: {
        chat_id: {
          equals: chat.id
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return { chat, user, user2, params, messages };
  } catch (e) {
    console.error(e);
    error(500, "Internal Server Error");
  }
}) satisfies PageServerLoad;

export const actions = {
  createChat: async ({ locals, params }) => {
    const user = locals.user;

    if (!user) {
      redirect(302, "/login");
    }

    const username = params.user;

    const user2 = await prisma.user.findUnique({
      where: {
        username
      }
    });

    if (!user2) {
      redirect(302, "/");
    }

    if (user.id === user2?.id) {
      redirect(302, `/user/${user.username}`);
    }

    try {
      const exitingChat = await prisma.chat.findFirst({
        where: {
          OR: [
            {
              user1_id: {
                equals: user.id
              },
              user2_id: {
                equals: params.user
              }
            },
            {
              user1_id: {
                equals: params.user
              },
              user2_id: {
                equals: user.id
              }
            }
          ]
        }
      });

      if (exitingChat) {
        return { exitingChat, user, user2, params };
      }

      await prisma.chat.create({
        data: {
          user1: {
            connect: {
              id: user.id
            }
          },
          user2: {
            connect: {
              id: user2?.id
            }
          },
          user1Read: true,
          user2Read: true
        }
      });

      return { exitingChat, user, user2, params };
    } catch (e) {
      console.error(e);
      error(500, "Internal Server Error");
    }
  },
  sendMessage: async ({ locals, request, params }) => {
    const data = await request.formData();
    const dataMessage = data.get("message");
    const messageJSON: Omit<iMessage, "animate"> = dataMessage ? JSON.parse(dataMessage.toString()) : null;
    const messageType = messageJSON ? messageJSON.type : null;

    if (!messageType || messageJSON.content === "") {
      return fail(400, { message: "Message is required" });
    }

    const user = locals.user;

    if (!user) {
      redirect(302, "/login");
    }

    try {
      // max message size
      if (messageType === MessageType.TEXT && messageJSON.content.length > 1000) {
        throw new Response("Message exceeds max 1000 characters", {
          status: 413,
          statusText: "Message exceeds max 1000 characters"
        });
      }

      const username = params.user;

      const user2 = await prisma.user.findUnique({
        where: {
          username
        },
        include: {
          settings: {
            include: {
              notificationSettings: true,
              profileSettings: true
            }
          },
          oauth: {
            where: {
              provider: "discord",
              userId: user.id
            }
          }
        }
      });

      const chat = await prisma.chat.findFirst({
        where: {
          OR: [
            {
              user1_id: {
                equals: user.id
              },
              user2_id: {
                equals: user2?.id
              }
            },
            {
              user1_id: {
                equals: user2?.id
              },
              user2_id: {
                equals: user.id
              }
            }
          ]
        }
      });

      if (!chat) {
        redirect(302, "/profile/chats");
      }

      const firebaseApp =
        getApps().length === 0
          ? initializeApp(
              {
                credential: cert({
                  clientEmail: FIREBASE_SERVICE_CLIENT_EMAIL,
                  projectId: FIREBASE_SERVICE_PROJECT_ID,
                  privateKey: Buffer.from(FIREBASE_SERVICE_PRIVATE_KEY, "base64").toString("utf-8").replace(/\\n/g, "\n")
                })
              },
              "admin"
            )
          : getApp("admin");

      const messaging = getMessaging(firebaseApp);

      const pusher = new Pusher({
        appId: app_id,
        key: PUBLIC_key,
        secret: secret,
        cluster: PUBLIC_cluster,
        useTLS: true
      });

      await pusher
        .trigger(`chat-${chat.id}`, "new-message", {
          chat_id: chat.id,
          user_id: user.id,
          content: messageJSON.content,
          createdAt: messageJSON.createdAt,
          id: messageJSON.id,
          type: messageType
        })
        .then(async (res) => {
          if (res.status === 200) {
            await Promise.all([
              prisma.message.create({
                data: {
                  chat_id: chat!.id,
                  content: messageJSON.content,
                  user_id: user.id,
                  type: messageType
                }
              }),
              prisma.chat.update({
                where: {
                  id: chat!.id
                },
                data: {
                  user1Read: user.id === chat!.user1_id ? chat!.user1Read : false,
                  user2Read: user.id === chat!.user2_id ? chat!.user2Read : false
                }
              })
            ]);
          }
        })
        .catch((err) => {
          console.error(err);
          switch (err.statusCode) {
            case 400:
              return fail(err.body, {
                status: 400,
                statusText: "Bad Request"
              });
            case 401:
              return fail(err.body, {
                status: 401,
                statusText: "Unauthorized"
              });
            case 403:
              return fail(err.body, {
                status: 403,
                statusText: "Forbidden"
              });
            default:
              return fail(err.body, {
                status: 500,
                statusText: "Internal Server Error"
              });
          }
        });

      // get the notification settings of the other user
      const notificationSettings =
        user.id === chat.user1_id
          ? user2?.settings?.notificationSettings
          : await prisma.notificationSettings.findFirst({
              where: {
                userSettings: {
                  user_id: chat.user1_id
                }
              }
            });

      if (notificationSettings?.notificationType.includes("DEVICE") && notificationSettings.socialNotifications) {
        if (notificationSettings.fcmTokens.length > 0) {
          const unreadCount = await prisma.chat.count({
            where: {
              id: chat.id,
              OR: [
                {
                  user1_id: {
                    equals: user2?.id
                  },
                  user1Read: {
                    equals: false
                  }
                },
                {
                  user2_id: {
                    equals: user2?.id
                  },
                  user2Read: {
                    equals: false
                  }
                }
              ]
            }
          });
          const pushMessage: MulticastMessage = {
            notification: {
              title: `${user.username}`,
              body: sanitize(messageType === MessageType.TEXT ? messageJSON.content : "", {
                sanitizeHtml: {
                  allowedTags: [],
                  disallowedTagsMode: "discard"
                }
              }),
              imageUrl: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`
            },
            data: {
              chat_id: chat.id,
              user_id: user.id,
              username: user.username
            },
            tokens: notificationSettings.fcmTokens,
            webpush: {
              fcmOptions: {
                link: `https://minionah.com/${user.username}/chat`
              },
              notification: {
                icon: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`,
                image: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`,
                tag: `chat-${chat.id}`,
                renotify: true
              },
              data: {
                unreadCount: unreadCount.toString()
              }
            }
          };

          await messaging.sendEachForMulticast(pushMessage).catch((error) => {
            console.error("Error sending message:", error);
          });
        }
      }

      // get the profile settings of the other user
      const profileSettings =
        user.id === chat.user1_id
          ? user2?.settings?.profileSettings
          : await prisma.profileSettings.findFirst({
              where: {
                userSettings: {
                  user_id: chat.user1_id
                }
              }
            });

      const alreadySentEmail = user.id === chat.user1_id ? chat.user2Emailed : chat.user1Emailed;

      if (profileSettings && !alreadySentEmail) {
        if (notificationSettings?.notificationType.includes("EMAIL")) {
          if (notificationSettings.socialNotifications && profileSettings?.email) {
            const data = await fetch("https://next.minionah.com/api/resend/userchat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MINIONAH_SECRET}`
              },
              body: JSON.stringify({
                username: user2?.username,
                chatByUserImage: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`,
                chatByUsername: user.username,
                userEmail: profileSettings.email
              })
            }).then((res) => res.json());

            if (!data.error) {
              await prisma.chat.update({
                where: {
                  id: chat.id
                },
                data: {
                  user1Emailed: user2?.id === chat.user1_id ? true : chat.user1Emailed,
                  user2Emailed: user2?.id === chat.user2_id ? true : chat.user2Emailed
                }
              });
            } else {
              console.error(data.error);
            }
          }
        }
      }

      // get the oauth settings of the other user
      const oauthSettings =
        user.id === chat.user1_id
          ? user2?.oauth
          : await prisma.userOAuthProvider.findMany({
              where: {
                user: {
                  id: chat.user1_id
                },
                provider: "discord"
              }
            });

      if (oauthSettings && oauthSettings.length) {
        if (notificationSettings?.notificationType.includes("DISCORD") && notificationSettings.socialNotifications) {
          const response = await fetch("https://bot.minionah.com/notifications/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: DISCORD_BOT_API_SECRET
            },
            body: JSON.stringify({
              receiverDiscordID: oauthSettings[0].id,
              senderUsername: user.username,
              senderID: user.id
            })
          });

          const responseData = await response.json();

          if (!response.ok || responseData.code === 50007) {
            console.error("Error sending notification:", response.statusText);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error(error);
      return fail(500, { message: "Internal Server Error", success: false });
    }
  }
};
