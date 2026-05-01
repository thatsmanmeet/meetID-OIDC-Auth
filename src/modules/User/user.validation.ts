import z from "zod";

export const updateProfilePayload = z.object({
  firstName: z.string().min(1).max(50).trim().optional().describe("First name"),
  lastName: z.string().min(1).max(50).trim().optional().describe("Last name"),
  oldPassword: z.string().min(8).optional().describe("Old Password"),
  password: z.string().min(8).optional().describe("Password"),
  confirmPassword: z.string().min(8).optional().describe("Confirm Password"),
});

export const updateAvatarPayload = z.object({
  avatar: z.url().describe("Avatar image URL"),
});

export const UserIDParamsPayload = z.object({
  id: z.string(),
  email: z.email().toLowerCase().trim().optional(),
  firstName: z.string().max(50).trim().optional(),
});
