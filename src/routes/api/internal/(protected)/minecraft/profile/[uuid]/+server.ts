import { env as envPrivate } from "$env/dynamic/private";
import { getMinecraftInfo } from "$lib/server/minecraft";
import { error, json, redirect } from "@sveltejs/kit";
import { v2 as cloudinary } from "cloudinary";
import type { RequestHandler } from "./$types";

const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = envPrivate;

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

  const ms = 1000 * 60 * 60 * 24 * 3;
  const canSync = locals.user.syncedAt === null || Number(locals.user.syncedAt) + ms < Date.now();

  if (!canSync) {
    return error(429, "Rate limited");
  }

  const uuid = params.uuid;

  if (!uuid) {
    return error(400, "Missing UUID");
  }

  if (uuid !== locals.user.id) {
    return error(403, "Unauthorized");
  }

  const profile = await getMinecraftInfo(uuid);

  try {
    const response = await fetch(profile.properties[0].value.textures.SKIN.url);
    const avatarBuffer = await response.arrayBuffer();
    const skin = Buffer.from(avatarBuffer).toString("base64");
    await cloudinary.uploader.upload(`data:image/png;base64,${skin}`, {
      folder: `users/skins`,
      public_id: profile.id,
      overwrite: true,
      resource_type: "image",
      invalidate: true
    });
  } catch (e) {
    console.error(e);
    error(500, "Failed to get skin");
  }

  try {
    const response = await fetch(`https://mc-heads.net/head/${profile.id}`);
    const avatarBuffer = await response.arrayBuffer();
    const avatar = Buffer.from(avatarBuffer).toString("base64");
    await cloudinary.uploader.upload(`data:image/png;base64,${avatar}`, {
      folder: `users/avatars`,
      public_id: profile.id,
      overwrite: true,
      resource_type: "image",
      invalidate: true
    });
  } catch (e) {
    console.error(e);
    error(500, "Failed to get avatar");
  }

  if (profile.properties[0].value.textures.CAPE) {
    try {
      const response = await fetch(profile.properties[0].value.textures.CAPE.url);
      const avatarBuffer = await response.arrayBuffer();
      const cape = Buffer.from(avatarBuffer).toString("base64");
      await cloudinary.uploader.upload(`data:image/png;base64,${cape}`, {
        folder: `users/capes`,
        public_id: profile.id,
        overwrite: true,
        resource_type: "image",
        invalidate: true
      });
    } catch {
      error(500, "Failed to get cape");
    }
  }

  try {
    await prisma.user.update({
      where: {
        id: locals.user.id
      },
      data: {
        username: profile.name,
        syncedAt: new Date()
      }
    });
  } catch (e) {
    console.error(e);
    return error(500, "Failed to update user");
  }

  return json({ success: true });
};
