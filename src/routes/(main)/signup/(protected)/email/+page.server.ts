import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { formSchema } from "./schema";

export const load = (async ({ locals }) => {
  const schema = zod(formSchema as never);

  const profileSettings = await prisma.profileSettings.findFirst({
    where: {
      id: locals.user!.id
    },
    select: {
      email: true
    }
  });

  const superValidatedFormSchema = await superValidate(schema);
  (superValidatedFormSchema.data as { email: string }).email = profileSettings?.email ?? "";

  return {
    form: superValidatedFormSchema
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ locals, request }) => {
    const schema = zod(formSchema as never);
    const form = await superValidate(request, schema);

    if (!form.valid) return fail(400, { form });

    const email = (form.data as { email: string }).email;

    try {
      await prisma.userSettings.upsert({
        where: {
          user_id: locals.user!.id
        },
        create: {
          id: locals.user!.id,
          user_id: locals.user!.id,
          profileSettings: {
            create: {
              email,
              urls: []
            }
          }
        },
        update: {
          profileSettings: {
            upsert: {
              create: {
                email,
                urls: []
              },
              update: {
                email
              }
            }
          }
        }
      });
    } catch (error) {
      console.error(error);
      return message(
        form,
        { title: "Unable to save email", description: "We could not save your email due to a technical issue on our end. Please try again. <br/>If this issue keeps happening, please contact us." },
        {
          status: 500
        }
      );
    }

    redirect(302, "/profile");
  }
};
