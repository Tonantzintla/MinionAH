<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import { codeToHtml } from "shiki/bundle/web";
  import { onMount } from "svelte";
  import SvelteSeo from "svelte-seo";

  let [allItems, minions, error] = Array(3).fill('{\n  "LOADING"\n}');
  let demoCode = "";
  let item: string;
  let loading = false;

  const fetchCode = async (item: string | undefined = undefined) => {
    loading = true;

    let url = "/api/craftcost";

    if (item) {
      url += `/${item}`;
    }

    let json = await fetch("https://minionah.com" + url).then((res) => res.json());

    // truncate the json if it's too long
    const truncatedJson: Record<string, unknown> = {};
    let count = 0;
    for (const key in json) {
      if (count >= 50) break;
      truncatedJson[key] = json[key];
      count++;
    }
    if (!truncatedJson["error"] && count >= 50) {
      truncatedJson["NOTE"] = "The JSON was truncated for performance improvements. You will get the full data if you send a request to the API. This NOTE will not be included in the response from the API.";
    }
    json = truncatedJson;
    loading = false;
    return JSON.stringify(json, null, 2);
  };

  onMount(() => {
    const fetchData = async () => {
      [allItems, minions, error] = await Promise.all([fetchCode(), fetchCode("minions"), fetchCode("anInvalidItemName")]);
    };

    fetchData();
  });
</script>

<SvelteSeo
  title="RCC API Documentation — MinionAH"
  description="Since NEU does not provide a public API for their (raw) craft cost feature, we decided to create our own. We have created a public API that will calculate the (raw) craft cost of any Hypixel SkyBlock item. This API is available for everyone to use in their own projects."
  themeColor="#171717"
  canonical="https://minionah.com/api/craftcost/docs"
  openGraph={{
    type: "website",
    url: "https://minionah.com/api/craftcost/docs",
    title: "RCC API Documentation — MinionAH",
    description: "Since NEU does not provide a public API for their (raw) craft cost feature, we decided to create our own. We have created a public API that will calculate the (raw) craft cost of any Hypixel SkyBlock item. This API is available for everyone to use in their own projects.",
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
    title: "RCC API Documentation — MinionAH",
    description: "Since NEU does not provide a public API for their (raw) craft cost feature, we decided to create our own. We have created a public API that will calculate the (raw) craft cost of any Hypixel SkyBlock item. This API is available for everyone to use in their own projects.",
    image: "https://minionah.com/assets/images/ogBanner.png?v=2",
    imageAlt: "MinionAH"
  }} />

