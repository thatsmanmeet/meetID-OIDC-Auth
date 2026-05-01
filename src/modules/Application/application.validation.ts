import z from "zod";

export const createApplicationPayload = z.object({
  name: z.string().min(1).max(100).trim().describe("Name of the application"),
  redirectURL: z
    .array(z.url())
    .optional()
    .default([])
    .describe("Allowed redirect URLs"),
  privacyPolicyURL: z.url().optional().describe("Privacy policy URL"),
});

export const ApplicationIDParamsPayload = z.object({
  id: z.string(),
});

export const UserIDParamsPayload = z.object({
  id: z.string(),
  email: z.email().toLowerCase().trim().optional(),
  firstName: z.string().max(50).trim().optional(),
});

export const updateApplicationPayload = createApplicationPayload.partial();
