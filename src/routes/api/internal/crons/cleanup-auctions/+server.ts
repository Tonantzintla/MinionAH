import { env as envPrivate } from "$env/dynamic/private";
import { captureCheckIn } from "@sentry/sveltekit";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const { CRON_SECRET } = envPrivate;

export const GET: RequestHandler = async ({ request }) => {
  const checkInId = captureCheckIn({
    monitorSlug: "cleanup-auctions",
    status: "in_progress"
  });

  const authorization = request.headers.get("Authorization");

  if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
    console.error("Invalid Authorization header", authorization);
    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup-auctions",
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
    // Delete auctions that have not been bumped in 2 weeks and are at least 2 weeks old
    const response = await prisma.auction.deleteMany({
      where: {
        AND: {
          OR: [
            {
              timeBumped: {
                lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
              }
            },
            {
              timeBumped: null
            }
          ],
          timeCreated: {
            lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
          }
        }
      }
    });

    console.info("Deleted", response.count, "expired auctions");

    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup-auctions",
      status: "ok"
    });
    return json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("Error deleting expired auctions", e);
    captureCheckIn({
      checkInId,
      monitorSlug: "cleanup-auctions",
      status: "error"
    });
    return json({ success: false, error: e }, { status: 500, statusText: "Internal Server Error" });
  }
};