<main class="relative overflow-hidden py-8">
  <article class="relative mx-auto mt-6 max-w-2xl px-4 py-4 text-lg text-foreground sm:px-4 lg:px-6">
    <div class="mx-auto mb-5 mt-0">
      <div class="mx-auto">
        <div class="relative z-50 text-xs font-bold text-foreground">
          <span class="relative z-50 block uppercase">Documentation</span>
          <span class="relative z-50 mt-1 block text-sm font-semibold">
            <time datetime="2023-12-28T00:00:00.000Z" class="text-xs md:text-sm"> December 28, 2023 </time>
          </span>
        </div>
      </div>
    </div>
    <div class="mx-auto mb-0 mt-0">
      <div class="mx-auto">
        <h2 class="relative z-50 text-5xl font-bold text-white">RAW Craft Cost (RCC) API</h2>
      </div>
    </div>
    <div class="mx-auto mb-0 mt-5">
      <div class="mx-auto">
        <p class="relative z-50 text-2xl font-medium leading-7 text-white">Since NEU does not provide a public API for their (raw) craft cost feature, we decided to create our own. We have created a public API that will calculate the (raw) craft cost of any Hypixel SkyBlock item. <br /> This API is available for everyone to use in their own projects.</p>
      </div>
    </div>
    <div class="mx-auto my-5 leading-[1.688rem]">
      <h3 id="toc">Table of contents</h3>
      <ul class="list-inside list-disc pl-7 marker:[color:#525252]">
        <li><a href="#usage" class="text-white">Usage</a></li>
        <li><a href="#specific-item" class="text-white">Specific item</a></li>
        <li><a href="#invalid-item" class="text-white">Invalid item</a></li>
        <li><a href="#minions" class="text-white">Minions</a></li>
        <li><a href="#internal-error" class="text-white">Internal error</a></li>
        <li>
          <a href="#additional-info" class="text-white">Additional information</a>
          <ul class="list-inside list-disc pl-7 marker:[color:#525252]">
            <li><a href="#credits" class="text-white">Credits</a></li>
          </ul>
        </li>
        <li><a href="#demo" class="text-white">Demo</a></li>
      </ul>
      <h3 id="usage">Usage</h3>
      <p>To use the <code>API</code> you need to send a <code>GET</code> request to <code>https://minionah.com/api/craftcost</code> The API will return a JSON object with the raw craft cost of every item in the game:</p>
      {#await codeToHtml(allItems, { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
              this.addClassToHast(node, "max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
            } }] })}
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
      {:then code}
        {@html code}
      {/await}

      <h3 id="specific-item">Specific item</h3>
      <p>
        If you need a specific item, you can send a <code>GET</code> request to <code>https://minionah.com/api/craftcost/{"{item}"}</code>
      </p>
      <p>
        Replace <code>{"{item}"}</code> with the internal item name, you can find a list of all the internal item names at <a href="https://github.com/DarthGigi/MinionAH-NotEnoughUpdates-REPO/blob/master/recipes/recipes.json" target="_blank">DarthGigi/MinionAH-NotEnoughUpdates-REPO/recipes/recipes.json</a>.
      </p>
      <p>The API will return a JSON object with the raw craft cost of the specified item:</p>
      {#await codeToHtml(JSON.stringify(JSON.parse('{"WOOD_AXE": 126.02217354265548}'), null, 2), { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
              this.addClassToHast(node, "max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
            } }] })}
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
      {:then code}
        {@html code}
      {/await}
      <p>With a status code of <code class="!bg-green-950 text-green-300">200</code>, and a status message of <code class="!bg-green-950 text-green-300">OK</code>.</p>
      <h3 id="invalid-item">Invalid item</h3>
      <p>If you provide an invalid item name, the API will return the following JSON object:</p>
      {#await codeToHtml(error, { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
              this.addClassToHast(node, "max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
            } }] })}
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
      {:then code}
        {@html code}
      {/await}
      <p>With a status code of <code class="!bg-yellow-950 text-yellow-300">404</code>, and a status message of <code class="!bg-yellow-950 text-yellow-300">Item not found</code>.</p>
      <h3 id="minions">Minions</h3>
      <p>If you want to get a list of the raw craft cost of every minion, you can provide <code>minions</code> as the <code>{`{item}`}</code> value.</p>
      <p>The API will return the following JSON object:</p>
      {#await codeToHtml(minions, { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
              this.addClassToHast(node, "max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
            } }] })}
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
      {:then code}
        {@html code}
      {/await}
      <h3 id="internal-error">Internal error</h3>
      <p>If an internal error occurs, the API will return the following JSON object:</p>
      {#await codeToHtml(JSON.stringify(JSON.parse(`{"error": "Something went wrong"}`), null, 2), { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
              this.addClassToHast(node, "max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
            } }] })}
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
      {:then code}
        {@html code}
      {/await}
      <p>With a status code of <code class="!bg-red-950 text-red-300">500</code>, and a status message of <code class="!bg-red-950 text-red-300">Internal Server Error</code>.</p>
      <h3 id="additional-info">Additional information</h3>
      <p>Additional information about the responses:</p>
      <ul class="list-inside list-disc pl-7 marker:[color:#525252]">
        <li>All responses have the <code>Content-Type</code> header set to <code>application/json</code>.</li>
        <li>The API is rate-limited to 60 requests per minute.</li>
      </ul>
      <p>Additional information about the API:</p>
      <ul class="list-inside list-disc pl-7 marker:[color:#525252]">
        <li>
          The API tries to take as many items into calculation as possible, the prices are retrieved from either the bazaar or the NPC sell price if it is not available on the bazaar. If the item is not available on the bazaar or the NPC sell price, the API will return <code>0</code> as the price.
          <ul class="list-inside list-disc pl-7 marker:[color:#525252]">
            <li>Even though the API tries to take as many items into calculation as possible, it is not possible to take every item into calculation due to different factors (like some not having a price, not obtainable, etc). So the prices might not be 100% accurate.</li>
          </ul>
        </li>
        <li>The API used for the Bazaar prices is <a href="https://api.hypixel.net/v2/skyblock/bazaar" target="_blank">Hypixel</a>. Every time a request is made to the API, the API will request Hypixel to get the latest Bazaar prices. This means that the API will always have the latest Bazaar prices.</li>
        <li>Not all items have a recipe to craft or are sold by an NPC. For example, the Snow and Flower Minions can't be obtained by crafting or purchasing via an NPC, some items are only purchasable with Bits. In cases like these where calculating the price is not possible, the API will return <code>0</code> as the price.</li>
        <li>As always, the code is open-source and available at <a href="https://github.com/DarthGigi/MinionAH/tree/main/src/routes/api/craftcost/%5B%5BinternalName%5D%5D" target="_blank">github.com/DarthGigi/MinionAH</a>.</li>
      </ul>
      <h4 id="credits">Credits</h4>
      <p>We'd like to massively thank <a href="https://hypixel.net/members/bigoofinator.5321577/" target="_blank">BigOofinator</a> for <a href="https://hypixel.net/threads/making-neus-raw-craft-cost-calculator-in-js-ts.5557073/post-39159669" target="_blank">helping us with the calculation code</a></p>
      <h3 id="demo">Demo</h3>
      <p>You can try out the API here:</p>
      <div class="flex gap-2">
        <Input
          disabled={loading}
          class="focus:border-white focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
          placeholder="Item"
          bind:value={item}
          on:keydown={async (e) => {
            if (e.key === "Enter") {
              demoCode = await fetchCode(item);
            }
          }} />
        <Button
          class="flex basis-20 items-center justify-center"
          disabled={loading}
          on:click={async () => {
            demoCode = await fetchCode(item);
          }}>
          {#if loading}
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            Send
          {/if}
        </Button>
      </div>
      {#if demoCode}
        {#await codeToHtml(demoCode, { lang: "json", theme: "github-dark-dimmed", transformers: [{ pre(node) {
                this.addClassToHast(node, "mt-2 max-h-64 p-4 overflow-y-auto overflow-x-scroll rounded-md");
              } }] })}
          <LoaderCircle class="mx-auto h-8 w-8 animate-spin" />
        {:then code}
          {@html code}
        {/await}
      {/if}
    </div>
  </article>
</main>

<style>
  a {
    text-decoration: underline;
    font-weight: 500;
  }
  code {
    background-color: #1f2937;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
  }
  p {
    margin-top: 1.3333333em;
    margin-bottom: 1.3333333em;
  }
  h3 {
    font-size: 1.6666667em;
    margin-top: 1.8666667em;
    margin-bottom: 1.0666667em;
    scroll-margin: 5rem;
    color: #fff;
    font-weight: 700;
  }
  h4 {
    font-size: 1.3333333em;
    margin-top: 1.3333333em;
    margin-bottom: 1.3333333em;
    scroll-margin: 5rem;
    color: #fff;
    font-weight: 700;
  }
  li {
    padding-left: 0.4444444em;
    margin-top: 0.6666667em;
    margin-bottom: 0.6666667em;
  }
</style>
