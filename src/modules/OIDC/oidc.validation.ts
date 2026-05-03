import { z } from "zod";

export const ApplicationInfoPayload = z.object({
  client_id: z.string().min(1).trim().describe("client id to be validated"),
});

export const UserFromParamsPayload = z.object({
  id: z.string().min(1).trim(),
  email: z.email().toLowerCase().trim().optional(),
  firstName: z.string().min(1).trim(),
});

export const AuthenticateQueryPayload = z.object({
  client_id: z.string().min(1).trim(),
});

export const ConsentQueryPayload = z.object({
  client_id: z.string().min(1).trim(),
  redirect_uri: z.string().min(1).trim(),
  state: z.string().min(1).trim().optional(),
});

export const TokenExchangePayload = z.object({
  client_id: z.string().min(1).trim(),
  client_secret: z.string().min(1).trim(),
  code: z.string().min(1).trim(),
  redirect_uri: z.string().min(1).trim(),
});
