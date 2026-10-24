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
  const id = minecraftUser.id;

  // Image refresh must never block login: failures are logged and skipped.
  const fetchImage = async (url: string) => {
    const res = await fetch(url.replace(/^http:/, "https:"), { signal: AbortSignal.timeout(5000) });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`${res.status} ${res.headers.get("content-type")} from ${url}`);
    return Buffer.from(await res.arrayBuffer());
  };
  const upload = (folder: string, image: Buffer) => cloudinary.uploader.upload(`data:image/png;base64,${image.toString("base64")}`, { folder: `users/${folder}`, public_id: id, overwrite: true, resource_type: "image" });

  await Promise.all([
    fetchImage(textures.SKIN.url)
      .then((skin) => upload("skins", skin))
      .catch((e) => console.error(`Failed to update skin image for ${id}:`, e)),
    fetchImage(`https://nmsr.nickac.dev/headiso/${id}`)
      .then((avatar) => upload("avatars", avatar))
      .catch((e) => console.error(`Failed to update avatar image for ${id}:`, e)),
    textures.CAPE &&
      fetchImage(textures.CAPE.url)
        .then((cape) => upload("capes", cape))
        .catch((e) => console.error(`Failed to update cape image for ${id}:`, e))
  ]);

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
