<script lang="ts">
  import { page } from "$app/stores";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Label } from "$lib/components/ui/label";
  import * as Popover from "$lib/components/ui/popover";
  import { Switch } from "$lib/components/ui/switch";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { preferences } from "$lib/stores/preferences";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import CircleHelp from "lucide-svelte/icons/circle-help";
  import Code from "lucide-svelte/icons/code";
  import Cog from "lucide-svelte/icons/cog";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import HandCoins from "lucide-svelte/icons/hand-coins";
  import Handshake from "lucide-svelte/icons/handshake";
  import House from "lucide-svelte/icons/house";
  import Info from "lucide-svelte/icons/info";
  import LayoutDashboard from "lucide-svelte/icons/layout-dashboard";
  import LogOut from "lucide-svelte/icons/log-out";
  import MessagesSquare from "lucide-svelte/icons/messages-square";
  import Newspaper from "lucide-svelte/icons/newspaper";
  import Plus from "lucide-svelte/icons/plus";
  import Scale from "lucide-svelte/icons/scale";
  import Settings from "lucide-svelte/icons/settings";
  import UserRound from "lucide-svelte/icons/user-round";
  import Users from "lucide-svelte/icons/users";
  import posthog from "posthog-js";

  let profileDropdownOpen = false;
  let menuDropdownOpen = false;
  let settingsOpen = false;
</script>

