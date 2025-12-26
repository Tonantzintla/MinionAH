<script lang="ts">
  import type { Minion } from "$generated/prisma";
  import { OrbitingCircles } from "$lib/components/magicui";
  import * as Avatar from "$lib/components/ui/avatar";
  import SvelteSeo from "svelte-seo";
  import type { PageData } from "./$types";
  import DataTable from "./data-table.svelte";

  export let data: PageData;

  const calculateMinionStats = (minions: Minion[], auctions: { minion_id: string; price: number; hasFreeWill: boolean; hasInfusion: boolean }[]) => {
    return minions.map((minion) => {
      const minionAuctions = auctions.filter((a) => a.minion_id === minion.id);
      const auctionCount = minionAuctions.length;

      const validAuctionsForPrice = minionAuctions.filter((a) => !a.hasFreeWill && !a.hasInfusion);
      const averagePrice = validAuctionsForPrice.length > 0 ? validAuctionsForPrice.reduce((acc, curr) => acc + curr.price, 0) / validAuctionsForPrice.length : 0;

      return { ...minion, auctionCount, averagePrice };
    });
  };
</script>

<SvelteSeo
  title="MinionAH - Minion Price Checker"
  description="MinionAH is the best place to check Hypixel SkyBlock minion prices. See the craft cost of each minion and tier so you can make the best decision when buying or selling minions."
  themeColor="#171717"
  canonical="https://minionah.com/pricecheck"
  keywords="MinionAH, Hypixel SkyBlock, minions, auction house, minion trading, skyblock auction, skyblock minions, Hypixel minions, buy minions, sell minions, minionah, skyblock, minion ah, minion auctions, minion skyblock"
  openGraph={{
    type: "website",
    url: "https://minionah.com/pricecheck",
    title: "MinionAH: Minion Price Checker",
    description: "MinionAH is the best place to check Hypixel SkyBlock minion prices. See the craft cost of each minion and tier so you can make the best decision when buying or selling minions.",
    images: [
      {
        url: "https://minionah.com/assets/images/ogBanner.png?v=2",
        secure_url: "https://minionah.com/assets/images/ogBanner.png?v=2",
        alt: "MinionAH",
        width: 1200,
        height: 630,
        type: "image/png"
      }
    ],
    site_name: "MinionAH",
    locale: "en_US"
  }}
  twitter={{
    card: "summary_large_image",
    creator: "@iDarthGigi",
    title: "MinionAH: Minion Price Checker",
    description: "MinionAH is the best place to check Hypixel SkyBlock minion prices. See the craft cost of each minion and tier so you can make the best decision when buying or selling minions.",
    image: "https://minionah.com/assets/images/ogBanner.png?v=2",
    imageAlt: "MinionAH"
  }} />

<div class="relative mx-auto flex h-52 w-full items-center justify-center">
  <h2 class="pointer-events-none -z-20 flex w-full flex-col items-center justify-center whitespace-pre-wrap bg-gradient-to-b from-primary to-primary-foreground bg-clip-text text-center text-6xl font-semibold leading-none text-foreground md:flex-row md:gap-64">
    <span class="md:pl-8">Price</span>
    <span>Check</span>
  </h2>
  <Avatar.Root class="absolute -z-10 h-9 w-9 flex-shrink-0 rounded-full">
    <Avatar.Image class="pointer-events-none h-full w-full bg-accent p-1" src="/assets/images/coin.png" alt="Coin" />
    <Avatar.Fallback class="border-2 border-accent bg-accent">CO</Avatar.Fallback>
  </Avatar.Root>
  {#await data.minions}
    {#each Array(6) as _, index}
      {#if index < 2}
        <OrbitingCircles className="size-8 border-none bg-transparent" duration={20} delay={10 * index} radius={40} path={index === 0}>
          <div class="size-full animate-pulse rounded-full bg-accent"></div>
        </OrbitingCircles>
      {:else}
        <OrbitingCircles className="size-8 border-none bg-transparent" duration={20} delay={10 + index * 5} radius={80} reverse={true} path={index === 2}>
          <div class="size-full animate-pulse rounded-full bg-accent"></div>
        </OrbitingCircles>
      {/if}
    {/each}
  {:then minions}
    {@const randomMinions = minions.sort(() => Math.random() - Math.random()).slice(0, 6)}
    {#each randomMinions as minion, index}
      {#if index < 2}
        <OrbitingCircles className="size-8 border-none bg-transparent" duration={20} delay={10 * index} radius={40} path={index === 0}>
          <div class="flex items-center gap-4">
            <Avatar.Root class="h-9 w-9 flex-shrink-0 rounded-full ">
              <Avatar.Image class="pointer-events-none h-full w-full bg-accent p-1" src={`https://res.cloudinary.com/minionah/image/upload/v1/minions/head/${minion.id}`} alt={`${minion.name}'s avatar`} />
              <Avatar.Fallback class="border-2 border-accent bg-accent">{minion.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
          </div>
        </OrbitingCircles>
      {:else}
        <OrbitingCircles className="size-8 border-none bg-transparent" duration={20} delay={10 + index * 5} radius={80} reverse={true} path={index === 2}>
          <div class="flex items-center gap-4">
            <Avatar.Root class="h-9 w-9 flex-shrink-0 rounded-full ">
              <Avatar.Image class="pointer-events-none h-full w-full bg-accent p-1" src={`https://res.cloudinary.com/minionah/image/upload/v1/minions/head/${minion.id}`} alt={`${minion.name}'s avatar`} />
              <Avatar.Fallback class="border-2 border-accent bg-accent">{minion.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
          </div>
        </OrbitingCircles>
      {/if}
    {/each}
  {/await}
</div>
<div class="container mx-auto pb-10">
  {#await Promise.all([data.minions, data.auctions])}
    <div class="mt-[4.5rem] divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
      <div class="h-12 w-full animate-pulse bg-muted"></div>
      {#each Array(12) as _, index (index)}
        <div class="h-[4.25rem] w-full animate-pulse bg-muted"></div>
      {/each}
    </div>
  {:then [minions, auctions]}
    <DataTable data={calculateMinionStats(minions, auctions)} />
    {:catch}
    <p class="text-destructive-foreground">Something went wrong, try refreshing the page. If the problem persists, please submit a bug report or contact us.</p>
    {/await}
    <p class="mx-auto w-fit text-xs text-muted-foreground/50 mb-4">
      Auctions with either Free Will or Infusion are not included in the average price.
    </p>
    <p class="mx-auto w-fit text-xs text-muted-foreground/50">Are you a developer? Check out the <a href="/api/craftcost/docs" class="underline">API</a></p>
</div>
