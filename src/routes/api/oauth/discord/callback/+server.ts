import { dev } from "$app/environment";
import { env as envPrivate } from "$env/dynamic/private";
import { error, redirect } from "@sveltejs/kit";
import { Discord } from "arctic";
import { v2 as cloudinary } from "cloudinary";
import type { RequestHandler } from "./$types";

const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = envPrivate;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

const discord = new Discord(DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, dev ? "http://localhost:5173/api/oauth/discord/callback" : DISCORD_REDIRECT_URI);

export const GET: RequestHandler = async ({ cookies, locals, fetch, url }) => {
  const params = url.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) redirect(302, "/login"); // missing code or state

  // get state cookie we set when we got the authorization url
  const stateCookie = cookies.get("discord_oauth_state");
  cookies.delete("discord_oauth_state", { path: "/" });

  // validate state
  if (!state || !stateCookie || state !== stateCookie) redirect(302, "/login"); // invalid state

  const codeVerifier = cookies.get("discord_code_verifier");
  cookies.delete("discord_code_verifier", { path: "/" });

  if (!codeVerifier) redirect(302, "/login"); // invalid code verifier

  try {
    const tokens = await discord.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const user = await response.json();
    const discordId = user.id;
    const discordUsername = user.username;
    const discordAvatarHash = user.avatar;

    if (!discordId || !discordUsername || !discordAvatarHash) {
      error(500, "Error getting Discord profile");
    }

    const discordAvatarResponse = await fetch(`https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}`);
    const discordAvatarBuffer = await discordAvatarResponse.arrayBuffer();
    const discordAvatar = `data:image/png;base64,${Buffer.from(discordAvatarBuffer).toString("base64")}`;

    await Promise.all([
      prisma.userOAuthProvider.upsert({
        where: {
          id: discordId
        },
        create: {
          id: discordId,
          provider: "discord",
          providerUsername: discordUsername,
          userId: locals.user!.id
        },
        update: {
          providerUsername: discordUsername
        }
      }),
      cloudinary.uploader.upload(discordAvatar, {
        folder: `users/providers/discord/avatars`,
        public_id: discordId,
        overwrite: true,
        resource_type: "image"
      })
    ]);
  } catch (e) {
    console.error(e);
    error(500, "Something went wrong while trying to authenticate with Discord");
  }

  redirect(302, "/profile/settings");
};
