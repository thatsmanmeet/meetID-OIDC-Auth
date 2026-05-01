import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type z from "zod";
import { db } from "../../db/index.js";
import { applicationTable } from "../../db/schema.js";
import APIError from "../../utils/APIError.js";
import type {
  createApplicationPayload,
  updateApplicationPayload,
} from "./application.validation.js";

class ApplicationService {
  async applicationSingleFetchService(id: string, ownerId: string) {
    const [app] = await db
      .select({
        id: applicationTable.id,
        clientId: applicationTable.clientId,
        redirectURL: applicationTable.redirectURL,
        privacyPolicyURL: applicationTable.privacyPolicyURL,
        name: applicationTable.name,
      })
      .from(applicationTable)
      .where(
        and(eq(applicationTable.id, id), eq(applicationTable.ownerId, ownerId)),
      );

    if (!app) throw APIError.NotFound("Application not found");
    return app;
  }

  async applicationFetchingService(ownerId: string) {
    return db
      .select({
        id: applicationTable.id,
        clientId: applicationTable.clientId,
        redirectURL: applicationTable.redirectURL,
        privacyPolicyURL: applicationTable.privacyPolicyURL,
        name: applicationTable.name,
      })
      .from(applicationTable)
      .where(eq(applicationTable.ownerId, ownerId));
  }

  async applicationCreationService(
    ownerId: string,
    data: z.infer<typeof createApplicationPayload>,
  ) {
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString("hex");
    const clientSecretHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    const [app] = await db
      .insert(applicationTable)
      .values({ ...data, clientId, clientSecret: clientSecretHash, ownerId })
      .returning();

    if (!app) throw APIError.InternalError("Failed to create application");
    return { ...app, clientSecret };
  }

  async applicationUpdateService(
    id: string,
    ownerId: string,
    data: z.infer<typeof updateApplicationPayload>,
  ) {
    const [app] = await db
      .update(applicationTable)
      .set(data)
      .where(
        and(eq(applicationTable.id, id), eq(applicationTable.ownerId, ownerId)),
      )
      .returning({
        id: applicationTable.id,
        clientId: applicationTable.clientId,
        name: applicationTable.name,
        redirectURL: applicationTable.redirectURL,
        privacyPolicyURL: applicationTable.privacyPolicyURL,
      });

    if (!app) throw APIError.NotFound("Application not found");
    return app;
  }

  async applicationDeletionService(id: string, ownerId: string) {
    const [app] = await db
      .delete(applicationTable)
      .where(
        and(eq(applicationTable.id, id), eq(applicationTable.ownerId, ownerId)),
      )
      .returning({ id: applicationTable.id });

    if (!app) throw APIError.NotFound("Application not found");
  }

  async applicationResetSecretService(id: string, ownerId: string) {
    const [app] = await db
      .select()
      .from(applicationTable)
      .where(
        and(eq(applicationTable.id, id), eq(applicationTable.ownerId, ownerId)),
      );

    if (!app) {
      throw APIError.NotFound("Application not found!");
    }

    const clientSecret = crypto.randomBytes(32).toString("hex");
    const hashedClientSecret = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    await db
      .update(applicationTable)
      .set({ clientSecret: hashedClientSecret })
      .where(eq(applicationTable.id, app.id));

    const { clientSecret: _, ...returnApp } = app;

    return { ...returnApp, clientSecret };
  }
}

export default ApplicationService;
