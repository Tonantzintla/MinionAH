import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

type Minion = {
  [x: string]: any;
  material: string;
  durability: number;
  skin?: {
    value: "string";
    signature: "string";
  };
  name: string;
  generator: string;
  generator_tier: number;
  tier: string;
  id: string;
};

export const GET: RequestHandler = async () => {
  const itemsList = await fetch("https://api.hypixel.net/v2/resources/skyblock/items");
  const itemsJson = await itemsList.json();
  const items = itemsJson.items;

  // convert to array so we can use .filter
  const itemsArray = Object.values(items);

  // Filter items so that only minions are returned, only minions have generator_tier
  const minions = itemsArray.filter((item: any) => item.generator_tier) as Minion[];

  // Sort minions first by name, then by tier so that the order is correct
  minions.sort((a: any, b: any) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;

    if (a.generator_tier < b.generator_tier) return -1;
    if (a.generator_tier > b.generator_tier) return 1;

    return 0;
  });

  minions.forEach((minion) => {
    if (!minion.skin) return;

    const skin = JSON.parse(Buffer.from(minion.skin.value, "base64").toString("utf-8"));
    const texture = skin.textures.SKIN.url;
    const textureId = texture.split("/").pop();

    minion.texture = textureId;

    delete minion.skin;
  });

  // For local debugging, get all the types of minions currently in the database and compare it to the fetched minions, show which minions are missing/newly added

  const existingMinionsList = await prisma.minion.findMany();
  const existingMinionNames = existingMinionsList.map((minion) => minion.name);
  const fetchedMinionNames = minions.map((minion) => minion.name);
  const missingMinions = existingMinionNames.filter((name) => !fetchedMinionNames.includes(name));
  const newMinions = fetchedMinionNames.filter((name) => !existingMinionNames.includes(name));

  console.log("Missing minions:", missingMinions);
  console.log("New minions:", newMinions);

  // give back a .json file
  return json(minions);
};
