<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { searchSignal } from "$lib/stores/signals";
  import type { Seller } from "$lib/types";
  import NumberFlow from "@number-flow/svelte";
  import { formatDistanceToNow } from "date-fns";
  import { toZonedTime } from "date-fns-tz";
  import * as headview3d from "headview3d";
  import Info from "lucide-svelte/icons/info";
  import Search from "lucide-svelte/icons/search";
  import { getContext } from "svelte";
  import { createPress } from "svelte-interactions";
  import { derived, writable } from "svelte/store";

  const minion = getContext<Seller>("minion");
  const isHome = getContext<boolean>("isHome");
  const { pressAction } = createPress();

  let minionCanvas: HTMLCanvasElement;

  let minionViewer: headview3d.SkinViewer;

  const handleSearchSignal = (search: string) => {
    searchSignal.update(() => search);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  $: minionCanvas, createMinionViewer();
  const createMinionViewer = () => {
    if (minionCanvas) {
      if (!minion.minion.id) return;
      const skinUrl = `https://res.cloudinary.com/minionah/image/upload/v1/minions/skin/${minion.minion.id}`;
      const minionCanvasContainerDimensions = (document.getElementById(`minionCanvasContainer_${minion.id}`) as HTMLDivElement).getBoundingClientRect();
      minionViewer = new headview3d.SkinViewer({
        canvas: minionCanvas,
        width: minionCanvasContainerDimensions.width,
        height: minionCanvasContainerDimensions.height,
        skin: skinUrl,
        enableControls: true,
        zoom: 2.5
      });
      minionViewer.resetSkin();
      minionViewer.autoRotate = true;
      minionViewer.autoRotateSpeed = 0.5;
      minionViewer.controls.enableRotate = true;
      minionViewer.controls.enableZoom = false;
      minionViewer.controls.enablePan = false;
    } else {
      return;
    }
  };

  const destroyViewer = (viewer: headview3d.SkinViewer) => {
    if (!viewer) return;
    setTimeout(() => {
      viewer.dispose();
      viewer.renderer.forceContextLoss();
    }, 300);
  };

  const minionisOpen = writable(false);
  const cost = derived(
    minionisOpen,
    ($minionisOpen, set) => {
      if ($minionisOpen) {
        setTimeout(() => set(minion.minion.craftCost), 0);
      } else {
        set(0);
      }
    },
    0
  );

  $: if (!$minionisOpen && minionViewer) {
    destroyViewer(minionViewer);
  }
</script>

<HoverCard.Root openDelay={150} closeDelay={150} bind:open={$minionisOpen}>
  <HoverCard.Trigger href={`https://hypixelskyblock.minecraft.wiki/w/${minion.minion.name.replace(/ [IVX]+$/, "").replace(/ /g, "_")}`} target="_blank" rel="noopener" class="my-2 flex flex-col items-center truncate rounded p-1 transition-all duration-500">
    <Avatar.Root class="h-12 w-12 flex-shrink-0 rounded-full ">
      <Avatar.Image class="pointer-events-none h-full w-full bg-accent p-1" src={`https://res.cloudinary.com/minionah/image/upload/f_auto,q_auto/v1/minions/head/${minion.minion.id}`} alt={minion.minion.name} />
      <Avatar.Fallback class="border-2 border-accent bg-accent">{minion.user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
    </Avatar.Root>
    <h3 class="truncate text-sm font-medium text-white">{minion.minion.name.replace(/ [IVX]+$/, "")}</h3>
  </HoverCard.Trigger>
  <HoverCard.Content class="mt-0 min-w-80 gap-x-2 border-accent bg-muted" side="top" align="center">
    <div class="flex items-center justify-center gap-x-2">
      <Avatar.Root id={`minionCanvasContainer_${minion.id}`} class="h-12 w-12  rounded-full bg-accent">
        <canvas bind:this={minionCanvas} class="!h-full !w-full cursor-move rounded-full bg-transparent"></canvas>
        <Avatar.Fallback class="border-2 border-accent bg-accent">{minion.user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
      </Avatar.Root>
      <div>
        <h4 class="text-sm font-semibold">
          {minion.minion.name}
        </h4>
        <p class="whitespace-nowrap text-xs text-muted-foreground">
          Created
          {formatDistanceToNow(toZonedTime(minion.timeCreated, Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"), {
            addSuffix: true,
            includeSeconds: true
          })}
          {#if minion.timeBumped && minion.timeBumped !== minion.timeCreated}
            <br />
            Last bumped
            {formatDistanceToNow(toZonedTime(minion.timeBumped, Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"), {
              addSuffix: true,
              includeSeconds: true
            })}
          {/if}
          <br />
          <Tooltip.Root openDelay={100} closeDelay={0}>
            <Tooltip.Trigger class="cursor-help text-[#FEFF55]">
              <p class="text-wrap text-left">Raw Craft Cost: <NumberFlow class="inline text-[#FEAB00]" format={{ notation: "compact", maximumFractionDigits: 2, roundingMode: "halfCeil" }} value={$cost} suffix=" coins" locales={["en"]} /></p>
            </Tooltip.Trigger>
            <Tooltip.Content class="border-accent bg-muted text-primary">
              <p>Raw Craft Cost is <span class="underline">not</span> 100% accurate.</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <a href={`https://hypixelskyblock.minecraft.wiki/w/${minion.minion.name.replace(/ [IVX]+$/, "").replace(/ /g, "_")}`} target="_blank" rel="noopener" class="group rounded bg-accent p-1 text-sm text-muted-foreground focus:outline-none focus:ring-4 focus:ring-transparent">
          <Info class="h-5 w-5 transition-colors duration-300 group-hover:text-white" />
        </a>
        {#if isHome}
          <button
            class="group rounded bg-accent p-1 text-sm text-muted-foreground focus:outline-none focus:ring-4 focus:ring-transparent"
            use:pressAction
            on:press={() => {
              handleSearchSignal(minion.minion.generator);
            }}>
            <Search class="h-5 w-5 transition-colors duration-300 group-hover:text-white" />
          </button>
        {/if}
      </div>
    </div>
  </HoverCard.Content>
</HoverCard.Root>
