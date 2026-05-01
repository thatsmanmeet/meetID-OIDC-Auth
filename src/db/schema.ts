import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

// !  This is for the user logging into my platform to create and manage their applications.
export const userTable = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }),
  avatar: text(),
  email: varchar("email", { length: 322 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }),
  password: varchar("password", { length: 72 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verifyUserEmailTable = pgTable("verify_user_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  emailCode: varchar("email_code", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at")
    .notNull()
    .$default(() => new Date(Date.now() + FIVE_MINUTES_MS))
    .$onUpdate(() => new Date(Date.now() + FIVE_MINUTES_MS)),
});

// ! this table is for creating applications that would be given access to using the Oauth 2
export const applicationTable = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  clientId: varchar("client_id", { length: 100 }).unique().notNull(),
  clientSecret: varchar("client_secret", { length: 255 }).notNull(),

  redirectURL: text("redirect_urls").array().default([]),
  privacyPolicyURL: text("privacy_policy_url"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ! This table will handle the auth short code for the applications
export const authorizationTable = pgTable("authorization", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applicationTable.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 255 }).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at")
    .notNull()
    .$default(() => new Date(Date.now() + FIVE_MINUTES_MS))
    .$onUpdate(() => new Date(Date.now() + FIVE_MINUTES_MS)),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ! This table will store the apps which have access to, along with refresh token

export const appAccessTable = pgTable("app_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  appId: uuid("app_id")
    .notNull()
    .references(() => applicationTable.id, { onDelete: "cascade" }),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at")
    .notNull()
    .$default(() => new Date(Date.now() + 30 * 24 * 60 * 60_000)),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
