import { env as envPrivate } from "$env/dynamic/private";
import { getMinecraftUserByUsername, type MinecraftUsernameProfile } from "$lib/server/minecraft";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const { MC_ID_API_KEY } = envPrivate;

export const POST: RequestHandler = async ({ request }) => {
  const { username } = (await request.json()) as {
    username?: string;
  };

  if (!username) {
    error(400, "Username is required");
  }

  let userData: MinecraftUsernameProfile;
  try {
    userData = await getMinecraftUserByUsername(username);
  } catch (err) {
    console.error(`Couldn't find any player with name ${username}`, err);
    error(404, `Couldn't find any player with the name ${username}`);
  }

  const response = await fetch("https://mc-id.com/api/v1/codes/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MC_ID_API_KEY
    },
    body: JSON.stringify({
      uuid: userData.id
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error(`Failed to request code for username ${username}:`, errorData);

    if (response.status === 404) {
      error(404, `Couldn't find any player with the name ${username}`);
    }

    if (response.status === 401 || response.status === 403) {
      error(500, "MC-ID API key is invalid or missing permissions");
    }

    error(400, `Failed to request code for username ${username}`);
  }

  return json(
    {
      success: true,
      message: `Code requested successfully for username ${username}`
    },
    {
      status: 200,
      statusText: "OK"
    }
  );
};
