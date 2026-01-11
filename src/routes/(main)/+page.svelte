<script lang="ts">
  import { MinionCard } from "$lib/components/card";
  import CardLoading from "$lib/components/CardLoading.svelte";
  import HtmlToast from "$lib/components/HtmlToast.svelte";
  import AnimatedGradientText from "$lib/components/magicui/animated-gradient-text.svelte";
  import AnimatedShinyText from "$lib/components/magicui/animated-shiny-text.svelte";
  import MinionsListBox from "$lib/components/MinionsListBox.svelte";
  import NumberFlowTicker from "$lib/components/NumberFlowTicker.svelte";
  import SearchSelect, { SearchType } from "$lib/components/SearchSelect.svelte";
  import TierListbox from "$lib/components/TierListbox.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { Label } from "$lib/components/ui/label";
  import UsersListBox from "$lib/components/UsersListBox.svelte";
  import { internalPreferences, preferences } from "$lib/stores/preferences";
  import { searchSignal } from "$lib/stores/signals";
  import type { Seller } from "$lib/types";
  import { cn } from "$lib/utils";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import ChevronUp from "lucide-svelte/icons/chevron-up";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import LayoutGrid from "lucide-svelte/icons/layout-grid";
  import MessagesSquare from "lucide-svelte/icons/messages-square";
  import Users from "lucide-svelte/icons/users";
  import { onMount } from "svelte";
  import { InfiniteLoader, LoaderState } from "svelte-infinite";
  import SvelteSeo from "svelte-seo";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { draw } from "svelte/transition";
  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  const minions = writable<Promise<Seller[]> | Seller[]>(data.minions);
  const loadingMore = writable(false);
  const currentTier = writable<number | undefined>(undefined);
  const newMinionAmount = writable<number>();
  const searchValue = writable<string>("");
  const maxTier = writable<number | undefined>();
  const searchType = writable<SearchType>(SearchType.Minion);

  const loaderState = new LoaderState();

  searchSignal.subscribe((query) => {
    loaderState.reset();
    searchType.set(SearchType.Minion);
    if (query === $searchValue || query === "") return;
    searchValue.set("");
    searchValue.set(query);
    setTimeout(() => {
      search($currentTier);
      searchSignal.update(() => "");
    });
  });

  onMount(() => {
    // if (!$internalPreferences.hasSeenDiscordToast) {
    //   setTimeout(() => {
    //     toast("Community", {
    //       description: "Would you like to join our Discord server?",
    //       action: {
    //         label: "Join",
    //         onClick: () => {
    //           window.open("https://discord.tonantzintla.org/", "_blank");
    //         }
    //       },
    //       duration: Number.POSITIVE_INFINITY,
    //       onDismiss: () => {
    //         internalPreferences.update((state) => ({ ...state, hasSeenDiscordToast: true }));

    //         toast(HtmlToast, {
    //           duration: 5000,
    //           classes: {
    //             closeButton: "!hidden"
    //           },
    //           componentProps: {
    //             htmlMessage: "You can always join our Discord server by visiting <a href='https://discord.tonantzintla.org/' target='_blank' class='underline'>discord.tonantzintla.org</a>"
    //           }
    //         });
    //       }
    //     });
    //   });
    // }
    if (!$internalPreferences.hasSeenWelcomeGuideToast) {
      setTimeout(() => {
        toast("Welcome to MinionAH!", {
          description: "It seems like you're new here. Would you like to read our guide on how to use MinionAH?",
          action: {
            label: "Read guide",
            onClick: () => {
              internalPreferences.update((state) => ({ ...state, hasSeenWelcomeGuideToast: true }));
              window.open("https://newsroom.minionah.com/minionah-guide", "_blank");
            }
          },
          onDismiss: () => {
            internalPreferences.update((state) => ({ ...state, hasSeenWelcomeGuideToast: true }));

            toast(HtmlToast, {
              duration: 5000,
              classes: {
                closeButton: "!hidden"
              },
              componentProps: {
                htmlMessage: "You can always read the guide by visiting <a href='https://newsroom.minionah.com/minionah-guide' target='_blank' class='underline'>newsroom.minionah.com/minionah-guide</a>"
              }
            });
          },
          duration: Number.POSITIVE_INFINITY
        });
      });
    }

    if (!$internalPreferences.hasSeenDiscordNotificationsToast) {
      if (!data.user) return;
      setTimeout(() => {
        toast("Discord Notifications", {
          description: "Discord notifications are here! Would you like to receive discord messages when someone sends you a message?",
          action: {
            label: "Enable",
            onClick: () => {
              internalPreferences.update((state) => ({ ...state, hasSeenDiscordNotificationsToast: true }));
              window.open("/profile/settings/notifications", "_self");
            }
          },
          onDismiss: () => {
            internalPreferences.update((state) => ({ ...state, hasSeenDiscordNotificationsToast: true }));
            toast(HtmlToast, {
              duration: 5000,
              classes: {
                closeButton: "!hidden"
              },
              componentProps: {
                htmlMessage: "You can always enable notifications by visiting <a href='/profile/settings/notifications' target='_self' class='underline'>your settings</a>"
              }
            });
          },
          duration: Number.POSITIVE_INFINITY
        });
      });
    }
  });

  const loadMore = async () => {
    if (!$preferences.infiniteScroll) return;
    const currentMinionsValue = await $minions;
    search($currentTier, true, currentMinionsValue.length)
      .finally(() => loaderState.loaded())
      .catch((e) => {
        loaderState.error();
        console.error(e);
      });
    if ($newMinionAmount === 0 || $newMinionAmount < 18 || ((await $minions).length === 0 && !$loadingMore)) loaderState.complete();
  };

  const search = async (filterTier?: number | undefined, isMore: boolean = false, skip?: number) => {
    loadingMore.set(isMore);
    if (filterTier === 0) filterTier = undefined;

    let where;

    if (filterTier || $searchValue) {
      if ($searchType === SearchType.Minion) {
        where = {
          minion: {
            ...(filterTier && { generator_tier: filterTier }),
            ...($searchValue && {
              AND: [{ generator: $searchValue }, { generator_tier: filterTier }]
            })
          }
        };
      } else {
        where = {
          user: {
            ...($searchValue && { id: { contains: $searchValue, mode: "insensitive" } })
          }
        };
      }
    }

    const res = await fetch(
      "/api/internal/search/minions?" +
        new URLSearchParams({
          ...(where && { where: JSON.stringify(where) }),
          ...(skip && { skip: skip.toString() })
        }),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    )
      .then((res) => {
        // reset the minions
        if (!isMore) minions.set([]);
        return res.json();
      })
      .finally(() => {
        loadingMore.set(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(HtmlToast, {
          classes: {
            closeButton: "!hidden"
          },
          componentProps: {
            htmlMessage: "Something went wrong while trying to load minions. <br/> Please try again later."
          }
        });
      });

    newMinionAmount.set(res.length);

    minions.set([...Array.from(await $minions), ...res]);
  };
</script>

<SvelteSeo
  jsonLd={{
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MinionAH",
    alternateName: "Minion Auction House",
    description: "The best place to buy and sell Hypixel SkyBlock minions",
    url: "https://minionah.com",
    logo: "https://minionah.com/favicon.png",
    email: "contact@minionah.com",
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@minionah.com"
    }
  }} />

