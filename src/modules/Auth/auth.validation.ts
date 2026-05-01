import z from "zod";

export const registerPayload = z.object({
  firstName: z.string().max(50).min(1).trim().describe("First Name of user"),
  lastName: z
    .string()
    .max(50)
    .min(1)
    .trim()
    .optional()
    .describe("Last name of the user"),
  email: z.email().toLowerCase().trim().describe("Email of the user"),
  password: z.string().min(8).describe("Password of the user"),
  confirmPassword: z.string().min(8).describe("Confirm Password of the user"),
});

export const loginPayload = z.object({
  email: z.email().toLowerCase().trim().describe("Email of the user"),
  password: z.string().min(8),
});

export const logoutPayload = z.object({
  id: z.string(),
});

export const refreshTokenPayload = z.object({
  refreshToken: z.string().min(1),
});
