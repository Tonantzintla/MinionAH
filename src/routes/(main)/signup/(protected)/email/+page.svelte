<svelte:options runes={false} />

<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import { toast } from "svelte-sonner";
  import { derived, writable } from "svelte/store";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { formSchema, type FormSchema } from "./schema";

  export let data;
  const dataForm: SuperValidated<Infer<FormSchema>> = data.form;

  const form = superForm(dataForm, {
    validators: zodClient(formSchema),
    dataType: "json",
    timeoutMs: 2000,
    validationMethod: "oninput"
  });

  const { form: formData, enhance, tainted, isTainted, submitting, timeout, errors } = form;

  const toastLoading = writable<number | string>();

  timeout.subscribe((value) => {
    if (value) {
      toast.loading("It's taking longer than expected to save your email...", {
        id: $toastLoading
      });
    }
  });

  const valid = derived([tainted, errors], ([$tainted, $errors]) => {
    if (!isTainted($tainted)) {
      return false;
    }
    return Object.values($errors).every((error) => error === undefined);
  });
</script>

<div class="mx-auto w-full max-w-md px-4">
  <Card.Root class="border-border bg-popover">
    <Card.Header>
      <Card.Title>Update Account</Card.Title>
      <Card.Description>Add an email so you can receive chat notifications. You can change it later in settings.</Card.Description>
    </Card.Header>
    <Card.Content>
      <form
        method="POST"
        use:enhance={{
          onSubmit: async () => {
            $toastLoading = toast.loading("Saving your email...");
          },
          onResult: async () => {
            setTimeout(() => toast.dismiss($toastLoading), 300);
          },
          onUpdate: async ({ result }) => {
            if (result.type === "success") {
              toast.success("Saved your email successfully!");
            } else {
              toast.error("Failed to save your email.");
            }
          },
          onError: async () => {
            toast.error("Something went wrong while trying to save your email.");
          }
        }}
        class="mx-auto flex h-1/2 max-w-md flex-col justify-center px-4 md:px-0">
        <Form.Field {form} name="username">
          <Form.Control let:attrs>
            <Form.Label>Username</Form.Label>
            <Form.Description>This is your Minecraft username.</Form.Description>
            <Input {...attrs} value={data.user?.username} tabindex={-1} type="text" aria-readonly readonly class="pointer-events-none select-none border-2 border-accent read-only:cursor-not-allowed read-only:opacity-50 focus:border-accent focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0" autocomplete="username" name="username" id="username" />
            <Form.FieldErrors />
          </Form.Control>
        </Form.Field>
        <Form.Field {form} name="email">
          <Form.Control let:attrs>
            <Form.Label for="email">Email</Form.Label>
            <Form.Description>We use this to send chat notifications.</Form.Description>
            <Input {...attrs} bind:value={$formData.email} type="email" required name="email" id="email" autocomplete="email" class="border-2 border-accent transition-all duration-300 focus:border-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[invalid]:border-destructive/40 focus:data-[invalid]:border-destructive" />
            <Form.FieldErrors class="pb-2" />
          </Form.Control>
        </Form.Field>
        <Form.Button disabled={!$valid || $submitting} class="transition-all duration-300">
          {#if !$submitting}
            Continue
          {:else}
            <LoaderCircle class="h-4 w-4 animate-spin" />
          {/if}
        </Form.Button>
      </form>
    </Card.Content>
  </Card.Root>
</div>
