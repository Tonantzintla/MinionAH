import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "$env/static/private";
import type { Minion } from "$generated/prisma";
import { json } from "@sveltejs/kit";
import { v2 as cloudinary } from "cloudinary";
import type { RequestHandler } from "./$types";

interface MinionWithTexture extends Minion {
  texture?: string;
}

type TextureSuccess = {
  minionId: string;
  response: Response;
  error?: undefined;
};

type TextureError = {
  minionId: string;
  error: any;
  response?: undefined;
};

type TextureUpload = {
  minionId: string;
  base64: string;
};

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

async function fetchTextures(minions: MinionWithTexture[], type: "skin" | "head") {
  try {
    const realType = type === "head" ? "headiso" : "skin";
    const textureRequests = minions.map((minion) => ({
      minion,
      promise: () =>
        fetch(`https://nmsr.nickac.dev/${realType}/${minion.texture}?no=shadow`)
          .then((response): TextureSuccess => {
            // Check if the response indicates a valid account/texture
            const isValidTexture = response.headers.get("X-Nmsr-Fallback") !== "false";
            if (!isValidTexture) {
              throw new Error("Invalid texture - default Steve skin returned");
            }
            return {
              minionId: minion.id,
              response
            };
          })
          .catch((error): TextureError => {
            console.error(`Error fetching ${type} for ${minion.name}:`, error);
            return {
              minionId: minion.id,
              error
            };
          })
    }));

    const results = await Promise.allSettled(textureRequests.map((request) => request.promise()));

    const textureMap = new Map<string, Response>();

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const value = result.value;
        if (!("error" in value)) {
          textureMap.set(value.minionId, value.response);
          console.info(`Got ${type} for minion ${value.minionId}`);
        } else {
          console.error(`Failed to get ${type} for minion ${value.minionId}`);
        }
      } else {
        console.error(`Failed to get ${type} for minion: ${result.reason}`);
      }
    });

    return textureMap;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch textures");
  }
}

async function parseTexture(textureMap: Map<string, Response>) {
  try {
    const textureEntries = Array.from(textureMap.entries());
    const textureBuffers = await Promise.allSettled(
      textureEntries.map(async ([minionId, response]) => ({
        minionId,
        buffer: await response.arrayBuffer()
      }))
    );

    // Create a map to store base64 textures
    const textureBase64Map = new Map<string, string>();

    textureBuffers.forEach((result) => {
      if (result.status === "fulfilled") {
        const base64 = Buffer.from(result.value.buffer).toString("base64");
        textureBase64Map.set(result.value.minionId, base64);
      }
    });

    return textureBase64Map;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to parse textures");
  }
}

async function uploadTexture(textureMap: Map<string, string>, minions: Minion[], type: "skin" | "head") {
  try {
    // Create array of texture uploads with minion IDs
    const uploads: TextureUpload[] = minions
      .map((minion) => ({
        minionId: minion.id,
        base64: textureMap.get(minion.id) || ""
      }))
      .filter((upload) => upload.base64 !== "");

    const cloudinaryPromises = uploads.map(
      ({ minionId, base64 }) =>
        () =>
          cloudinary.uploader.upload(`data:image/png;base64,${base64}`, {
            folder: `minions/${type}`,
            public_id: minionId,
            overwrite: true,
            resource_type: "image"
          })
    );

    const cloudinaryResponse = await Promise.allSettled(cloudinaryPromises.map((promise) => promise()));

    cloudinaryResponse.forEach((response, index) => {
      const minion = minions.find((m) => m.id === uploads[index].minionId);
      if (!minion) return;

      if (response.status === "fulfilled") {
        // @ts-expect-error - Dynamic property assignment
        minion[type] = response.value.secure_url;
        console.info(`Uploaded ${type} for ${minion.name}`);
      } else {
        console.error(`Failed to upload ${type} for ${minion.name}`, response);
      }
    });
  } catch (e) {
    console.error(e);
    throw new Error("Failed to upload textures");
  }
}

export const PUT: RequestHandler = async ({ fetch, request }) => {
  const itemsList = await fetch("/api/internal/dashboard/minions/filter");
  const items = (await itemsList.json()) as Minion[];

  const maxTiers: { [key: string]: number } = {};

  items.forEach((minion, index) => {
    console.info(`Getting max tier for ${minion.name}`);
    if (!maxTiers[minion.generator] || minion.generator_tier > maxTiers[minion.generator]) {
      maxTiers[minion.generator] = minion.generator_tier;
    }
    console.info(`Got max tier for ${minion.name},\nprocessed ${index + 1}/${items.length}`);
  });

  items.forEach((minion, index) => {
    console.info(`Setting max tier for ${minion.name}`);
    minion.maxTier = maxTiers[minion.generator];
    console.info(`Set max tier for ${minion.name},\nprocessed ${index + 1}/${items.length}`);
  });

  async function fetchCraftCosts(minions: Minion[]) {
    try {
      console.info(`Getting craft costs for all minions`);
      const response = await fetch(`/api/craftcost/minions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const craftCosts = await response.json();
      minions.forEach((minion) => {
        console.info(`Setting craft cost for ${minion.id}`);
        minion.craftCost = craftCosts[minion.id];
        console.info(`Set craft cost for ${minion.id}: ${minion.craftCost}`);
      });
      console.info(`Got craft costs for all minions`);
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to get craft costs for all minions`);
    }
  }

  try {
    const heads = await fetchTextures(items, "head");
    const headsBase64 = await parseTexture(heads);
    await uploadTexture(headsBase64, items, "head");

    const skins = await fetchTextures(items, "skin");
    const skinsBase64 = await parseTexture(skins);
    await uploadTexture(skinsBase64, items, "skin");

    await fetchCraftCosts(items);

    const prismaPromises = items.map((minion) =>
      prisma.minion.upsert({
        where: { id: minion.id },
        update: {
          name: minion.name,
          generator: minion.generator,
          generator_tier: minion.generator_tier,
          maxTier: minion.maxTier,
          craftCost: minion.craftCost ?? 0
        },
        create: {
          id: minion.id,
          name: minion.name,
          generator: minion.generator,
          generator_tier: minion.generator_tier,
          maxTier: minion.maxTier,
          craftCost: minion.craftCost ?? 0
        }
      })
    );

    // Then perform the Prisma transaction
    await prisma.$transaction(prismaPromises);

    console.info("\n\nSuccessfully updated the database with minions");

    return json(
      { success: true, message: "Successfully updated the minions" },
      {
        status: 200,
        statusText: "Success"
      }
    );
  } catch (e) {
    console.error(e);
    return json(
      { success: false, message: "Failed to update the minions" },
      {
        status: 500,
        statusText: "Internal Server Error"
      }
    );
  }
};
