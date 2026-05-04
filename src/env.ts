import "dotenv/config";
import { z } from "zod";
import colors from "colors";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8055),
  ACCESS_TOKEN: z.string().min(1, {
    message: "Access token is required and must be over 1 character",
  }),
  REFRESH_TOKEN: z.string().min(1, {
    message: "Refresh token is required and must be over 1 character",
  }),
  ACCESS_TOKEN_EXPIRY: z
    .string()
    .min(1, { message: "Access token expiry required" }),
  REFRESH_TOKEN_EXPIRY: z
    .string()
    .min(1, { message: "Refresh token expiry required" }),
  DATABASE_URL: z.url(),
  NODE_ENV: z
    .enum(["production", "development", "staging"])
    .default("development"),
  SERVER_URL: z.url().default("http://localhost:8055"),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.log("Invalid environment variables: \n".red);
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    console.log(`${path}: ${issue.message}`.yellow);
  });
  console.log("\n");
  process.exit(1);
}

export const env = result.data;
