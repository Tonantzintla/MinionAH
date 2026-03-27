import { dev } from "$app/environment";
import { env as envPrivate } from "$env/dynamic/private";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import { Discord, generateCodeVerifier, generateState } from "arctic";

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = envPrivate;

const discord = new Discord(DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, dev ? "http://localhost:5173/api/oauth/discord/callback" : DISCORD_REDIRECT_URI);

const state = generateState();
const codeVerifier = generateCodeVerifier();
const scopes = ["identify"];
const url = discord.createAuthorizationURL(state, codeVerifier, scopes);

export const GET: RequestHandler = async ({ cookies }) => {
  // the state can be stored in cookies or localstorage for request validation on callback
  cookies.set("discord_oauth_state", state, {
    secure: !dev,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10 // 10min
  });

  cookies.set("discord_code_verifier", codeVerifier, {
    secure: !dev,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10 // 10min
  });

  // redirect to authorization url
  redirect(302, url);
};
