import { z } from "zod";

export const formSchema = z.object({
  username: z.string().min(3).max(16).optional(),
  email: z.string().email("Please enter a valid email")
});

export type FormSchema = typeof formSchema;
