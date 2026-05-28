<script lang="ts">
  import type { Auction, Minion, User } from "$generated/prisma";
  import CardLoading from "$lib/components/CardLoading.svelte";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import HtmlToast from "$lib/components/HtmlToast.svelte";
  import MinionsListBox from "$lib/components/MinionsListBox.svelte";
  import TierListbox from "$lib/components/TierListbox.svelte";
  import MinionCard from "$lib/components/card/cardminion.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import NumberFlow, { NumberFlowGroup } from "@number-flow/svelte";
  import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
  import LoaderCircle from "lucide-svelte/icons/loader-circle";
  import * as skinview3d from "skinview3d";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { writable } from "svelte/store";
  import { slide } from "svelte/transition";
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import type { PageData } from "./$types";
  import { formSchemaBump, formSchemaCreate, formSchemaDelete } from "./schema";

  export let data: PageData;

  const formCreate = superForm(data.formCreate, {
    validators: zodClient(formSchemaCreate),
    onUpdated: () => {
      if ($messageCreate) {
        toast($messageCreate.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageCreate.description
          }
        });
      }
    },
    onError: () => {
      if ($messageCreate) {
        toast.error($messageCreate.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageCreate.description
          }
        });
      }
    }
  });

  const formDelete = superForm(data.formDelete, {
    validators: zodClient(formSchemaDelete),
    onSubmit: ({ formData }) => {
      formData.set("id", minionToDelete?.id);
    },
    onResult: () => {
      showDeleteFormDialog = false;
    },
    onUpdated: () => {
      if ($messageDelete) {
        toast($messageDelete.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageDelete.description
          }
        });
      }
    },
    onError: () => {
      if ($messageDelete) {
        toast.error($messageDelete.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageDelete.description
          }
        });
      }
    }
  });

  const formBump = superForm(data.formBump, {
    validators: zodClient(formSchemaBump),
    onSubmit: ({ formData }) => {
      formData.set("id", minionToBump?.id);
    },
    onUpdated: () => {
      if ($messageBump) {
        toast($messageBump.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageBump.description
          }
        });
      }
    },
    onError: () => {
      if ($messageBump) {
        toast.error($messageBump.title, {
          description: HtmlToast,
          componentProps: {
            htmlMessage: $messageBump.description
          }
        });
      }
    }
  });

  const { form: formDataCreate, enhance: enhanceCreate, message: messageCreate, submitting: submittingCreate, errors: errorsCreate, constraints: constraintsCreate } = formCreate;
  const { form: formDataDelete, enhance: enhanceDelete, message: messageDelete, submitting: submittingDelete, submit: submitDelete } = formDelete;
  const { form: formDataBump, enhance: enhanceBump, message: messageBump, submitting: submittingBump, submit: bump } = formBump;

  $: moreThan1 = $formDataCreate.amount > (parseInt($constraintsCreate.amount?.min?.toString() ?? "0") || 0);
  let showDeleteFormDialog = false;
  let minionToDelete: Auction & { minion: Minion } & { user: User };

  let minionToBump: Auction & { minion: Minion } & { user: User };

  let minecraftAvatar: HTMLCanvasElement;
  let minecraftAvatarContainer: HTMLDivElement;

  const canvasIsLoading = writable<boolean>(true);

  let maxtier: number | undefined = 12;

  let tierListDisabled = true;

  const user = data.user! as User;
  let viewer: skinview3d.SkinViewer;
  onMount(async () => {
    const minecraftAvatarContainerDimensions = minecraftAvatarContainer.getBoundingClientRect();
    const cape = await fetch(`https://res.cloudinary.com/minionah/image/upload/v1/users/capes/${user.id}`, {
      method: "HEAD"
    }).catch(() => ({ ok: false }));
    viewer = new skinview3d.SkinViewer({
      canvas: minecraftAvatar,
      width: minecraftAvatarContainerDimensions.width,
      height: minecraftAvatarContainerDimensions.height,
      skin: `https://res.cloudinary.com/minionah/image/upload/v1/users/skins/${user.id}`,
      cape: cape.ok ? `https://res.cloudinary.com/minionah/image/upload/v1/users/capes/${user.id}` : undefined,
      enableControls: true,
      animation: new skinview3d.IdleAnimation(),
      nameTag: user.username,
      zoom: 0.7,
      background: "#050505"
    });
    // disable zooming
    viewer.controls.enableZoom = false;
    // enable damping (smooth dragging)
    viewer.controls.enableDamping = true;
    // disable rotation on the y axis
    viewer.controls.maxPolarAngle = -Math.PI / 2; // upper boundary for the polar angle
    viewer.controls.minPolarAngle = Math.PI / 2; // lower boundary for the polar angle
    canvasIsLoading.set(false);

    return new Promise((resolve) => {
      resolve(() => {
        viewer.dispose();
      });
    });
  });

  canvasIsLoading.subscribe(async (loading) => {
    if (!loading && viewer) viewer.loadPanorama("/assets/images/panorama.png");
  });
