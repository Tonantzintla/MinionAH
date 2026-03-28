import { env as envPrivate } from "$env/dynamic/private";
import { updateDiscordAvatar } from "$lib/server/discord";
import { error, json, redirect } from "@sveltejs/kit";
import { v2 as cloudinary } from "cloudinary";
import type { RequestHandler } from "./$types";

const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, DISCORD_API_ENDPOINT, DISCORD_BOT_TOKEN } = envPrivate;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

export const PATCH: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return redirect(302, "/login");
  }

  const discordAccount = await prisma.userOAuthProvider.findFirst({
    where: {
      id: params.id,
      userId: locals.user.id,
      provider: "discord"
    }
  });

  if (!discordAccount) {
    return error(400, "Missing Discord account");
  }

  const ms = 1000 * 60 * 60 * 24 * 3;
  const canSync = discordAccount.syncedAt === null || Number(discordAccount.syncedAt) + ms < Date.now();

  if (!canSync) {
    return error(429, "Rate limited");
  }

  const id = params.id;

  if (!id) {
    return error(400, "Missing ID");
  }

  if (id !== discordAccount.id) {
    return error(403, "Unauthorized");
  }

  const profileResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/${id}`, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    }
  });
  const profile = await profileResponse.json();

  if (!profile || profile.code === 0) {
    return error(500, "Failed to get profile");
  }

  try {
    await Promise.all([
      updateDiscordAvatar(profile.id, profile.avatar),
      prisma.userOAuthProvider.update({
        where: {
          id: params.id,
          userId: locals.user.id,
          provider: "discord"
        },
        data: {
          providerUsername: profile.username,
          syncedAt: new Date()
        }
      })
    ]);
  } catch (e) {
    console.error(e);
    return error(500, "Failed to update user");
  }

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return redirect(302, "/login");
  }

  const discordAccount = await prisma.userOAuthProvider.findFirst({
    where: {
      id: params.id,
      userId: locals.user.id,
      provider: "discord"
    }
  });

  if (!discordAccount) {
    return error(400, "Missing Discord account");
  }

  try {
    await Promise.all([
      cloudinary.uploader.destroy(discordAccount.id),
      prisma.userOAuthProvider.delete({
        where: {
          id: params.id,
          userId: locals.user.id,
          provider: "discord"
        }
      })
    ]);
  } catch (e) {
    console.error(e);
    return error(500, "Failed to delete account");
  }

  return json({ success: true });
};
