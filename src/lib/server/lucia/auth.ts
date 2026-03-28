import type { Session, User } from "$generated/prisma";
import prisma from "$lib/server/prisma";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(token: string, userId: string): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  };
  await prisma.session.create({
    data: session
  });
  return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await prisma.session.findUnique({
    where: {
      id: sessionId
    },
    include: {
      user: {
        include: {
          _count: {
            select: {
              chatsAsUser1: {
                where: {
                  user1Read: false
                }
              },
              chatsAsUser2: {
                where: {
                  user2Read: false
                }
              },
              key: {
                //where id starts with username:
                where: {
                  id: {
                    startsWith: "username:"
                  },
                  hashed_password: {
                    equals: null
                  }
                }
              }
            }
          },
          settings: {
            include: {
              profileSettings: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (result === null) {
    return { session: null, user: null };
  }

  const { user, ...session } = result;

  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }

  const prismaPromises: Promise<unknown>[] = [];

  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    prismaPromises.push(
      prisma.session.update({
        where: {
          id: session.id
        },
        data: {
          expiresAt: session.expiresAt
        }
      })
    );
  }

  // if the time difference is more than an hour, update the loggedInAt time
  const timeDifference = new Date().getTime() - user.loggedInAt.getTime();
  if (timeDifference > 3600000) {
    prismaPromises.push(
      prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          loggedInAt: new Date()
        }
      })
    );
  }

  await Promise.all(prismaPromises);

  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({
    where: {
      id: sessionId
    }
  });
}

export type SessionValidationResult =
  | {
      session: Session;
      user: User & {
        _count: {
          chatsAsUser1: number;
          chatsAsUser2: number;
          key: number;
        };
        settings: {
          profileSettings: {
            email: string | null;
          } | null;
        } | null;
      };
    }
  | { session: null; user: null };
