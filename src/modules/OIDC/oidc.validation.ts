import { z } from "zod";

export const ApplicationInfoPayload = z.object({
  clientId: z.string().min(1).trim().describe("client id to be validated"),
});

export const UserFromParamsPayload = z.object({
  id: z.string().min(1).trim(),
  email: z.email().toLowerCase().trim().optional(),
  firstName: z.string().min(1).trim(),
});

export const AuthenticateQueryPayload = z.object({
  clientId: z.string().min(1).trim(),
  redirectUri: z.url().trim(),
  state: z.string().min(1).trim().optional(),
});

export const ConsentQueryPayload = z.object({
  clientId: z.string().min(1).trim(),
  redirectUri: z.url().trim(),
  state: z.string().min(1).trim().optional(),
});

export const TokenExchangePayload = z.object({
  clientId: z.string().min(1).trim(),
  clientSecret: z.string().min(1).trim(),
  code: z.string().min(1).trim(),
  redirectUri: z.url().trim(),
});
