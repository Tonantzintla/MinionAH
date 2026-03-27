<script lang="ts" context="module">
  import { z } from "zod";
  export const notificationsFormSchema = z.object({
    type: z
      .enum(["DEVICE", "EMAIL", "DISCORD"], {
        required_error: "You need to select a notification type."
      })
      .array()
      .nullable()
      .default(null),
    social_notifications: z.boolean().default(false).optional(),
    marketing_notifications: z.boolean().default(false).optional(),
    fcmToken: z.string().optional()
  });
  type NotificationFormSchema = typeof notificationsFormSchema;
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import { env as envPublic } from "$env/dynamic/public";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import * as Form from "$lib/components/ui/form";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Switch } from "$lib/components/ui/switch";
  import { internalStorage } from "$lib/stores/preferences";
  import { requestNotificationPermission } from "$lib/utilities";
  import { getMessaging, getToken } from "firebase/messaging";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import Share from "lucide-svelte/icons/share";
  import TriangleAlert from "lucide-svelte/icons/triangle-alert";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { readable, writable } from "svelte/store";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";

  const { PUBLIC_VAPID_KEY } = envPublic;

  export let data: SuperValidated<Infer<NotificationFormSchema>>;

  const form = superForm(data, {
    validators: zodClient(notificationsFormSchema),
    dataType: "json",
    resetForm: false,
    timeoutMs: 2000
  });

  const { form: formData, enhance, tainted, isTainted, submitting, timeout, submit } = form;

  const isiOS = writable(false);
  const iOSCanInstall = writable(false);
  const iOSIsInstalled = writable(false);
  const registering = writable(false);

  const showInstallInstructions = writable(false);

  const deviceCheckboxDisabled = writable(false);

  const permission = writable<NotificationPermission | undefined>();
  const hasEmail = readable($page.data.userData.settings?.profileSettings?.email ? true : false);
  const hasDiscord = readable($page.data.userData.oauth[0]?.provider === "discord" ? true : false);
  const toastLoading = writable<number | string>();

  const isDeviceSelected = writable($formData.type?.includes("DEVICE"));
  const isEmailSelected = writable($formData.type?.includes("EMAIL"));
  const isDiscordSelected = writable($formData.type?.includes("DISCORD"));

  const isSending = writable(false);
  const additionalSetupDiscord = writable(false);
  const additionalSetupDevice = writable(false);

  isEmailSelected.subscribe((value) => {
    formData.update((state) => {
      const updatedType: ("DEVICE" | "EMAIL" | "DISCORD")[] = value ? [...(state.type ?? []), "EMAIL"].filter((v, i, a): v is "DEVICE" | "EMAIL" | "DISCORD" => a.indexOf(v) === i) : (state.type ?? []).filter((type): type is "DEVICE" | "EMAIL" | "DISCORD" => type !== "EMAIL");
      return { ...state, type: updatedType };
    });
  });

  isDeviceSelected.subscribe((value) => {
    formData.update((state) => {
      const updatedType: ("DEVICE" | "EMAIL" | "DISCORD")[] = value ? [...(state.type ?? []), "DEVICE"].filter((v, i, a): v is "DEVICE" | "EMAIL" | "DISCORD" => a.indexOf(v) === i) : (state.type ?? []).filter((type): type is "DEVICE" | "EMAIL" | "DISCORD" => type !== "DEVICE");
      return { ...state, type: updatedType };
    });
  });

  isDiscordSelected.subscribe((value) => {
    formData.update((state) => {
      const updatedType: ("DEVICE" | "EMAIL" | "DISCORD")[] = value ? [...(state.type ?? []), "DISCORD"].filter((v, i, a): v is "DEVICE" | "EMAIL" | "DISCORD" => a.indexOf(v) === i) : (state.type ?? []).filter((type): type is "DEVICE" | "EMAIL" | "DISCORD" => type !== "DISCORD");
      return { ...state, type: updatedType };
    });
  });

  const handleRequestPermission = async (request: boolean = false) => {
    permission.set(await requestNotificationPermission(request));
    if ($permission === "granted") {
      const token = await getToken(getMessaging(), {
        vapidKey: PUBLIC_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      internalStorage.update((state) => ({ ...state, fcmToken: token }));
      deviceCheckboxDisabled.set(false);
      if (request) {
        window.location.reload();
      }
    } else if ($permission === "denied" || $permission === "default" || $permission === undefined) {
      deviceCheckboxDisabled.set(true);
    }
  };

  timeout.subscribe((value) => {
    if (value) {
      toast.loading("It's taking longer than expected to update your notification preferences...", {
        id: $toastLoading,
        duration: Number.POSITIVE_INFINITY
      });
    }
  });

  async function sendTestMessage(type: "DEVICE" | "DISCORD") {
    if ($isSending) return;
    isSending.set(true);
    const response = await fetch("/profile/settings/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: type,
        fcmToken: $internalStorage.fcmToken
      })
    })
      .finally(() => {
        isSending.set(false);
      })
      .catch((error) => {
        console.error("Error sending test message:", error);
        toast.error("Something went wrong while sending the test message.");
      });
    if (response && response.ok) {
      setTimeout(
        () => {
          toast.success("Test message sent successfully.");
        },
        type === "DEVICE" ? 2000 : 0
      );
    } else {
      toast.error("Failed to send test message.");
    }
  }

  onMount(async () => {
    // @ts-expect-error - userAgentData is not yet in the TS types
    isiOS.set(window.navigator?.userAgentData ? window.navigator.userAgentData?.platform === "iOS" : navigator.platform === "iPhone" || navigator.platform === "iPad");

    if ($isiOS && "standalone" in window.navigator) {
      iOSCanInstall.set(true);
      iOSIsInstalled.set(window.navigator.standalone === true);
    }

    if ($isiOS && $iOSIsInstalled) {
      await handleRequestPermission();
    } else if (!$isiOS) {
      await handleRequestPermission();
    }
  });
