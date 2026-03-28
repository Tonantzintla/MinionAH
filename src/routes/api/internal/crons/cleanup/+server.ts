import { env as envPrivate } from "$env/dynamic/private";
import { captureCheckIn } from "@sentry/sveltekit";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const { CRON_SECRET } = envPrivate;

export const GET: RequestHandler = async ({ request }) => {
  const checkInId = captureCheckIn({
    monitorSlug: "cleanup",
    status: "in_progress"
  });

  const authorization = request.headers.get("Authorization");

  if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
    console.error("Invalid Authorization header", authorization);
    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup",
      status: "error"
    });
    return json(
      { success: false, error: "Invalid Authorization header" },
      {
        status: 401,
        statusText: "Unauthorized"
      }
    );
  }

  try {
    const response = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.info("Expired sessions cleaned up", response);

    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup",
      status: "ok"
    });
    return json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("Error cleaning up expired sessions", e);
    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup",
      status: "error"
    });
    return json({ success: false, error: e }, { status: 500, statusText: "Internal Server Error" });
  }
};
