import type { PrismaClient, Session, User } from "$generated/prisma";
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user:
        | (User & {
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
          })
        | null;
      session: Session | null;
      isProtectedRoute: boolean;
      isAdmin: boolean | undefined;
    }
    // interface PageData {}
    // interface Platform {}
  }
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

export {};
