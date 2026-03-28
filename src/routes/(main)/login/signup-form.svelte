<script lang="ts">
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import { createEventDispatcher } from "svelte";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { signupFormSchema, type SignupFormSchema } from "./schema";

  const dispatch = createEventDispatcher();

  export let data: SuperValidated<Infer<SignupFormSchema>>;

  const form = superForm(data, {
    validators: zodClient(signupFormSchema),
    dataType: "json",
    timeoutMs: 2000,
    validationMethod: "oninput"
  });

  const { form: formData, enhance, tainted, isTainted, submitting, timeout, errors } = form;

  const toastLoading = writable<number | string>();
  const step = writable<"1" | "2">("1");
  const requestingCode = writable(false);

  const handleSignInButtonClick = () => {
    dispatch("signin");
  };

  async function requestCode() {
    requestingCode.set(true);
    try {
      const response = await fetch("/login/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: $formData.mcusername
        })
      });

      if (!response.ok) {
        throw new Error("Failed to request code");
      }

      toast.success("Code requested successfully! Check your Minecraft chat for the code.");
      step.set("2");
    } catch (error) {
      console.error("Error requesting code:", error);
      toast.error("Failed to request code. Please try again.");
    } finally {
      requestingCode.set(false);
    }
  }

  timeout.subscribe((value) => {
    if (value) {
      toast.loading("It's taking longer than expected to log you in...", {
        id: $toastLoading
      });
    }
  });
</script>