</script>

<div class="mx-auto flex max-w-xl flex-col justify-start gap-8 self-center px-2 md:px-0">
  <div bind:this={minecraftAvatarContainer} class="relative w-full">
    <div class="absolute right-3 top-3 z-30 flex flex-col gap-2">
      <CopyButton on:click={() => navigator.clipboard.writeText(`${window.location.origin}/user/${user?.username}`)} />
    </div>
    {#if $canvasIsLoading}
      <div class="absolute size-full animate-pulse rounded-lg border border-border bg-popover"></div>
    {/if}
    <canvas bind:this={minecraftAvatar} class="relative size-full transform-gpu overflow-hidden rounded-lg border border-border bg-popover transition-opacity duration-[3s]" class:opacity-100={!$canvasIsLoading} class:opacity-0={$canvasIsLoading}></canvas>
  </div>
  {#await data.userMinions}
    <div class="h-[28.625rem] animate-pulse rounded-lg border border-border bg-popover shadow-sm"></div>
  {:then userMinions}
    {#if userMinions.length < 18}
      <form use:enhanceCreate method="POST" action="?/createMinion" class="space-y-6">
        <Card.Root class="border-border bg-popover text-primary">
          <Card.Header>
            <Card.Title>Minions</Card.Title>
            <Card.Description>Auction a minion</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="flex w-full flex-col items-center justify-center gap-4">
              <div class="mx-auto flex flex-col gap-4">
                <div class="flex gap-4">
                  {#await data.minionTypes}
                    <div class="flex flex-col space-y-2">
                      <Label>Minion</Label>
                      <Button variant="outline" role="combobox" type="button" class="relative w-40 cursor-default justify-between rounded-md border-none bg-accent py-1.5 pl-3 text-left text-muted-foreground shadow-sm ring-1 ring-inset ring-transparent hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm sm:leading-6 md:w-44">
                        <span>Loading...</span>
                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </div>
                  {:then minionTypes}
                    <Form.Field form={formCreate} name="type" class="flex flex-col space-y-2">
                      <Form.Control let:attrs>
                        <Form.Label>Minion</Form.Label>
                        <MinionsListBox
                          showReset={false}
                          on:onSelect={({ detail }) => {
                            maxtier = detail.maxTier;
                            $formDataCreate.type = detail.generator;
                            if ($constraintsCreate.tier?.min && $constraintsCreate.tier?.max && maxtier) {
                              const minTierConstraint = Number($constraintsCreate.tier.min);
                              const maxTierConstraint = Number($constraintsCreate.tier.max);

                              if (maxtier > minTierConstraint && maxtier <= maxTierConstraint) {
                                tierListDisabled = false;
                              }
                            }
                          }}
                          {minionTypes} />
                        <input hidden bind:value={$formDataCreate.type} name={attrs.name} />
                        <Form.FieldErrors />
                      </Form.Control>
                    </Form.Field>
                  {/await}
                  <Form.Field form={formCreate} name="tier" class="flex flex-col space-y-2">
                    <Form.Control let:attrs>
                      <Form.Label>Tier</Form.Label>
                      {#key maxtier}
                        <TierListbox bind:disabled={tierListDisabled} bind:maxtier on:onSelectedTierChange={({ detail }) => ($formDataCreate.tier = Number(detail.tier))} />
                      {/key}
                      <input hidden bind:value={$formDataCreate.tier} name={attrs.name} />
                      <Form.FieldErrors />
                    </Form.Control>
                  </Form.Field>
                </div>
                <div class="flex gap-4">
                  <div class="mt-1 inline-flex flex-col rounded-md">
                    <Form.Field form={formCreate} name="amount" class="flex w-40 flex-col md:w-44">
                      <Form.Control let:attrs>
                        <Form.Label>Amount</Form.Label>
                        <Input
                          type="number"
                          class="ring-offset-0 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
                          placeholder="Amount of minions"
                          max={$constraintsCreate.amount?.max}
                          min={$constraintsCreate.amount?.min}
                          {...attrs}
                          bind:value={$formDataCreate.amount}
                          on:change={() => {
                            if ($constraintsCreate.amount?.max && $formDataCreate.amount > Number($constraintsCreate.amount.max)) {
                              $formDataCreate.amount = Number($constraintsCreate.amount.max);
                            } else if ($constraintsCreate.amount?.min && $formDataCreate.amount < Number($constraintsCreate.amount.min)) {
                              $formDataCreate.amount = Number($constraintsCreate.amount.min);
                            }
                          }}
                          on:keydown={(e) => {
                            if ((e.key === "v" && (e.ctrlKey || e.metaKey)) || (e.key === "a" && (e.ctrlKey || e.metaKey)) || (e.key === "x" && (e.ctrlKey || e.metaKey)) || e.key === "Backspace" || e.key === "Delete") {
                              return;
                            }
                            if (isNaN(Number(e.key))) {
                              e.preventDefault();
                            }
                          }}
                          on:paste={(e) => {
                            e.preventDefault();
                          }} />
                        <Form.FieldErrors />
                      </Form.Control>
                    </Form.Field>
                  </div>
                  <div class="mt-1 inline-flex flex-col rounded-md">
                    <Form.Field form={formCreate} name="price" class="flex w-40 flex-col md:w-44">
                      <Form.Control let:attrs>
                        <Form.Label>Price <span class="inline text-neutral-200/50 opacity-0 transition-opacity duration-500" class:opacity-100={moreThan1}>(each)</span></Form.Label>
                        <Input
                          type="text"
                          class="w-40 ring-offset-0 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-0 md:w-44"
                          placeholder={moreThan1 ? "Price of each minion" : "Price of minion"}
                          {...attrs}
                          bind:value={$formDataCreate.price}
                          on:keydown={(e) => {
                            // check for ctrl + v, cmd + v, ctrl + a, cmd + a, ctrl + x, cmd + x, backspace and delete
                            if ((e.key === "v" && (e.ctrlKey || e.metaKey)) || (e.key === "a" && (e.ctrlKey || e.metaKey)) || (e.key === "x" && (e.ctrlKey || e.metaKey)) || e.key === "Backspace" || e.key === "Delete") {
                              return;
                            }

                            if ($constraintsCreate.price?.max && Number($formDataCreate.price) > Number($constraintsCreate.price.max)) e.preventDefault();
                            // check for k, m, b, t
                            if (e.key === "k" || e.key === "m" || e.key === "b" || e.key === "t") {
                              e.preventDefault();
                              if (isNaN(Number($formDataCreate.price))) {
                                return;
                              }
                              let currentPrice = $formDataCreate.price;
                              switch (e.key) {
                                case "k":
                                  currentPrice *= 1000;
                                  break;
                                case "m":
                                  currentPrice *= 1000000;
                                  break;
                                case "b":
                                  currentPrice *= 1000000000;
                                  break;
                                case "t":
                                  currentPrice *= 1000000000000;
                                  break;
                              }
                              if ($constraintsCreate.price?.max && currentPrice > Number($constraintsCreate.price.max)) return;
                              $formDataCreate.price = currentPrice;
                            }
                            if (isNaN(Number(e.key))) {
                              e.preventDefault();
                            }
                          }}
                          on:paste={(e) => {
                            if (!(e.currentTarget instanceof HTMLInputElement)) return;
                            if (isNaN(Number(e.clipboardData?.getData("text/plain")))) e.preventDefault();
                          }}
                          on:change={() => {
                            if ($constraintsCreate.price?.min && Number($formDataCreate.price) < Number($constraintsCreate.price.min)) {
                              $formDataCreate.price = Number($constraintsCreate.price.min);
                            } else if ($constraintsCreate.price?.max && Number($formDataCreate.price) > Number($constraintsCreate.price.max)) {
                              $formDataCreate.price = Number($constraintsCreate.price.max);
                            }
                          }} />

                        {#if Number($formDataCreate.price) >= 1000}
                          <div transition:slide>
                            <Form.Description>
                              <NumberFlowGroup>
                                <NumberFlow value={$formDataCreate.price} format={{ notation: "standard" }} suffix=" =" locales={["en"]} />
                                <NumberFlow value={$formDataCreate.price} format={{ notation: "compact", maximumFractionDigits: 2, roundingMode: "halfCeil" }} locales={["en"]} />
                              </NumberFlowGroup>
                            </Form.Description>
                          </div>
                        {/if}
                        <Form.FieldErrors />
                      </Form.Control>
                    </Form.Field>
                  </div>
                </div>
              </div>
              <Collapsible.Root class="flex flex-col items-center gap-y-2">
                <Collapsible.Trigger class="flex items-center justify-between gap-2 rounded-lg border border-border px-6 py-2 transition-colors duration-300 hover:bg-background ">
                  Minion Upgrades <ChevronsUpDown class="size-5" />
                </Collapsible.Trigger>
                <Collapsible.Content class="mt-4 flex w-full flex-col items-center justify-center gap-4">
                  <div class="flex w-full gap-4">
                    <Form.Field form={formCreate} name="infusion" class="flex w-full flex-row items-center justify-between gap-6 rounded-lg border border-input bg-background p-4">
                      <Form.Control let:attrs>
                        <div class="select-none space-y-0.5">
                          <Form.Label>Mithril Infused</Form.Label>
                          <Form.Description><a href="https://hypixelskyblock.minecraft.wiki/w/Mithril_Infusion" target="_blank" class="underline underline-offset-2">Mithril Infusion</a> is a minion upgrade which <br /> increases a minion's speed by 10% permanently.</Form.Description>
                        </div>
                        <Switch includeInput {...attrs} bind:checked={$formDataCreate.infusion} />
                      </Form.Control>
                    </Form.Field>
                  </div>
                  <div class="flex w-full gap-4">
                    <Form.Field form={formCreate} name="free-will" class="flex w-full flex-row items-center justify-between gap-6 rounded-lg border border-input bg-background p-4">
                      <Form.Control let:attrs>
                        <div class="select-none space-y-0.5">
                          <Form.Label>Free Will</Form.Label>
                          <Form.Description><a href="https://hypixelskyblock.minecraft.wiki/w/Free_Will" target="_blank" class="underline underline-offset-2">Free Will</a> is a minion upgrade which <br /> increases a minion's speed by 10% permanently.</Form.Description>
                        </div>
                        <Switch includeInput {...attrs} bind:checked={$formDataCreate["free-will"]} />
                      </Form.Control>
                    </Form.Field>
                  </div>
                </Collapsible.Content>
              </Collapsible.Root>

              <Collapsible.Root class="flex flex-col items-center gap-y-2">
                <Collapsible.Trigger class="flex items-center justify-between gap-2 rounded-lg border border-border px-6 py-2 transition-colors duration-300 hover:bg-background ">
                  Auction Options <ChevronsUpDown class="size-5" />
                </Collapsible.Trigger>
                <Collapsible.Content class="mt-4 flex w-full flex-col items-center justify-center gap-4">
                  <div class="flex w-full gap-4">
                    <Form.Field form={formCreate} name="negotiable" class="flex w-full flex-row items-center justify-between gap-6 rounded-lg border border-input bg-background p-4">
                      <Form.Control let:attrs>
                        <div class="select-none space-y-0.5">
                          <Form.Label>Negotiable</Form.Label>
                          <Form.Description>This will allow the buyer to negotiate the price with you.</Form.Description>
                        </div>
                        <Switch includeInput {...attrs} bind:checked={$formDataCreate.negotiable} />
                      </Form.Control>
                    </Form.Field>
                  </div>
                </Collapsible.Content>
              </Collapsible.Root>
            </div>
          </Card.Content>
          <Card.Footer class="justify-end">
            <Form.Button disabled={$submittingCreate || Object.keys($errorsCreate).length !== 0}>
              {#if !$submittingCreate}
                Create
              {:else}
                <LoaderCircle class="h-4 w-4 animate-spin" />
              {/if}
            </Form.Button>
          </Card.Footer>
        </Card.Root>
      </form>
    {:else}
      <div class="rounded-lg border border-border bg-popover p-6 text-primary">You can't have more than 18 active auctions. Delete a few in order to make a new one</div>
    {/if}
  {/await}
</div>

<div class="py-8 max-md:pb-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <ul role="list" class="grid grid-cols-1 justify-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#await data.userMinions}
        {#each Array(9) as _}
          <CardLoading />
        {/each}
      {:then minions}
        {#each minions as seller}
          <MinionCard
            minion={seller}
            on:openDeleteModal={() => {
              showDeleteFormDialog = true;
              minionToDelete = seller;
            }}
            on:bumpMinion={() => {
              minionToBump = seller;
              formBump.submit();
            }}
            class="only:col-start-2" />
        {/each}
      {/await}
    </ul>
  </div>
</div>

<form use:enhanceDelete action="?/deleteMinion" class="hidden" method="POST">
  <Form.Field form={formDelete} name="id">
    <Form.Control let:attrs>
      <input hidden bind:value={$formDataDelete.id} name={attrs.name} />
    </Form.Control>
  </Form.Field>
</form>

<form use:enhanceBump action="?/bumpMinion" class="hidden" method="POST">
  <Form.Field form={formBump} name="id">
    <Form.Control let:attrs>
      <input hidden bind:value={$formDataBump.id} name={attrs.name} />
    </Form.Control>
  </Form.Field>
</form>

<AlertDialog.Root bind:open={showDeleteFormDialog} closeOnEscape={!$submittingDelete} closeOnOutsideClick={!$submittingDelete}>
  <AlertDialog.Content class="border-border bg-popover">
    <AlertDialog.Header>
      <AlertDialog.Title>Warning</AlertDialog.Title>
      <AlertDialog.Description>Are you sure you want to delete this minion?</AlertDialog.Description>
      <ul>
        <MinionCard minion={minionToDelete} showButtons={false} />
      </ul>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel class="transition-all duration-300" disabled={$submittingDelete}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="transition-all duration-300"
        disabled={$submittingDelete}
        on:click={(e) => {
          e.preventDefault();
          submitDelete();
        }}>
        {#if !$submittingDelete}
          Delete
        {:else}
          <LoaderCircle class="h-4 w-4 animate-spin" />
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
