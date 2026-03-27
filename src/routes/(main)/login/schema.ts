import { z } from "zod";

const username = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(16, "Username must be at most 16 characters")
  // minecraft username regex is /^[a-zA-Z0-9_]{3,16}$/
  .regex(/^[a-zA-Z0-9_]{3,16}$/, "Username must be 3-16 characters and only contain letters, numbers, and underscores");

const code = z.string().regex(/^\d{6}$/, {
  message: "Code must contain exactly 6 digits (e.g. 123456)"
});

export const loginFormSchema = z.object({
  username,
  "current-password": z.string().min(8, "Passwords are at least 8 characters")
});

export const mcLoginFormSchema = z.object({
  mcloginusername: username,
  logincode: code
});

export const signupFormSchema = z.object({
  mcusername: username,
  code
});

export type LoginFormSchema = typeof loginFormSchema;
export type McLoginFormSchema = typeof mcLoginFormSchema;
export type SignupFormSchema = typeof signupFormSchema;
