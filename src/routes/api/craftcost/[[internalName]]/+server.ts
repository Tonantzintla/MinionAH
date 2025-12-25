import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface Item {
  [key: string]: {
    name: string;
    recipe?: {
      A1?: string;
      A2?: string;
      A3?: string;
      B1?: string;
      B2?: string;
      B3?: string;
      C1?: string;
      C2?: string;
      C3?: string;
      count?: number;
    };
    wiki: string[];
  };
}
interface RecipeCost {
  [key: string]: number | undefined;
}

let allItems;
let allItemPrices = {} as Record<string, number>;
const nameMappingsUrl = "https://raw.githubusercontent.com/DarthGigi/MinionAH-NotEnoughUpdates-REPO/refs/heads/master/recipes/recipes.json";
try {
  const [itemsResponse, itemsPriceResponse, skyhelperPricesResponse] = await Promise.all([fetch(nameMappingsUrl), fetch(`https://api.hypixel.net/v2/skyblock/bazaar`), fetch(`https://raw.githubusercontent.com/SkyHelperBot/Prices/refs/heads/main/pricesV2.json`)]);

  allItems = await itemsResponse.json();
  const allItemPricesJson = await itemsPriceResponse.json();
  for (const [id, data] of Object.entries(allItemPricesJson.products as Record<string, { quick_status: { buyPrice: number } }>)) {
    allItemPrices[id] = data.quick_status.buyPrice;
  }

  const skyhelperPricesJson = await skyhelperPricesResponse.json();
  for (const [id, data] of Object.entries(skyhelperPricesJson as Record<string, number>)) {
    allItemPrices[id] ??= data;
  }
} catch (e) {
  console.error("Failed to fetch data:", e);
  error(500, "Failed to fetch data");
}

const recipeCost: Record<string, number> = {};

const getRecipeCost = (recipeId: string, recipeIngredients: Item["recipe"]) => {
  let cost = 0;
  for (const [key, value] of Object.entries(recipeIngredients)) {
    const recipeString = value.toString();
    if (recipeString.length === 0 || key === "count") {
      continue;
    }

    const itemRecipeAmount = recipeIngredients.recipe?.count ?? 1;
    const [id, currAmount] = recipeString.split(";") as [string, string];
    const amount = isNaN(parseInt(currAmount)) ? 1 : parseInt(currAmount);

    const itemPrice = allItemPrices[id] ?? 0;
    if (id === "SKYBLOCK_COIN") {
      cost += amount * itemRecipeAmount;
    } else if (itemPrice && amount) {
      cost += itemPrice * amount * itemRecipeAmount;
    } else {
      const itemRecipe = allItems[id];
      if (
        itemRecipe &&
        !Object.values(itemRecipe.recipe)
          .filter((x: any) => x.toString().length > 1)
          .every((x) => x === recipeId)
      ) {
        const recipeCost = getRecipeCost(id, itemRecipe.recipe);
        cost += recipeCost * amount * itemRecipeAmount;
      }
    }
  }

  recipeCost[recipeId] = Math.floor(cost);

  return Math.floor(cost);
};

const getAllRecipeCost = (itemsSet: Record<string, Item>) => {
  const recipeCost: RecipeCost = {};

  for (const [item, data] of Object.entries(itemsSet)) {
    recipeCost[item] = getRecipeCost(item, data.recipe);
  }

  const sorted = Object.fromEntries(Object.entries(recipeCost).sort());
  return sorted;
};

export const GET: RequestHandler = async ({ params }) => {
  // Extract the internalName from the request parameters
  const { internalName } = params;

  // Initialize a variable to hold the filter to be applied
  let applyFilter: string | undefined = undefined;

  // If the internalName is "minions", set the filter to "GENERATOR"
  if (internalName === "minions") {
    applyFilter = "_GENERATOR";
  } else {
    // Otherwise, set the filter to the internalName
    applyFilter = internalName;
  }

  try {
    // Create a new items object, filtering the keys of allItems based on the applyFilter
    // and reducing to a new object with the filtered keys and their corresponding values
    const items: Record<string, Item> = Object.keys(allItems)
      .filter((key: string) => (applyFilter ? (applyFilter === "_GENERATOR" ? key.includes(applyFilter) : key === applyFilter) : true))
      .reduce((acc: Record<string, Item>, key: string) => {
        acc[key] = allItems[key];
        return acc;
      }, {});

    // Get the cost of all recipes for the filtered items
    let item = getAllRecipeCost(items);

    // If the item object is empty, return a 404 response with an error message
    if (Object.keys(item).length === 0) {
      return json(
        { error: `Item not found`, message: `The item '${internalName}' was not found. Please check 'recipes.json' for a list of all Hypixel Skyblock items. Consult the documentation for more information: https://minionah.com/api/craftcost/docs.`, item: internalName, url: nameMappingsUrl },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Cache-Control": "max-age=3600"
          },
          status: 404,
          statusText: "Item not found"
        }
      );
    }

    if (internalName === "minions") {
      // Sort and restructurt the items object
      item = Object.keys(item)
        // Sort the keys of the items object
        .sort((a, b) => {
          // Split each key into parts by underscore
          const splitA = a.split("_");
          const splitB = b.split("_");
          // Join all parts except the last one to get the type of minion
          const typeA = splitA.slice(0, -1).join("_");
          const typeB = splitB.slice(0, -1).join("_");
          // Parse the last part of each key to get the number of the minion
          const numA = parseInt(splitA.pop() as string);
          const numB = parseInt(splitB.pop() as string);

          // Compare the types of minions. If they are different, sort by type
          if (typeA < typeB) return -1;
          if (typeA > typeB) return 1;
          // If the types are the same, sort by number
          return numA - numB;
        })
        // Reduce the sorted keys into a new object with the same structure as minionPrices
        .reduce((acc: { [key: string]: number }, key: string) => {
          // Add each key-value pair to the accumulator object
          acc[key] = item[key] ?? 0;
          // Return the accumulator for the next iteration
          return acc;
        }, {});
    }

    // If the item object is not empty, return a 200 response with the item data
    return json(item, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "max-age=3600"
      },
      status: 200,
      statusText: "OK"
    });
  } catch (e) {
    // If an error occurs, log the error and return a 500 response with an error message
    console.error("Something went wrong", e);
    return json(
      { error: "Something went wrong" },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Cache-Control": "max-age=3600"
        },
        status: 500,
        statusText: "Internal Server Error"
      }
    );
  }
};
