import { env as envPublic } from "$env/dynamic/public";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const { PUBLIC_SENTRY_HOST, PUBLIC_SENTRY_PROJECT_ID } = envPublic;

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const envelopeBytes = await request.arrayBuffer();
    const upstream_sentry_url = `https://${PUBLIC_SENTRY_HOST}/api/${PUBLIC_SENTRY_PROJECT_ID}/envelope/`;

    await fetch(upstream_sentry_url, {
      method: "POST",
      body: envelopeBytes
    });

    return json({}, { status: 200 });
  } catch (e) {
    console.error("Error tunneling to Sentry", e);
    return json({ error: "Error tunneling to Sentry" }, { status: 500 });
  }
};