<h2 class="sr-only">MinionAH - The Auction House for SkyBlock Minions</h2>

<div class="mt-8 flex justify-center space-x-1 text-center text-4xl font-bold tracking-[-0.045em] text-white md:mt-20 md:text-7xl md:leading-[5rem]">MinionAH</div>

{#await data.pillData}
  <Button class="group pointer-events-none z-10 mx-auto mt-2 flex w-fit animate-pulse select-none items-center justify-center rounded-full border border-white/5 bg-background text-white transition-all ease-in hover:cursor-pointer" variant="ghost">
    <div class="h-full w-44"></div>
  </Button>
{:then pillData}
  {#if !pillData.hidden}
    {#if pillData.type === "normal"}
      <Button href={pillData.url} target="_blank" class="group z-10 mx-auto mt-2 flex w-fit items-center justify-center rounded-full border border-white/5 bg-neutral-900 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-800" variant="ghost">
        <AnimatedShinyText class="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-400 hover:duration-300">
          {pillData.text}
          {#if pillData.icon}
            {@html pillData.icon}
          {/if}
          {#if pillData.external}
            <ExternalLink class="ml-2 size-4" />
          {/if}
        </AnimatedShinyText>
      </Button>
    {:else if pillData.type === "gradient"}
      <Button href={pillData.url} target="_blank" class="group relative z-10 mx-auto mt-2 flex w-fit items-center justify-center rounded-full border border-white/5 bg-neutral-900 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-800" variant="ghost">
        <AnimatedGradientText>
          {pillData.text}
          {#if pillData.icon}
            {@html pillData.icon}
          {/if}
          {#if pillData.external}
            <ExternalLink class="ml-2 size-4" />
          {/if}
        </AnimatedGradientText>
      </Button>
    {/if}
  {/if}
{/await}

<div class="mx-auto mt-[1.375rem] flex gap-1 px-1 md:max-w-2xl md:gap-2 md:px-2">
  <Card.Root class="w-full border-border bg-transparent">
    <Card.Header class="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
      <Users class="h-4 w-4 text-muted-foreground" />
      <Card.Title class="text-sm font-medium">Users</Card.Title>
    </Card.Header>
    <Card.Content class="py-3">
      {#await data.stats.users}
        <div class="mx-auto h-12 w-20 animate-pulse rounded-lg bg-background"></div>
      {:then users}
        <NumberFlowTicker class="w-full text-center text-3xl font-bold md:text-5xl" value={users} duration={3500} />
      {/await}
    </Card.Content>
  </Card.Root>
  <Card.Root class="w-full border-border bg-transparent">
    <Card.Header class="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
      <LayoutGrid class="h-4 w-4 text-muted-foreground" />
      <Card.Title class="text-sm font-medium">Auctions</Card.Title>
    </Card.Header>
    <Card.Content class="py-3">
      {#await data.stats.auctions}
        <div class="mx-auto h-12 w-20 animate-pulse rounded-lg bg-background"></div>
      {:then auctions}
        <NumberFlowTicker class="w-full text-center text-3xl font-bold md:text-5xl" value={auctions} duration={3500} />
      {/await}
    </Card.Content>
  </Card.Root>
  <Card.Root class="w-full border-border bg-transparent">
    <Card.Header class="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
      <MessagesSquare class="h-4 w-4 text-muted-foreground" />
      <Card.Title class="text-sm font-medium">Chats</Card.Title>
    </Card.Header>
    <Card.Content class="py-3">
      {#await data.stats.chats}
        <div class="mx-auto h-12 w-20 animate-pulse rounded-lg bg-background"></div>
      {:then chats}
        <NumberFlowTicker class="w-full text-center text-3xl font-bold md:text-5xl" value={chats} duration={3500} />
      {/await}
    </Card.Content>
  </Card.Root>
</div>

<div class="mx-auto my-4 max-w-sm">
  <Collapsible.Root open={true} class="group/root mt-6 flex w-full flex-col gap-y-2">
    <Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border border-border px-6 py-2 transition-colors duration-300 hover:bg-background">
      Handy Links
      <ChevronUp class="size-5 group-data-[state=closed]/root:hidden" />
      <ChevronDown class="size-5 group-data-[state=open]/root:hidden" />
    </Collapsible.Trigger>
    <Collapsible.Content class="rounded-lg border border-border p-0">
      <Button href="/pricecheck" variant="link" class="group h-full w-full flex-col items-start justify-start px-6 py-3 text-start hover:no-underline">
        <span class="group-hover:underline">Price Checker</span>
        <span class="text-muted-foreground">Check the price of any minion</span>
      </Button>
    </Collapsible.Content>
  </Collapsible.Root>
</div>

<div class="mx-auto w-fit">
  <div class="flex flex-col items-start justify-center gap-4 px-4 pt-8 sm:flex-row sm:items-end sm:px-6 sm:pt-12 lg:px-8">
    <div class="flex flex-col justify-center space-y-2">
      <Label>Search</Label>
      <div class="flex items-center">
        {#if $searchType === SearchType.Minion}
          {#await data.minionTypes}
            <div class="flex items-center">
              <Button variant="outline" type="button" class={cn("relative w-40 cursor-default justify-between rounded-md rounded-r-none border border-r-0 border-input bg-background py-1.5 pl-3 text-left text-muted-foreground shadow-sm focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm sm:leading-6 md:w-44")}>
                <div class="flex">
                  <span>Select a minion</span>
                </div>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </div>
          {:then minionTypes}
            {#key $searchValue}
              <MinionsListBox
                showReset={true}
                bind:search={$searchValue}
                variant="half-rounded"
                {minionTypes}
                on:onSelect={({ detail }) => {
                  maxTier.set(detail.maxTier);
                  searchValue.set(detail.generator);
                  search($currentTier);
                }}
                on:onReset={() => {
                  searchValue.set("");
                  maxTier.set(12);
                  search($currentTier);
                }} />
            {/key}
          {/await}
        {:else if $searchType === SearchType.User}
          {#await data.users}
            <div class="flex items-center">
              <Button variant="outline" type="button" class={cn("relative w-40 cursor-default justify-between rounded-md rounded-r-none border border-r-0 border-input bg-background py-1.5 pl-3 text-left text-muted-foreground shadow-sm focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm sm:leading-6 md:w-44")}>
                <div class="flex">
                  <span>Select a user</span>
                </div>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </div>
          {:then users}
            {#key $searchValue}
              <UsersListBox
                variant="half-rounded"
                showReset={true}
                bind:search={$searchValue}
                {users}
                on:onSelect={({ detail }) => {
                  searchValue.set(detail.id);
                  search($currentTier);
                }} />
            {/key}
          {/await}
        {/if}

        {#if $searchValue === ""}
          <SearchSelect
            bind:searchType={$searchType}
            on:onSelect={({ detail }) => {
              searchValue.set("");
              searchType.set(detail);
              if (detail === SearchType.User) {
                maxTier.set(12);
              }
            }} />
        {/if}
      </div>
    </div>

    <div class="flex flex-col justify-center space-y-2">
      <Label class="sr-only">Tier</Label>
      <TierListbox
        tiggerClasses="w-52"
        maxtier={$maxTier}
        disabled={false}
        on:onSelectedTierChange={({ detail }) => {
          if (detail.tier === null) {
            currentTier.set(undefined);
            search($currentTier);
            return;
          }
          currentTier.set(Number(detail.tier));
          search($currentTier);
        }} />
    </div>
  </div>
</div>

<div class="py-8 max-md:pb-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <ul role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#await $minions}
        {#each Array(18) as _}
          <CardLoading />
        {/each}
      {:then minions}
        {#each minions as seller}
          <MinionCard minion={seller} />
        {/each}
        {#if $loadingMore}
          {#each Array(18) as _}
            <CardLoading />
          {/each}
        {/if}
      {/await}
    </ul>
    <div class="flex w-full justify-center py-4 [&>.infinite-loader-wrapper>.infinite-intersection-target]:!p-0 [&>.infinite-loader-wrapper]:flex [&>.infinite-loader-wrapper]:w-full [&>.infinite-loader-wrapper]:flex-col [&>.infinite-loader-wrapper]:justify-center">
      <InfiniteLoader {loaderState} triggerLoad={loadMore} intersectionOptions={{ rootMargin: "0px 0px 500px 0px" }}>
        <Button type="button" variant="ghost" on:click={loadMore} class="mx-auto text-sm text-accent transition-all duration-300 hover:text-white focus-visible:border-0 focus-visible:outline-none focus-visible:outline-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Load more minions">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down h-6 w-6" class:animate-spin={$loadingMore}>
            {#if $loadingMore}
              <path in:draw={{ duration: 500, delay: 500 }} out:draw={{ duration: 500 }} d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path in:draw={{ duration: 500, delay: 500 }} out:draw={{ duration: 500 }} d="M21 3v5h-5" />
              <path in:draw={{ duration: 500, delay: 500 }} out:draw={{ duration: 500 }} d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path in:draw={{ duration: 500, delay: 500 }} out:draw={{ duration: 500 }} d="M8 16H3v5" />
            {:else}
              <path in:draw={{ duration: 500, delay: 500 }} out:draw={{ duration: 500 }} d="m6 9 6 6 6-6" />
            {/if}
          </svg>
        </Button>
        {#snippet loading()}{/snippet}
        {#snippet noResults()}
          <p class="px-4 py-1 text-center text-sm text-primary text-opacity-40">No more minions to load.</p>
        {/snippet}
        {#snippet noData()}
          <p class="px-4 py-1 text-center text-sm text-primary text-opacity-40">No more minions to load.</p>
        {/snippet}
        {#snippet coolingOff()}
          <p class="px-4 py-1 text-center text-sm text-primary text-opacity-40">You're too fast, please wait a few seconds and try again</p>
        {/snippet}
        {#snippet error()}
          <p class="px-4 py-1 text-center text-sm text-primary text-opacity-40">Something went wrong, please try again or contact us</p>
        {/snippet}
      </InfiniteLoader>
    </div>
  </div>
</div>
