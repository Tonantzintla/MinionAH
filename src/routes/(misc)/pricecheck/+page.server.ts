import type { PageServerLoad } from "./$types";

export const load = (async () => {
  return {
    minions: prisma.minion.findMany(),
    auctions: prisma.auction.findMany({
      where: {
        hasFreeWill: false,
        hasInfusion: false
      },
      select: {
        id: true,
        amount: true,
        minion: true,
        minion_id: true,
        price: true
      }
    })
  };
}) satisfies PageServerLoad;
