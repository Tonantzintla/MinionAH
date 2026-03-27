<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import { createEventDispatcher } from "svelte";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { loginFormSchema, type LoginFormSchema } from "./schema";

  export let data: SuperValidated<Infer<LoginFormSchema>>;

  const form = superForm(data, {
    validators: zodClient(loginFormSchema),
    dataType: "json",
    timeoutMs: 2000,
    validationMethod: "oninput"
  });

  const { form: formData, enhance, tainted, isTainted, submitting, timeout, errors } = form;

  const toastLoading = writable<number | string>();

  const dispatch = createEventDispatcher();

  const handleSignUpButtonClick = () => {
    dispatch("signup");
  };

  const handleMcLoginButtonClick = () => {
    dispatch("mclogin");
  };

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
      action="?/login"
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
      <Form.Field {form} name="username">
        <Form.Control let:attrs>
          <Form.Label for="username">Username</Form.Label>
          <Form.Description>This is your <span class="font-semibold">Minecraft</span> username.</Form.Description>
          <Input {...attrs} bind:value={$formData.username} maxlength={16} type="text" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" autocomplete="username" name="username" id="username" />
          <div class="text-sm font-medium text-destructive">
            {#if $errors.username?.length}
              <div>{$errors.username[0]}</div>
            {/if}
          </div>
        </Form.Control>
      </Form.Field>
      <Form.Field {form} name="current-password">
        <Form.Control let:attrs>
          <Form.Label for="current-password">Password</Form.Label>
          <Form.Description>
            This is your <span class="font-semibold">MinionAH</span> password.
          </Form.Description>
          <Input {...attrs} bind:value={$formData["current-password"]} type="password" name="current-password" id="current-password" autocomplete="current-password" passwordrules="minlength: 8;" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" />
          <Form.FieldErrors />
        </Form.Control>
      </Form.Field>

      <Form.Button disabled={!isTainted($tainted) || $submitting} class="transition-all duration-300">
        {#if !$submitting}
          Login
        {:else}
          <LoaderCircle class="h-4 w-4 animate-spin" />
        {/if}
      </Form.Button>

      <span class="my-2 w-full text-center text-sm opacity-50">Or</span>
      <Button variant="outline" data-disabled={$submitting} data-sveltekit-preload-data="tap" class="data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50" on:click={handleMcLoginButtonClick}>
        <img src="/assets/images/MC-ID.svg" class="pointer-events-none mr-1 h-6 w-auto select-none transition-opacity duration-300 group-hover:opacity-70" alt="MC-ID" />
        Login with MC-ID
      </Button>
    </form>
  </Card.Content>
  <Card.Footer>
    <p class="w-full text-center text-sm">
      <span class="opacity-50">Don't have an account?</span>
      <Button variant="link" on:click={handleSignUpButtonClick} class={`inline-block p-0 underline underline-offset-2 opacity-50 transition-opacity duration-300 hover:opacity-100 ${$submitting ? "pointer-events-none cursor-default" : ""}`}>Sign up</Button>
    </p>
  </Card.Footer>
</Card.Root>
