<script lang="ts">
  import { browser, dev } from "$app/environment";
  import { afterNavigate, beforeNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { env as envPublic } from "$env/dynamic/public";
  import MessageToast from "$lib/components/MessageToast.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb";
  import { Toaster } from "$lib/components/ui/sonner";
  import { firebaseConfig } from "$lib/firebase";
  import Navbar from "$lib/layouts/Navbar.svelte";
  import { internalStorage, preferences } from "$lib/stores/preferences";
  import { requestNotificationPermission } from "$lib/utilities";
  import type { FirebaseApp } from "firebase/app";
  import { initializeApp } from "firebase/app";
  import { getMessaging, getToken, onMessage } from "firebase/messaging";
  import posthog from "posthog-js";
  import { onMount } from "svelte";
  import SvelteSeo from "svelte-seo";
  import type { ToasterProps } from "svelte-sonner";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import "../app.css";
  import type { LayoutData } from "./$types";
  import BugReport from "./bug-report.svelte";

  const { PUBLIC_POSTHOG_KEY, PUBLIC_VAPID_KEY } = envPublic;

  export let data: LayoutData;

  const paths = writable<string[]>([]);
  const blacklistedPaths = ["/", "api"];

  const position = writable<ToasterProps["position"]>("bottom-right");
  const closeButton = writable<ToasterProps["closeButton"]>(true);

  page.subscribe((value) => {
    const urls = value.url.pathname.split("/").filter((url) => Boolean(url));
    paths.set(urls);
  });

  preferences.subscribe((value) => {
    if (typeof window !== "undefined") {
      if (value.minecraftFont) {
        document.body.dataset.font = "minecraft";
      } else {
        document.body.dataset.font = "default";
      }
    }
  });

  if (browser && !dev) {
    beforeNavigate(() => posthog.capture("$pageleave"));
    afterNavigate(() => posthog.capture("$pageview"));
  }

  onMount(async () => {
    if (!dev) {
      if (browser) {
        posthog.init(PUBLIC_POSTHOG_KEY, {
          api_host: "https://e.minionah.com",
          person_profiles: "always", // or 'always' to create profiles for anonymous users as well,
          ui_host: "https://eu.posthog.com",
          capture_pageview: false,
          capture_pageleave: false
        });
        if ($page.data.user) {
          posthog.identify($page.data.user.id, {
            username: $page.data.user.username
          });
        }
      }
    }
    if (window.innerWidth < 768) {
      position.set("top-center");
      closeButton.set(false);
    }
    const serviceWorker = navigator.serviceWorker.register("/service-worker.js", {
      type: dev ? "module" : "classic"
    });

    // Initialize Firebase
    const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, {
        vapidKey: PUBLIC_VAPID_KEY,
        serviceWorkerRegistration: await serviceWorker
      });
      internalStorage.update((state) => ({
        ...state,
        fcmToken: token
      }));
      onMessage(messaging, (payload) => {
        if ($page.url.pathname.endsWith("/chat")) return;
        toast(payload.notification?.title || "New message", {
          description: MessageToast,
          componentProps: {
            image: payload.notification?.image || "/favicon.png",
            text: payload.notification?.body || "You have a new message",
            username: payload.data?.username || "Unknown"
          },
          action: {
            label: "View",
            onClick: async () => {
              await goto(`/user/${payload.data?.username}/chat`);
            }
          }
        });
      });

      if (navigator && navigator.clearAppBadge) {
        if (data.unreadCount && data.unreadCount > 0) {
          if (!isNaN(Number(data.unreadCount))) await navigator.setAppBadge(Number(data.unreadCount));
        } else {
          await navigator.clearAppBadge();
        }
      }
    }
  });
</script>

<svelte:window
  on:resize={() => {
    if (window.innerWidth < 768) {
      position.set("top-center");
      closeButton.set(false);
    } else {
      position.set("bottom-right");
      closeButton.set(true);
    }
  }} />

<SvelteSeo applicationName="MinionAH" />

<Navbar />

<BugReport {data} />

<Toaster theme="dark" closeButton={$closeButton} position={$position} />

{#if $paths.length > 0 && !blacklistedPaths.some((path) => $paths.includes(path))}
  <Breadcrumb.Root class="py-2">
    <Breadcrumb.List class="justify-center">
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
      </Breadcrumb.Item>
      {#each $paths as path, index}
        {#if path !== "user"}
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            {#if $paths[index - 1] === "user"}
              <Breadcrumb.Link href={`/user/${path}`} class="capitalize">{path}</Breadcrumb.Link>
            {:else if $paths[index - 2] === "user"}
              <Breadcrumb.Link href={`/user/${$paths[index - 1]}/${path}`} class="capitalize">{path}</Breadcrumb.Link>
            {:else}
              <Breadcrumb.Link href={`/${$paths.slice(0, index + 1).join("/")}`} class="capitalize">{path}</Breadcrumb.Link>
            {/if}
          </Breadcrumb.Item>
        {/if}
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
{/if}

<slot />
