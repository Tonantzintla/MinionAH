import { env as envPrivate } from "$env/dynamic/private";
import { v2 as cloudinary } from "cloudinary";
import type { MinecraftProfile } from "./minecraft";

const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = envPrivate;

export async function getMcAuthUser(minecraftUser: MinecraftProfile) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });

  const existingUser = await prisma.user.findFirst({
    where: {
      id: minecraftUser.id
    }
  });

  const textures = minecraftUser.properties[0].value.textures;
  const sources: [folder: string, url: string | undefined][] = [
    ["skins", textures.SKIN?.url.replace(/^http:/, "https:")],
    ["avatars", `https://mc-heads.net/head/${minecraftUser.id}`],
    ["capes", textures.CAPE?.url.replace(/^http:/, "https:")]
  ];

  // Image refresh must never block login: a bad upstream response (e.g. an HTML block page) is logged and skipped.
  await Promise.all(
    sources.map(async ([folder, url]) => {
      if (!url) return;
      try {
        const res = await fetch(url);
        if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`${res.status} ${res.headers.get("content-type")}`);
        const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
        await cloudinary.uploader.upload(`data:image/png;base64,${base64}`, { folder: `users/${folder}`, public_id: minecraftUser.id, overwrite: true, resource_type: "image" });
      } catch (e) {
        console.error(`Failed to update ${folder} image for ${minecraftUser.id} from ${url}:`, e);
      }
    })
  );

  if (existingUser) {
    // update user
    await prisma.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        username: minecraftUser.name
      }
    });
    return existingUser;
  }

  // create a new user if the user does not exist
  const user = await prisma.user.create({
    data: {
      id: minecraftUser.id,
      username: minecraftUser.name,
      createdAt: new Date(),
      loggedInAt: new Date(),
      key: {
        createMany: {
          data: [
            {
              id: `minecraft:${minecraftUser.id}`,
              hashed_password: null
            },
            {
              id: `username:${minecraftUser.name.toLocaleLowerCase()}`,
              hashed_password: null
            }
          ]
        }
      }
    }
  });
  return user;
}
