import { DISCORD_BOT_API_SECRET, FIREBASE_SERVICE_CLIENT_EMAIL, FIREBASE_SERVICE_PRIVATE_KEY, FIREBASE_SERVICE_PROJECT_ID } from "$env/static/private";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import type { Message } from "firebase-admin/messaging";
import { getMessaging } from "firebase-admin/messaging";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, fetch, request }) => {
  const { type, fcmToken }: { type: "DISCORD" | "DEVICE"; fcmToken: string } = await request.json();

  if (!type) {
    return new Response("No notification type provided", {
      status: 400
    });
  }

  if (type !== "DISCORD" && type !== "DEVICE") {
    return new Response("Invalid notification type", {
      status: 400
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: locals.user!.id
    },
    select: {
      oauth: {
        where: {
          provider: "discord",
          userId: locals.user!.id
        }
      },
      username: true,
      id: true
    }
  });

  if (!user) return new Response("User not found", { status: 404 });

  if (type === "DISCORD") {
    if (!user.oauth || !user.oauth.length) return new Response("Discord not linked", { status: 400 });

    const response = await fetch("https://bot.minionah.com/notifications/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: DISCORD_BOT_API_SECRET
      },
      body: JSON.stringify({
        receiverDiscordID: user.oauth[0].id,
        senderUsername: user.username,
        senderID: user.id
      })
    });

    if (!response.ok) {
      console.error("Error sending notification:", response.statusText);
      return new Response("Error sending notification", { status: 500 });
    }

    return new Response("Notification sent successfully", {
      status: 200
    });
  }

  if (type === "DEVICE") {
    if (!fcmToken) return new Response("FCM token not provided", { status: 400 });

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

    const pushMessage: Message = {
      notification: {
        title: `${user.username}`,
        body: "This is a test notification",
        imageUrl: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`
      },
      data: {
        user_id: user.id,
        username: user.username
      },
      token: fcmToken,
      webpush: {
        fcmOptions: {
          link: `https://minionah.com/${user.username}/chat`
        },
        notification: {
          icon: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`,
          image: `https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`,
          tag: "chat-test",
          renotify: true
        }
      }
    };

    await messaging.send(pushMessage).catch((error) => {
      console.error("Error sending message:", error);
      return new Response("Error sending notification", { status: 500 });
    });

    return new Response("Notification sent successfully", {
      status: 200
    });
  }

  return new Response("Invalid notification type", {
    status: 400
  });
};