<nav class="select-none bg-secondary max-md:fixed max-md:bottom-0 max-md:z-50 max-md:w-full">
  <div class="mx-auto max-w-7xl px-4 pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(2rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
    <div class="flex h-16 flex-row justify-between">
      <div class="flex flex-shrink-0 items-center">
        <DropdownMenu.Root bind:open={menuDropdownOpen}>
          <DropdownMenu.Trigger class="flex items-center gap-2 rounded-md px-4 py-2 transition-colors duration-300 hover:bg-popover">
            <img class="pointer-events-none block h-8 w-auto transition-transform duration-300 ease-in-out" src="/favicon.png" alt="Minion AH" class:rotate-45={menuDropdownOpen} class:max-md:-rotate-45={menuDropdownOpen} />
            <h1>MinionAH<span class="sr-only">: The Auction House for SkyBlock Minions</span></h1>
            <ChevronDown class="h-4 w-4" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-44 border-border bg-popover" transitionConfig={{ duration: 300 }}>
            <DropdownMenu.Group>
              <DropdownMenu.Item class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="/">
                <House class="size-4" />Home
              </DropdownMenu.Item>
              <DropdownMenu.Separator class="bg-border" />
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://newsroom.minionah.com">
                <Newspaper class="size-4" />Newsroom
              </DropdownMenu.Item>
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://discord.tonantzintla.org">
                <Users class="size-4" />Community
              </DropdownMenu.Item>
              <DropdownMenu.Separator class="bg-border" />
              <DropdownMenu.Item class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://ko-fi.com/F1F04KOJQ" target="_blank">
                <HandCoins class="size-4" />Support Us
              </DropdownMenu.Item>
              <DropdownMenu.Item class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="/partners">
                <Handshake class="size-4" />Partners
              </DropdownMenu.Item>
              <DropdownMenu.Separator class="bg-border" />
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://newsroom.minionah.com/minionah/">
                <CircleHelp class="size-4" />About
              </DropdownMenu.Item>
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://github.com/DarthGigi/MinionAH">
                <Code class="size-4" /> GitHub
              </DropdownMenu.Item>
              <DropdownMenu.Separator class="bg-border" />
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://newsroom.minionah.com/privacy-policy">
                <Scale class="size-4" />Privacy Policy
              </DropdownMenu.Item>
              <DropdownMenu.Item target="_blank" class="gap-1.5 transition-colors duration-300 hover:cursor-pointer data-[highlighted]:bg-background" href="https://newsroom.minionah.com/terms-of-service">
                <Scale class="size-4" />Terms of Service
              </DropdownMenu.Item>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <div class="flex flex-shrink-0 flex-row-reverse items-center justify-between gap-2 md:flex-row md:gap-4">
        {#await $page.data.user then user}
          {#if user}
            {#if $page.url.pathname !== "/profile"}
              <div class="flex-shrink-0 max-md:hidden">
                <a href="/profile" class="relative inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors duration-300 hover:bg-primary/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary">
                  <Plus class="-ml-1 mr-2 h-5 w-5" />
                  <span>New Auction</span>
                </a>
              </div>
            {/if}
            <div class="flex flex-shrink-0 items-center">
              <DropdownMenu.Root bind:open={profileDropdownOpen}>
                <DropdownMenu.Trigger class="relative">
                  <Avatar.Root class="items-center justify-center bg-accent">
                    <Avatar.Image class="pointer-events-none h-full w-full p-1" src={`https://res.cloudinary.com/minionah/image/upload/v1/users/avatars/${user.id}`} alt={user.username} />
                    <Avatar.Fallback class="border-2 border-border bg-accent">{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
                  </Avatar.Root>
                  {#if !$page.url.pathname.includes("chat")}
                    {#if $page.data.unreadChats}
                      {#if !profileDropdownOpen}
                        <span class="absolute -right-0.5 top-0.5 flex h-3 w-3 transition-all duration-300" class:opacity-0={profileDropdownOpen} class:scale-0={profileDropdownOpen}>
                          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground opacity-75"></span>
                          <span class="relative inline-flex h-3 w-3 rounded-full bg-ring"></span>
                        </span>
                      {/if}
                    {/if}
                  {/if}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content class="border-border bg-popover">
                  <DropdownMenu.Group>
                    <DropdownMenu.Item href="/profile" class="cursor-pointer gap-1.5 data-[highlighted]:bg-background">
                      <UserRound class="size-4" /> Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item href="/profile/settings" class="cursor-pointer gap-1.5 data-[highlighted]:bg-background">
                      <Cog class="size-4" /> Settings
                    </DropdownMenu.Item>
                  </DropdownMenu.Group>
                  <DropdownMenu.Separator class="bg-border" />
                  <DropdownMenu.Group>
                    {#if $page.data.isAdmin}
                      <DropdownMenu.Item href="/dashboard" class="cursor-pointer gap-1.5 data-[highlighted]:bg-background">
                        <LayoutDashboard class="size-4" />Dashboard
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Item href="/profile/chats" class="relative cursor-pointer gap-1.5 data-[highlighted]:bg-background">
                      <MessagesSquare class="size-4" /> Chats
                      {#if !$page.url.pathname.includes("chat")}
                        {#if $page.data.unreadChats}
                          {#if profileDropdownOpen}
                            <span class="absolute right-2 top-1/2 flex h-3 w-3 -translate-y-1/2 transition-all delay-1000 duration-300">
                              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground opacity-75"></span>
                              <span class="relative inline-flex h-3 w-3 rounded-full bg-ring"></span>
                            </span>
                          {/if}
                        {/if}
                      {/if}
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator class="bg-border" />
                    <DropdownMenu.Item href="/logout" class="cursor-pointer gap-1.5 data-[highlighted]:bg-background" data-sveltekit-preload-data="off" on:click={() => posthog.reset()}>
                      <LogOut class="size-4" /> Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Group>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          {:else if $page.url.pathname !== "/login"}
            <div class="flex flex-shrink-0 items-center justify-center">
              <div class="relative">
                <div>
                  <a href="/login" class="relative inline-flex items-center rounded-md border border-transparent bg-ring px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-300 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"> Login </a>
                </div>
              </div>
            </div>
          {/if}
        {/await}

        <Popover.Root bind:open={settingsOpen}>
          <Popover.Trigger aria-label="Settings">
            <Settings class={`text-accent transition-all duration-300 hover:text-accent-foreground/50 ${settingsOpen ? "rotate-45 !text-white" : ""}`} />
          </Popover.Trigger>
          <Popover.Content sideOffset={8} class="border-border bg-popover" data-preferences-tooltip-portal>
            <div class="flex flex-col gap-4">
              <div class="space-y-2">
                <h4 class="font-medium leading-none">Preferences</h4>
                <p class="text-xs text-muted-foreground">Set your preferences for MinionAH.</p>
              </div>
              <div class="grid gap-2">
                <div class="grid w-full grid-cols-2 items-center justify-between gap-4">
                  <Label>Roman Numerals</Label>
                  <Switch
                    checked={$preferences.romanNumerals}
                    onCheckedChange={(checked) => {
                      preferences.update((state) => ({ ...state, romanNumerals: checked }));
                    }} />
                </div>
                <div class="grid w-full grid-cols-2 items-center justify-between gap-4">
                  <Label>Minecraft Font</Label>
                  <Switch
                    checked={$preferences.minecraftFont}
                    onCheckedChange={(checked) => {
                      preferences.update((state) => ({ ...state, minecraftFont: checked }));
                    }} />
                </div>
                <div class="grid w-full grid-cols-2 items-center justify-between gap-4">
                  <Label>Infinite Scroll</Label>
                  <Switch
                    checked={$preferences.infiniteScroll}
                    onCheckedChange={(checked) => {
                      preferences.update((state) => ({ ...state, infiniteScroll: checked }));
                    }} />
                </div>
              </div>
            </div>
            <Tooltip.Root openDelay={100} closeDelay={0} portal="body">
              <Tooltip.Trigger class="absolute right-1 top-2 text-accent hover:text-accent-foreground">
                <Info class="h-4" />
              </Tooltip.Trigger>
              <Tooltip.Content class="border-border bg-popover" side="top" sideOffset={4} align="center">
                <p>These preferences are saved in your browser</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </Popover.Content>
        </Popover.Root>
        <div class="flex flex-shrink-0 items-center">
          <Tooltip.Root openDelay={0} closeDelay={0}>
            <Tooltip.Trigger asChild let:builder>
              <a use:builder.action {...builder} href="https://ko-fi.com/F1F04KOJQ" class="text-accent transition-all duration-300 hover:text-accent-foreground/50" target="_blank">
                <HandCoins />
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content class="border-border bg-popover" side="top" sideOffset={4} align="center">
              <p class="pr-2.5">Support us on <a href="https://ko-fi.com/F1F04KOJQ" target="_blank" class="relative"><span class="underline">Ko-fi</span><ExternalLink class="absolute -right-2.5 top-0 size-2" /></a></p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
    </div>
  </div>
</nav>
