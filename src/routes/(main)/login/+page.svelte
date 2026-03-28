<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs";
  import SvelteSeo from "svelte-seo";
  import { cubicInOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import type { PageData } from "./$types";
  import LoginForm from "./login-form.svelte";
  import McLoginForm from "./mc-login-form.svelte";
  import SignupForm from "./signup-form.svelte";

  let { data }: { data: PageData } = $props();

  let value = $state<"login" | "sign-up" | "mclogin">("login");

  const tabs = [
    { title: "Login", value: "login" },
    { title: "Sign Up", value: "sign-up" }
  ];

  const handleSignUpButtonClick = () => {
    value = "sign-up";
  };

  const handleSignInButtonClick = () => {
    value = "login";
  };

  const handleMcSignInButtonClick = () => {
    value = "mclogin";
  };

  const [send, receive] = crossfade({
    duration: 300,
    easing: cubicInOut
  });
</script>

<SvelteSeo
  jsonLd={{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does it work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We use MC-ID to authenticate your Minecraft account, which is the most secure way to do so.<br /><br />No sensitive information like your password, tokens, or any other personal information is being used or stored during this process.<br /><br />For more information, check out <a href='https://mc-id.com'>MC-ID</a>."
        }
      },
      {
        "@type": "Question",
        name: "Can I trust you with my account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We will never try to steal, sell, or otherwise misuse your Minecraft account information. We use the information provided by MC-ID to verify your Minecraft identity.<br /><br />We will also never ask for your Minecraft password or any other sensitive information."
        }
      },
      {
        "@type": "Question",
        name: "What information do you store?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We store the following information:<ul><li>Your Minecraft UUID</li><li>Your Minecraft username</li><li>Your Minecraft skin</li><li>Your Minecraft cape (if any)</li></ul>"
        }
      },
      {
        "@type": "Question",
        name: "What if your database is compromised?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "In the extremely unlikely event that our database is compromised, your Minecraft account will not be at risk at all and you will not have to change your Minecraft password."
        }
      }
    ]
  }} />

<Tabs.Root bind:value class="mx-auto w-full max-w-md px-4">
  <Tabs.List class="grid w-full grid-cols-2 gap-4">
    {#each tabs as tab (tab.value)}
      {@const isActive = value === tab.value || (value === "mclogin" && tab.value === "login")}
      <Tabs.Trigger value={tab.value} class="relative data-[state=active]:bg-transparent" data-sveltekit-noscroll data-state={isActive ? "active" : "inactive"}>
        {#if isActive}
          <div class="absolute inset-0 rounded-md bg-accent" in:send={{ key: "active-tab" }} out:receive={{ key: "active-tab" }}></div>
        {/if}
        <div class="relative">
          {tab.title}
        </div>
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
  <Tabs.Content value="login">
    <LoginForm data={data.loginForm} on:signup={handleSignUpButtonClick} on:mclogin={handleMcSignInButtonClick} />
  </Tabs.Content>
  <Tabs.Content value="mclogin">
    <McLoginForm data={data.mcLoginForm} on:signup={handleSignUpButtonClick} on:login={handleSignInButtonClick} />
  </Tabs.Content>
  <Tabs.Content value="sign-up">
    <SignupForm data={data.signupForm} on:signin={handleSignInButtonClick} />
  </Tabs.Content>
</Tabs.Root>
