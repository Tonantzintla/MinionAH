export type MinecraftUsernameProfile = {
  // https://minecraft.wiki/w/Mojang_API#Query_player's_UUID
  id: string; // UUID of the player
  name: string; // Name of the player, case sensitive
  legacy?: boolean;
  demo?: boolean;
};

export type MinecraftTextureData = {
  timestamp: number;
  profileId: string;
  profileName: string;
  signatureRequired?: boolean;
  textures: {
    SKIN: {
      url: string;
    };
    CAPE?: {
      url: string;
    };
  };
};

export type MinecraftProfile = {
  id: string;
  name: string;
  properties: {
    name: string;
    value: MinecraftTextureData;
    signature?: string;
  }[];
  profileActions?: string[];
  legacy?: boolean;
};

export function normalizeMinecraftUuid(uuid: string) {
  return uuid.replace(/-/g, "").toLowerCase();
}

export async function getMinecraftUserByUsername(username: string): Promise<MinecraftUsernameProfile> {
  const normalizedUsername = username.toLowerCase();

  try {
    const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${normalizedUsername}`);
    if (!response.ok) {
      throw new Error(`Mojang API returned ${response.status}`);
    }

    const data = (await response.json()) as MinecraftUsernameProfile;
    return {
      ...data,
      id: normalizeMinecraftUuid(data.id)
    };
  } catch {
    const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${normalizedUsername}`);
    if (!response.ok) {
      throw new Error(`Minecraft Services API returned ${response.status}`);
    }

    const data = (await response.json()) as MinecraftUsernameProfile;
    return {
      ...data,
      id: normalizeMinecraftUuid(data.id)
    };
  }
}

export async function getMinecraftInfo(uuid: string): Promise<MinecraftProfile> {
  const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${normalizeMinecraftUuid(uuid)}`, {
    method: "GET"
  });
  return await parseMinecraftProfile(res);
}

export async function parseMinecraftProfile(res: Response): Promise<MinecraftProfile> {
  if (res.status !== 200) {
    console.error(res.status, res.statusText);
    throw new Error("Error getting MC profile");
  }

  const body = await res.json();
  const data = body.profile ?? body;
  const properties = data.properties;

  if (!properties?.length || !properties[0]?.value) {
    throw new Error("Invalid Minecraft profile response");
  }

  const propertiesValueJSON = JSON.parse(Buffer.from(properties[0].value, "base64").toString("utf-8")) as MinecraftTextureData;

  return {
    id: normalizeMinecraftUuid(data.id),
    name: data.name,
    properties: [
      {
        name: properties[0].name,
        value: propertiesValueJSON,
        signature: properties[0].signature
      }
    ],
    profileActions: data.profileActions,
    legacy: data.legacy
  };
}
