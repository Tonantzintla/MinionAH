import { hash, type Options } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { formSchema } from "./schema";

const hashOptions = {
  // recommended minimum parameters
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
} satisfies Options;

export const load = (async () => {
  const superValidatedFormSchema = await superValidate(zod(formSchema));

  return {
    form: superValidatedFormSchema
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ locals, request }) => {
    const form = await superValidate(request, zod(formSchema));

    if (!form.valid) return fail(400, { form });

    try {
      const key = await prisma.key.update({
        where: {
          id: `username:${locals.user!.username.toLowerCase()}`
        },
        data: {
          hashed_password: await hash(form.data["new-password"], hashOptions)
        },
        include: {
          user: true
        }
      });
      const user = key.user;
      if (!user || key.hashed_password === null) {
        console.error("Failed to create account");
        return message(
          form,
          { title: "Failed to create account", description: "We could not create your account due to a technical issue on our end. Please try again. <br/>If this issue keeps happening, please contact us." },
          {
            status: 400
          }
        );
      }
    } catch (error) {
      console.error(error);
      return message(
        form,
        { title: "Unable to create account", description: "We are unable to create your account due to a technical issue on our end. Please try again. <br/>If this issue keeps happening, please contact us." },
        {
          status: 500
        }
      );
    }

    redirect(302, "/signup/email");
  }
};
