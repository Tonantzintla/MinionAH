import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from "$env/static/private";
import { v2 as cloudinary } from "cloudinary";
import type { MinecraftProfile } from "./minecraft";

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

  const [skinResponse, avatarResponse, capeResponse] = await Promise.all([fetch(minecraftUser.properties[0].value.textures.SKIN.url), fetch(`https://mc-heads.net/head/${minecraftUser.id}`), minecraftUser.properties[0].value.textures.CAPE ? fetch(minecraftUser.properties[0].value.textures.CAPE.url) : null]);

  const [skinBuffer, avatarBuffer, capeBuffer] = await Promise.all([skinResponse.arrayBuffer(), avatarResponse.arrayBuffer(), capeResponse ? capeResponse.arrayBuffer() : null]);

  const cloudinaryRequests: Promise<unknown>[] = [];

  const skin = Buffer.from(skinBuffer).toString("base64");
  cloudinaryRequests.push(
    cloudinary.uploader.upload(`data:image/png;base64,${skin}`, {
      folder: `users/skins`,
      public_id: minecraftUser.id,
      overwrite: true,
      resource_type: "image"
    })
  );

  const avatar = Buffer.from(avatarBuffer).toString("base64");
  cloudinaryRequests.push(
    cloudinary.uploader.upload(`data:image/png;base64,${avatar}`, {
      folder: `users/avatars`,
      public_id: minecraftUser.id,
      overwrite: true,
      resource_type: "image"
    })
  );

  let cape: string | null;
  if (capeBuffer) {
    cape = Buffer.from(capeBuffer).toString("base64");
    cloudinaryRequests.push(
      cloudinary.uploader.upload(`data:image/png;base64,${cape}`, {
        folder: `users/capes`,
        public_id: minecraftUser.id,
        overwrite: true,
        resource_type: "image"
      })
    );
  } else {
    cape = null;
  }

  await Promise.all(cloudinaryRequests);

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
