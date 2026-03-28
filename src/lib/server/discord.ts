import { env as envPrivate } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = envPrivate;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

export const updateDiscordAvatar = async (discordId: string, discordAvatarHash: string) => {
  try {
    if (!discordId || !discordAvatarHash) {
      error(500, "Error getting Discord profile");
    }

    const discordAvatarResponse = await fetch(`https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}`);
    const discordAvatarBuffer = await discordAvatarResponse.arrayBuffer();
    const discordAvatar = `data:image/png;base64,${Buffer.from(discordAvatarBuffer).toString("base64")}`;

    await cloudinary.uploader.upload(discordAvatar, {
      folder: `users/providers/discord/avatars`,
      public_id: discordId,
      overwrite: true,
      resource_type: "image"
    });
  } catch (e) {
    console.error(e);
    error(500, "Something went wrong while updating your Discord avatar");
  }
};
