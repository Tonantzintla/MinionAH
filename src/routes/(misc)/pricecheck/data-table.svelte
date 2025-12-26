<script lang="ts">
  import type { Minion } from "$generated/prisma";
  import MinionsListBox from "$lib/components/MinionsListBox.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Table from "$lib/components/ui/table";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { formatNumber } from "$lib/utilities";
  import { cn } from "$lib/utils";
  import ArrowDown01 from "lucide-svelte/icons/arrow-down-0-1";
  import ArrowDown10 from "lucide-svelte/icons/arrow-down-1-0";
  import ArrowDownAZ from "lucide-svelte/icons/arrow-down-a-z";
  import ArrowDownZA from "lucide-svelte/icons/arrow-down-z-a";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import Funnel from "lucide-svelte/icons/funnel";
  import { createRender, createTable, Render, Subscribe } from "svelte-headless-table";
  import { addHiddenColumns, addPagination, addSortBy, addTableFilter } from "svelte-headless-table/plugins";
  import { readable } from "svelte/store";
  import DataTableActions from "./data-table-actions.svelte";
  import DataTableMinion from "./data-table-minion.svelte";
  import DataTableTier from "./data-table-tier.svelte";

  export let data: Minion[];

  const table = createTable(readable(data), {
    page: addPagination({
      initialPageSize: 12
    }),
    sort: addSortBy({
      disableMultiSort: true,
      initialSortKeys: [{ id: "generator", order: "desc" }]
    }),
    filter: addTableFilter({
      fn: ({ filterValue, value }: { filterValue: string; value: string }) => value.includes(filterValue)
    }),
    hide: addHiddenColumns({
      initialHiddenColumnIds: ["actions"]
    })
  });

  const columns = table.createColumns([
    table.column({
      accessor: "id",
      header: "Minion",
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      },
      cell: ({ row }) => {
        if (!row.isData()) return "";
        return createRender(DataTableMinion, { minion: row.original });
      }
    }),
    table.column({
      accessor: "generator",
      header: "Type"
    }),
    table.column({
      accessor: "generator_tier",
      header: "Tier",
      plugins: {
        filter: {
          exclude: true
        }
      },
      cell: ({ value }) => {
        return createRender(DataTableTier, { tier: value });
      }
    }),
    table.column({
      accessor: "craftCost",
      header: "Craft cost",
      plugins: {
        filter: {
          exclude: true
        }
      },
      cell: ({ value }) => formatNumber(value)
    }),
    table.column({
      id: "actions",
      accessor: ({ id }) => id,
      header: "Actions",
      cell: ({ value }) => {
        return createRender(DataTableActions, { minion: data.find((minion) => minion.id === value) });
      },
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    })
  ]);

  const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, flatColumns } = table.createViewModel(columns);

  const { hasNextPage, hasPreviousPage, pageIndex, pageCount, pageSize } = pluginStates.page;

  const { filterValue } = pluginStates.filter;

  const { hiddenColumnIds } = pluginStates.hide;

  const { sortKeys } = pluginStates.sort;

  const ids = flatColumns.map((col) => col.id);
  let hideForId = Object.fromEntries(ids.map((id) => [id, true]));

  $: $hiddenColumnIds = Object.entries(hideForId)
    .filter(([, hide]) => !hide)
    .map(([id]) => id);

  filterValue.subscribe((value) => {
    if (value === "") {
      $sortKeys = [];
    } else {
      $sortKeys = [{ id: "generator_tier", order: "asc" }];
    }
  });

  const hidableCols: string[] = ["generator_tier", "actions"];
</script>