<Card.Root class="border-border bg-popover">
  <Card.Header>
    <Card.Title>Sign Up</Card.Title>
    <Card.Description>Sign up for an account to get the most out of MinionAH</Card.Description>
  </Card.Header>
  <Card.Content>
    <form
      method="POST"
      action="?/signup"
      use:enhance={{
        onSubmit: async () => {
          $toastLoading = toast.loading("Signing you up...");
        },
        onResult: async () => {
          setTimeout(() => toast.dismiss($toastLoading), 300);
        },
        onUpdate: async ({ result }) => {
          if (result?.type === "success") {
            toast.success("Signed you up successfully!");
          } else {
            toast.error("Failed to sign you up.");
          }
        },
        onError: async () => {
          toast.error("Something went wrong while trying to sign you up.");
        }
      }}
      class="relative mx-auto flex h-1/2 max-w-md flex-col justify-center self-center px-4 md:px-0">
      {#if $step === "1"}
        <Form.Field {form} name="mcusername">
          <Form.Control let:attrs>
            <Form.Label for="mcusername">Username</Form.Label>
            <Form.Description>This is your <span class="font-semibold">Minecraft</span> username.</Form.Description>
            <Input {...attrs} bind:value={$formData.mcusername} maxlength={16} type="text" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" autocomplete="username" name="mcusername" id="mcusername" />
            <div class="text-sm font-medium text-destructive">
              {#if $errors.mcusername?.length}
                <div>{$errors.mcusername[0]}</div>
              {/if}
            </div>
          </Form.Control>
        </Form.Field>
        <Button type="button" disabled={!isTainted($tainted) || $submitting || $requestingCode} class="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-all duration-300 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" on:click={requestCode}>
          {#if !$submitting && !$requestingCode}
            Request code
          {:else}
            <LoaderCircle class="h-4 w-4 animate-spin" />
          {/if}
        </Button>
      {/if}
      {#if $step === "2"}
        <Form.Field {form} name="code">
          <Form.Control let:attrs>
            <Form.Label for="code">Code</Form.Label>
            <Form.Description
              >Start Minecraft and connect to
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="inline"
                  on:pointerdown={() => {
                    navigator.clipboard.writeText("auth.mc-id.com");
                    toast.success("Copied the server address to your clipboard.");
                  }}><span class="text-foreground">auth.mc-id.com</span>.</Tooltip.Trigger>
                <Tooltip.Content class="border-border bg-popover">
                  <p>Click to copy</p>
                </Tooltip.Content>
              </Tooltip.Root>You'll get kicked from the server and provided with a code</Form.Description>
            <Input {...attrs} bind:value={$formData.code} maxlength={16} type="text" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" name="code" id="code" on:keydown={(e) => e.code === "Space" && e.preventDefault()} />
            <Form.FieldErrors />
          </Form.Control>
        </Form.Field>
        <Form.Button disabled={!isTainted($tainted) || $submitting} class="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-all duration-300 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          {#if !$submitting}
            Sign up
          {:else}
            <LoaderCircle class="h-4 w-4 animate-spin" />
          {/if}
        </Form.Button>
      {/if}
    </form>
  </Card.Content>
  <Card.Footer>
    <p class="w-full text-center text-sm">
      <span class="opacity-50">Already have an account?</span>
      <Button variant="link" on:click={handleSignInButtonClick} class={`inline-block p-0 underline underline-offset-2 opacity-50 transition-opacity duration-300 hover:opacity-100`}>Sign in</Button>
    </p>
  </Card.Footer>
</Card.Root>

<p class="mb-2 mt-2 text-center text-xs text-muted-foreground">By signing up, you agree to our <a href="https://newsroom.minionah.com/terms-of-service" target="_blank" class="underline">Terms of Service</a> and <a href="https://newsroom.minionah.com/privacy-policy" target="_blank" class="underline">Privacy Policy</a>.</p>

<Collapsible.Root open={true} class="mt-6 flex w-full flex-col gap-y-6">
  <Collapsible.Trigger class="flex w-full items-center justify-between rounded-lg border border-border px-6 py-2 transition-colors duration-300 hover:bg-background ">FAQ <ChevronsUpDown class="size-5" /></Collapsible.Trigger>
  <Collapsible.Content class="rounded-lg border border-border px-6 py-2">
    <Accordion.Root class="w-full text-muted-foreground">
      <Accordion.Item value="item-1" class="border-border">
        <Accordion.Trigger class="text-start text-accent-foreground">How does it work?</Accordion.Trigger>
        <Accordion.Content>
          We use MC-ID to authenticate your Minecraft account, which is the most secure way to do so.
          <br /><br />
          No sensitive information like your password, tokens, or any other personal information is being used or stored during this process.
          <br /><br />
          For more information, check out <a href="https://docs.mc-id.com" target="_blank" rel="noopener" class="text-accent-foreground underline">MC-ID</a>.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="item-2" class="border-border">
        <Accordion.Trigger class="text-start text-accent-foreground">Can I trust you with my account?</Accordion.Trigger>
        <Accordion.Content>
          We can't make any changes, purchases, or do anything else with your Minecraft account, because we simply do not get any data that would allow us to do so from MC-ID.
          <br /><br />
          We will also never attempt to steal, sell, or otherwise misuse your Minecraft account information. We use the information provided by MC-ID to verify your Minecraft ownership and identity.
          <br /><br />
          We will also never ask for your Minecraft or Microsoft password or any other sensitive information.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="item-3" class="border-border">
        <Accordion.Trigger class="text-start text-accent-foreground">What information do you store?</Accordion.Trigger>
        <Accordion.Content>
          We store the following information:
          <ul class="list-inside list-disc">
            <li>Your Minecraft UUID</li>
            <li>Your Minecraft username</li>
            <li>Your Minecraft skin</li>
            <li>Your Minecraft cape (if any)</li>
          </ul>
          <br />
          More information can be found in our <a href="https://newsroom.minionah.com/privacy-policy" target="_blank" rel="noopener" class="text-accent-foreground underline">Privacy Policy</a>.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="item-4" class="border-none">
        <Accordion.Trigger class="text-start text-accent-foreground">What if your database is compromised?</Accordion.Trigger>
        <Accordion.Content
          >In the extremely unlikely event that our database is compromised, your Minecraft account will not be at risk at all. We simply do not store sensitive information like your Minecraft password (nor do we have it in the first place).
          <br /><br />
          However, your MinionAH account might be at risk. We will notify you if such an event occurs and provide you with the necessary steps to secure your account.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  </Collapsible.Content>
</Collapsible.Root>
