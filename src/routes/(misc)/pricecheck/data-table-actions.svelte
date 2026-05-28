<script lang="ts">
  import type { Minion } from "$generated/prisma";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import Ellipsis from "lucide-svelte/icons/ellipsis";

  export let minion: Minion | undefined;
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button variant="ghost" builders={[builder]} size="icon" class="relative h-8 w-8 p-0">
      <span class="sr-only">Open menu</span>
      <Ellipsis class="h-4 w-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="border-border bg-popover">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    {#if minion}
      <DropdownMenu.Item href={`https://hypixelskyblock.minecraft.wiki/w/${minion.name.replace(/ [IVX]+$/, "").replace(/ /g, "_")}`} target="_blank">View it on the community wiki</DropdownMenu.Item>
      <DropdownMenu.Item href={`https://wiki.hypixel.net/${minion.name.replace(/ [IVX]+$/, "").replace(/ /g, "_")}`} target="_blank">View it on the official wiki</DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
