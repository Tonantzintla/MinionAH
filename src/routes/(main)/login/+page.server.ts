import { env as envPrivate } from "$env/dynamic/private";
import { createSession, generateSessionToken } from "$lib/server/lucia/auth";
import { setSessionTokenCookie } from "$lib/server/lucia/cookies";
import { getMinecraftInfo, getMinecraftUserByUsername, normalizeMinecraftUuid } from "$lib/server/minecraft";
import { getMcAuthUser } from "$lib/server/signup";
import { hash, verify, type Options } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { LegacyScrypt } from "lucia";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { loginFormSchema, mcLoginFormSchema, signupFormSchema } from "./schema";

const { MC_ID_API_KEY } = envPrivate;

const hashOptions = {
  // recommended minimum parameters
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
} satisfies Options;

type McIdVerifyResponse = {
  userId: string;
  username: string;
};

async function verifyMcIdCode(code: string, uuid: string): Promise<McIdVerifyResponse> {
  const response = await fetch("https://mc-id.com/api/v1/codes/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MC_ID_API_KEY
    },
    body: JSON.stringify({
      uuid,
      code
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error(`Failed to verify MC-ID code for UUID ${uuid}:`, errorData);
    throw new Error("Failed to verify code");
  }

  const data = (await response.json()) as Partial<McIdVerifyResponse>;
  if (!data.userId || !data.username) {
    throw new Error("Invalid MC-ID verification response");
  }

  return {
    userId: normalizeMinecraftUuid(data.userId),
    username: data.username
  };
}

async function mcIdHeadlessLogin(code: string, username: string) {
  let mcUserId: string;

  try {
    const user = await getMinecraftUserByUsername(username);
    mcUserId = user.id;
  } catch (e) {
    console.error("Failed to get Minecraft ID for username", username, e);
    throw new Error("Failed to get Minecraft ID");
  }

  const verification = await verifyMcIdCode(code, mcUserId);

  if (verification.userId !== mcUserId) {
    throw new Error("Verification result did not match the requested user");
  }

  const minecraftUser = await getMinecraftInfo(verification.userId);

  const user = await getMcAuthUser(minecraftUser);
  return user;
}

export const load = (async () => {
  return {
    loginForm: await superValidate(zod(loginFormSchema)),
    mcLoginForm: await superValidate(zod(mcLoginFormSchema)),
    signupForm: await superValidate(zod(signupFormSchema))
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const form = await superValidate(request, zod(loginFormSchema));

    if (!form.valid) return fail(400, { form });

    try {
      const key = await prisma.key.findFirst({
        where: {
          id: `username:${form.data.username.toLowerCase()}`
        }
      });

      if (!key) {
        return message(
          form,
          { title: "Failed to log you in", description: 'The username or password you entered is incorrect. Please try again. <br/><br/>If you forgot your password, you can reset it by clicking the "Forgot Password" button.' },
          {
            status: 400
          }
        );
      }
      const password = form.data["current-password"];
      const oldHash = key.hashed_password!;
      const newHash = await hash(password, hashOptions);

      const validPasswordOld = await new LegacyScrypt().verify(oldHash, password);

      const validPassword = await verify(newHash, password);

      if (!validPasswordOld && !validPassword) {
        return message(
          form,
          { title: "Failed to log you in", description: 'The username or password you entered is incorrect. Please try again. <br/><br/>If you forgot your password, you can reset it by clicking the "Forgot Password" button.' },
          {
            status: 400
          }
        );
      } else if (validPasswordOld) {
        await prisma.key.update({
          where: {
            id: key.id
          },
          data: {
            hashed_password: await hash(password, hashOptions)
          }
        });
      }

      const token = generateSessionToken();
      const session = await createSession(token, key?.user_id);

      setSessionTokenCookie(cookies, token, session.expiresAt);
    } catch (e) {
      console.error(e);
      return message(
        form,
        { title: "Unable to log you in", description: "We could not log you in due to a technical issue on our end. Please try again. <br/>If this issue keeps happening, please contact us." },
        {
          status: 500
        }
      );
    }
    redirect(302, "/profile");
  },
  mclogin: async ({ request, cookies }) => {
    const form = await superValidate(request, zod(mcLoginFormSchema));

    if (!form.valid) return fail(400, { form });

    try {
      const key = await prisma.key.findFirst({
        where: {
          id: `username:${form.data.mcloginusername.toLowerCase()}`
        }
      });

      if (!key) {
        return message(
          form,
          { title: "Failed to log you in", description: "The username you entered is incorrect. Please try again." },
          {
            status: 400
          }
        );
      }
    } catch (e) {
      console.error(e);
      return message(
        form,
        { title: "Unable to log you in", description: "We could not log you in due to a technical issue on our end. Please try again. <br/>If this issue keeps happening, please contact us." },
        {
          status: 500
        }
      );
    }

    try {
      const user = await mcIdHeadlessLogin(form.data.logincode, form.data.mcloginusername);

      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      setSessionTokenCookie(cookies, token, session.expiresAt);
    } catch (e) {
      console.error(e);
      return fail(500, { form });
    }

    redirect(302, "/profile");
  },
  signup: async ({ request, cookies, locals }) => {
    const form = await superValidate(request, zod(signupFormSchema));

    if (!form.valid) return fail(400, { form });

    try {
      const user = await mcIdHeadlessLogin(form.data.code, form.data.mcusername);

      const token = generateSessionToken();
      const session = await createSession(token, user.id);
      setSessionTokenCookie(cookies, token, session.expiresAt);

      locals.session = session;
    } catch (e) {
      console.error(e);
      return fail(500, { form });
    }

    redirect(302, "/signup/password");
  }
};