</script>

<Alert.Root class="border-accent bg-accent/20  text-accent-foreground/80">
  <Alert.Description class="text-pretty">
    The device notifications feature is in
    <span class="rounded-full border border-accent bg-accent/20 px-2 py-0.5 text-accent-foreground/80">Beta</span>. You may experience issues with notifications. If you do, try using another notification method.
  </Alert.Description>
</Alert.Root>

<form
  method="POST"
  class="space-y-8"
  use:enhance={{
    onSubmit: async ({ cancel }) => {
      const wantsDevice = $formData.type?.includes("DEVICE");
      $toastLoading = toast.loading("Updating your notification preferences...");
      if (wantsDevice && $internalStorage.fcmToken) {
        formData.update((state) => ({ ...state, fcmToken: $internalStorage.fcmToken }));
      } else if (wantsDevice && !$internalStorage.fcmToken) {
        $toastLoading = toast.error("Failed to update your notification preferences. Please refresh the page and try again.");
        cancel();
      }
    },
    onUpdate: async ({ result }) => {
      if (result.type === "success") {
        toast.success("Your notification preferences have been updated successfully.", { id: "updateToast" });
      } else {
        toast.error("Failed to update your notification preferences.", { id: "updateToast" });
      }
      toast.dismiss($toastLoading);
    },
    onError: async () => {
      toast.error("Something went wrong trying to update your notification preferences.");
      toast.dismiss($toastLoading);
    }
  }}>
  <Form.Fieldset {form} name="type" disabled={$registering}>
    <Form.Legend>Notify me via...</Form.Legend>
    <div class="flex flex-col space-y-4">
      <div class="flex items-center space-x-4">
        <Form.Control let:attrs>
          <Checkbox disabled={!$hasEmail} value="EMAIL" {...attrs} bind:checked={$isEmailSelected} />
          <Form.Label class="flex flex-col font-normal">
            <span class="text-base">Email</span>
            <span class="text-sm text-muted-foreground">Receive notifications via email.</span>
            {#if !$hasEmail}
              <span class="text-sm font-semibold text-muted-foreground">You need to <a href="/profile/settings" class="underline">add an email</a> to receive email notifications</span>
            {/if}
          </Form.Label>
        </Form.Control>
      </div>
      <div class="flex items-center space-x-4">
        <Form.Control let:attrs>
          <Checkbox
            value="DEVICE"
            disabled={$deviceCheckboxDisabled || ($isiOS && !$iOSIsInstalled)}
            {...attrs}
            bind:checked={$isDeviceSelected}
            onCheckedChange={(v) => {
              if (v) {
                additionalSetupDevice.set(true);
                toast.info("You need to do some additional setup to receive notifications on this device. Click the icon next to the Device option for more info.");
              }
            }} />
          <Form.Label class="flex flex-col font-normal">
            <span class="flex items-center gap-1.5 text-base">
              Device
              <span class="rounded-full border border-accent bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground/80">Beta</span>
              <Dialog.Root bind:open={$additionalSetupDevice}>
                <Dialog.Trigger class="animate-wiggle rounded-full border border-yellow-400 bg-yellow-800 px-2 py-0.5 text-xs text-accent-foreground/80">
                  <TriangleAlert class="size-3.5 text-yellow-400" />
                </Dialog.Trigger>
                <Dialog.Content class="border-border bg-popover">
                  <Dialog.Header>
                    <Dialog.Title>Additional setup required</Dialog.Title>
                    <Dialog.Description>
                      {#if $isiOS && !$iOSIsInstalled}
                        <div class="flex flex-col">
                          <p class="text-sm text-yellow-500">On iOS devices, you need to install MinionAH first in order to receive notifications.</p>
                          <Button class="mt-4 w-fit" variant="default" on:click={() => showInstallInstructions.set(true)}>Install MinionAH</Button>
                        </div>
                      {:else if $permission === "denied" || $permission === "default"}
                        To receive notifications on this device, you need to allow notifications to receive them.
                        <div class="mt-4 flex flex-col">
                          {#if $permission === "default"}
                            <Button
                              class="w-fit"
                              variant="outline"
                              disabled={$submitting || $registering}
                              on:click={async () => {
                                registering.set(true);
                                await handleRequestPermission(true);
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore - TypeScript doesn't know that the permission has been set
                                if ($permission === "granted" && $internalStorage.fcmToken) {
                                  submit();
                                }
                                registering.set(false);
                              }}>
                              {#if $submitting || $registering}
                                <LoaderCircle class="size-4 animate-spin" />
                              {:else}
                                Receive notifications on this device
                              {/if}
                            </Button>
                          {/if}
                          {#if $permission === "denied"}
                            <p class="text-sm text-red-500">You have denied notifications. Please allow them in your {$isiOS ? "device settings" : "browser settings"} to receive notifications.</p>
                          {/if}
                        </div>
                      {:else if $permission === "granted"}
                        <p class="text-sm text-green-500">Notifications are enabled. You will receive notifications on this device.</p>

                        <Alert.Root class="mt-4 border-border">
                          <Alert.Title>Test if it works!</Alert.Title>

                          <Alert.Description>
                            <p class="text-muted-foreground">You can send a test message to your current device to check if everything is set up correctly.</p>
                            <Button on:click={async () => await sendTestMessage("DEVICE")} disabled={$isSending} class="mt-2" variant="outline">Send a test message</Button>
                          </Alert.Description>
                        </Alert.Root>
                      {:else}{/if}
                    </Dialog.Description>
                  </Dialog.Header>
                </Dialog.Content>
              </Dialog.Root>
            </span>
            <span class="text-sm text-muted-foreground">Receive notifications on your device.</span>
            {#if $permission === "denied" || $permission === "default"}
              <Button variant="link" on:click={() => additionalSetupDevice.set(true)} class="h-auto p-0 text-sm font-semibold text-muted-foreground hover:no-underline">
                You need to&nbsp;<span class="underline"> allow notifications </span>&nbsp;to receive them.
              </Button>
            {/if}
          </Form.Label>
        </Form.Control>
      </div>
      <div class="flex items-center space-x-4">
        <Form.Control let:attrs>
          <Checkbox
            disabled={!$hasDiscord}
            value="DISCORD"
            {...attrs}
            bind:checked={$isDiscordSelected}
            onCheckedChange={(v) => {
              if (v) {
                additionalSetupDiscord.set(true);
                toast.info("You need to do some additional setup to receive notifications on Discord. Click the icon next to the Discord option for more info.");
              }
            }} />
          <Form.Label class="flex flex-col font-normal">
            <span class="flex items-center gap-1.5 text-base">
              Discord
              {#if $hasDiscord}
                <Dialog.Root bind:open={$additionalSetupDiscord}>
                  <Dialog.Trigger class="animate-wiggle rounded-full border border-yellow-400 bg-yellow-800 px-2 py-0.5 text-xs text-accent-foreground/80">
                    <TriangleAlert class="size-3.5 text-yellow-400" />
                  </Dialog.Trigger>
                  <Dialog.Content class="border-border bg-popover">
                    <Dialog.Header>
                      <Dialog.Title>Additional setup required</Dialog.Title>
                      <Dialog.Description>
                        To receive notifications on Discord, <b>you need to do at least one of the following</b>:
                        <ul class="list-inside list-disc pl-4">
                          <li>Join the MinionAH Discord server</li>
                          <li>Add the app to your server or account</li>
                        </ul>

                        <div class="mt-4 flex gap-4">
                          <Button href="https://discord.tonantzintla.org" target="_blank" rel="noopener noreferrer" variant="default">Join Server</Button>
                          <Button href="https://discord.com/oauth2/authorize?client_id=1276266745463705601" target="_blank" rel="noopener noreferrer" variant="default">Add App</Button>
                        </div>

                        <Alert.Root class="mt-4 border-border">
                          <Alert.Title>Test if it works!</Alert.Title>

                          <Alert.Description>
                            <p class="text-muted-foreground">You can send a test message to your Discord account to check if everything is set up correctly.</p>
                            <Button on:click={async () => sendTestMessage("DISCORD")} disabled={$isSending} class="mt-2" variant="outline">Send a test message</Button>
                          </Alert.Description>
                        </Alert.Root>
                      </Dialog.Description>
                    </Dialog.Header>
                  </Dialog.Content>
                </Dialog.Root>
              {/if}
            </span>
            <span class="text-sm text-muted-foreground">
              Receive notifications on your Discord account. <br />
            </span>
            {#if !$hasDiscord}
              <span class="text-sm font-semibold text-muted-foreground">
                You need to <a href="/profile/settings" class="underline">link your Discord account</a> to receive notifications.
              </span>
            {/if}
          </Form.Label>
        </Form.Control>
      </div>
    </div>
  </Form.Fieldset>

  <div class="space-y-4">
    <Form.Field {form} name="marketing_notifications">
      <Form.Legend>Send me...</Form.Legend>
      <Form.Field {form} name="social_notifications">
        <Form.Control let:attrs>
          <div class="flex flex-row items-center justify-between rounded-lg border border-border p-4">
            <div class="space-y-0.5">
              <Form.Label class="text-base">Social notifications</Form.Label>
              <Form.Description>Receive notifications for when someone sends you a message.</Form.Description>
            </div>
            <Switch includeInput {...attrs} bind:checked={$formData.social_notifications} />
          </div>
        </Form.Control>
      </Form.Field>
      <Form.Control let:attrs>
        <div class="flex flex-row items-center justify-between rounded-lg border border-border p-4">
          <div class="space-y-0.5">
            <Form.Label class="text-base">Marketing notifications</Form.Label>
            <Form.Description>Receive notifications about new features, news, and more.</Form.Description>
          </div>
          <Switch includeInput {...attrs} bind:checked={$formData.marketing_notifications} />
        </div>
      </Form.Control>
    </Form.Field>
  </div>

  <Form.Button disabled={!isTainted($tainted) || $submitting || $registering}>Update notifications</Form.Button>
</form>

{#if $isiOS}
  <Drawer.Root bind:open={$showInstallInstructions} openFocus={null}>
    <Drawer.Content class="border-border bg-popover">
      <Drawer.Header class="pb-0">
        <Drawer.Title class="pb-4">Install MinionAH</Drawer.Title>
        <Drawer.Description>
          <ScrollArea class="h-[28rem]" data-vaul-no-drag>
            <p>To receive notifcations from MinionAH on your Apple device, you need to install the app first. <br /> <br />Follow these simple steps to install MinionAH on your device.</p>
            <ol class="mt-2 list-inside list-decimal pb-4 text-center">
              <li>
                Tap the <span class="inline-flex items-center gap-1 font-semibold"><Share class="size-4" /> Share</span> button at the bottom of the screen.
                <img src="/assets/images/ios-install/Install Step 1.png" alt="Step 1" class="mx-auto max-h-96" />
              </li>
              <li>
                Tap <strong>Add to Home Screen</strong>.
                <img src="/assets/images/ios-install/Install Step 2.png" alt="Step 2" class="mx-auto max-h-96" />
              </li>
              <li>
                Tap <strong>Add</strong> in the top right corner.
                <img src="/assets/images/ios-install/Install Step 3.png" alt="Step 3" class="mx-auto max-h-96" />
              </li>
              <li>
                That's all! Just use MinionAH from your home screen instead of via Safari.
                <img src="/assets/images/ios-install/Install Step 4.png" alt="Step 4" class="mx-auto max-h-96" />
              </li>
            </ol>
          </ScrollArea>
        </Drawer.Description>
      </Drawer.Header>
      <Drawer.Footer>
        <Drawer.Close>Close</Drawer.Close>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
{/if}