<div>
  <div class="flex items-center py-4">
    <MinionsListBox
      minionTypes={data.filter((value, index, self) => self.findIndex((v) => v.generator === value.generator) === index).sort((a, b) => a.generator.localeCompare(b.generator))}
      showReset={true}
      on:onSelect={({ detail }) => {
        filterValue.set(detail.generator);
      }}
      on:onReset={() => {
        filterValue.set("");
      }} />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <Button variant="outline" class="ml-auto" builders={[builder]}>
          Columns <ChevronDown class="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="border-border bg-popover">
        {#each flatColumns as col}
          {#if hidableCols.includes(col.id)}
            <DropdownMenu.CheckboxItem bind:checked={hideForId[col.id]}>
              {col.header}
            </DropdownMenu.CheckboxItem>
          {/if}
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
  <div class="overflow-hidden rounded-md border border-border">
    <Table.Root {...$tableAttrs}>
      <Table.Header class="bg-transparent">
        {#each $headerRows as headerRow}
          <Subscribe rowAttrs={headerRow.attrs()}>
            <Table.Row class="rounded-lg border-border bg-muted hover:bg-muted">
              {#each headerRow.cells as cell (cell.id)}
                <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                  <Table.Head {...attrs}>
                    {#if props.sort.disabled}
                      <div class="px-4">
                        <Render of={cell.render()} />
                      </div>
                    {:else}
                      <Button variant="ghost" class="hover:bg-background" on:click={props.sort.toggle}>
                        <Render of={cell.render()} />
                        {#if cell.id === "generator"}
                          {#if props.sort.order === "desc"}
                            <ArrowDownZA class="ml-2 h-4 w-4" />
                          {:else if props.sort.order === "asc"}
                            <ArrowDownAZ class="ml-2 h-4 w-4" />
                          {:else}
                            <Funnel class="ml-2 h-4 w-4" />
                          {/if}
                        {:else if cell.id === "craftCost" || cell.id === "generator_tier"}
                          {#if props.sort.order === "desc"}
                            <ArrowDown10 class="ml-2 h-4 w-4" />
                          {:else if props.sort.order === "asc"}
                            <ArrowDown01 class="ml-2 h-4 w-4" />
                          {:else}
                            <Funnel class="ml-2 h-4 w-4" />
                          {/if}
                        {:else}
                          <Funnel class="ml-2 h-4 w-4" />
                        {/if}
                      </Button>
                    {/if}
                  </Table.Head>
                </Subscribe>
              {/each}
            </Table.Row>
          </Subscribe>
        {/each}
      </Table.Header>
      <Table.Body {...$tableBodyAttrs}>
        {#each $pageRows as row (row.id)}
          <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
            <Table.Row {...rowAttrs} class="border-border bg-muted transition-colors duration-300 hover:bg-background">
              {#each row.cells as cell (cell.id)}
                <Subscribe attrs={cell.attrs()} let:attrs>
                  <Table.Cell {...attrs}>
                    <div class={cn("px-4", cell.id === "id" && "w-96", cell.id === "generator" && "w-56")}>
                      {#if cell.id === "craftCost"}
                        <div class="contents text-[#FEAB00]">
                          <Render of={cell.render()} />
                        </div>
                      {:else}
                        <Render of={cell.render()} />
                      {/if}
                    </div>
                  </Table.Cell>
                </Subscribe>
              {/each}
            </Table.Row>
          </Subscribe>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <div class="flex items-center justify-between py-4">
    <Button variant="outline" size="sm" on:click={() => ($pageIndex = $pageIndex - 1)} disabled={!$hasPreviousPage}>Previous</Button>
    <Tooltip.Root openDelay={0} closeDelay={0}>
      <Tooltip.Trigger class="text-center text-sm text-muted-foreground">
        Page {$pageIndex + 1} of {$pageCount}
      </Tooltip.Trigger>
      <Tooltip.Content class="border-border bg-popover">
        <p>
          Showing
          {$pageIndex * $pageSize + 1}
          to
          {Math.min(($pageIndex + 1) * $pageSize, data.length)}
          of
          {data.length}
          minions
        </p>
      </Tooltip.Content>
    </Tooltip.Root>

    <Button variant="outline" size="sm" disabled={!$hasNextPage} on:click={() => ($pageIndex = $pageIndex + 1)}>Next</Button>
  </div>
</div>
