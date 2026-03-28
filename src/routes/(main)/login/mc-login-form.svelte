<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import { createEventDispatcher } from "svelte";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { mcLoginFormSchema, type McLoginFormSchema } from "./schema";

  export let data: SuperValidated<Infer<McLoginFormSchema>>;

  const form = superForm(data, {
    validators: zodClient(mcLoginFormSchema),
    dataType: "json",
    timeoutMs: 2000,
    validationMethod: "oninput"
  });

  const { form: formData, enhance, tainted, isTainted, submitting, timeout, errors } = form;

  const toastLoading = writable<number | string>();
  const step = writable<"1" | "2">("1");
  const requestingCode = writable(false);

  const dispatch = createEventDispatcher();

  const handleSignUpButtonClick = () => {
    dispatch("signup");
  };

  const handleLoginButtonClick = () => {
    dispatch("login");
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
          username: $formData.mcloginusername
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
    <Card.Title>Login</Card.Title>
    <Card.Description>Enter your MinionAH credentials below to login to your account</Card.Description>
  </Card.Header>
  <Card.Content>
    <form
      method="POST"
      action="?/mclogin"
      use:enhance={{
        onSubmit: async () => {
          $toastLoading = toast.loading("Logging you in...");
        },
        onResult: async () => {
          setTimeout(() => toast.dismiss($toastLoading), 300);
        },
        onUpdate: async ({ result }) => {
          if (result?.type === "success") {
            toast.success("Logged in successfully!");
          } else {
            toast.error("Failed to login.");
          }
        },
        onError: async () => {
          toast.error("Something went wrong while trying to login.");
        }
      }}
      class="relative mx-auto flex h-1/2 max-w-md flex-col justify-center self-center px-4 md:px-0">
      {#if $step === "1"}
        <Form.Field {form} name="mcloginusername">
          <Form.Control let:attrs>
            <Form.Label for="mcloginusername">Username</Form.Label>
            <Form.Description>This is your <span class="font-semibold">Minecraft</span> username.</Form.Description>
            <Input {...attrs} bind:value={$formData.mcloginusername} maxlength={16} type="text" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" autocomplete="username" name="mcloginusername" id="mcloginusername" />
            <div class="text-sm font-medium text-destructive">
              {#if $errors.mcloginusername?.length}
                <div>{$errors.mcloginusername[0]}</div>
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
        <Form.Field {form} name="logincode">
          <Form.Control let:attrs>
            <Form.Label for="code">Code</Form.Label>
            <Form.Description>
              Start Minecraft and connect to
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
            <Input {...attrs} bind:value={$formData.logincode} maxlength={16} type="text" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" name="logincode" id="logincode" on:keydown={(e) => e.code === "Space" && e.preventDefault()} />
            <Form.FieldErrors />
          </Form.Control>
        </Form.Field>
        <Form.Button disabled={!isTainted($tainted) || $submitting} class="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-all duration-300 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          {#if !$submitting}
            Login
          {:else}
            <LoaderCircle class="h-4 w-4 animate-spin" />
          {/if}
        </Form.Button>
      {/if}
      <span class="my-2 w-full text-center text-sm opacity-50">Or</span>
      <Button variant="outline" data-disabled={$submitting} data-sveltekit-preload-data="tap" class="data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50" on:click={handleLoginButtonClick}>Login with password</Button>
    </form>
  </Card.Content>
  <Card.Footer>
    <p class="w-full text-center text-sm">
      <span class="opacity-50">Don't have an account?</span>
      <Button variant="link" on:click={handleSignUpButtonClick} class={`inline-block p-0 underline underline-offset-2 opacity-50 transition-opacity duration-300 hover:opacity-100 ${$submitting ? "pointer-events-none cursor-default" : ""}`}>Sign up</Button>
    </p>
  </Card.Footer>
</Card.Root>
