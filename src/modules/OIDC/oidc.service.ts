import crypto from "node:crypto";
import APIError from "../../utils/APIError.js";
import { db } from "../../db/index.js";
import {
  appAccessTable,
  applicationTable,
  authorizationTable,
  userTable,
} from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateToken } from "../../utils/TokenUtils.js";
import { sanitizeUser } from "../../utils/ParameterSanitizer.js";
import { PRIVATE_KEY } from "../../utils/cert.js";
import { env } from "../../env.js";

class OIDCService {
  async getApplicationInformationService(clientId: string) {
    const [existingApplication] = await db
      .select({
        id: applicationTable.id,
        clientId: applicationTable.clientId,
        name: applicationTable.name,
        redirectURL: applicationTable.redirectURL,
        privacyPolicyURL: applicationTable.privacyPolicyURL,
      })
      .from(applicationTable)
      .where(eq(applicationTable.clientId, clientId))
      .limit(1);

    if (!existingApplication) {
      throw APIError.NotFound("Application not found or Invalid ClientId");
    }

    return existingApplication;
  }

  async getConsentInfoService(clientId: string, userId: string) {
    const [existingApplication] = await db
      .select()
      .from(applicationTable)
      .where(eq(applicationTable.clientId, clientId))
      .limit(1);

    if (!existingApplication) {
      throw APIError.NotFound("Application not found or Invalid ClientId");
    }

    const [consentInfo] = await db
      .select()
      .from(appAccessTable)
      .where(
        and(
          eq(appAccessTable.appId, existingApplication.id),
          eq(appAccessTable.userId, userId),
        ),
      )
      .limit(1);

    if (consentInfo && !consentInfo.revokedAt) {
      return { status: "consent_accepted" };
    }

    return { status: "consent_required" };
  }

  async acceptConsentService(clientId: string, userId: string) {
    const [existingApplication] = await db
      .select()
      .from(applicationTable)
      .where(eq(applicationTable.clientId, clientId))
      .limit(1);

    if (!existingApplication) {
      throw APIError.NotFound("Application not found or Invalid ClientId");
    }

    const rawCode = crypto.randomBytes(32).toString("hex");
    const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

    await db.insert(authorizationTable).values({
      ownerId: userId,
      applicationId: existingApplication.id,
      codeHash,
    });

    return { authCode: rawCode };
  }

  async verifyAuthTokenService(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ) {
    const [existingApplication] = await db
      .select()
      .from(applicationTable)
      .where(eq(applicationTable.clientId, clientId))
      .limit(1);

    if (!existingApplication) {
      throw APIError.NotFound("Application not found or Invalid ClientId");
    }

    // clientSecret is stored as a SHA-256 hash (see application.service.ts)
    const incomingSecretHash = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    if (incomingSecretHash !== existingApplication.clientSecret) {
      throw APIError.UnAuthorized("Invalid client credentials");
    }

    if (!existingApplication.redirectURL?.includes(redirectUri)) {
      throw APIError.BadRequest("Invalid redirect URI");
    }

    const incomingCodeHash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    const [authRecord] = await db
      .select()
      .from(authorizationTable)
      .where(
        and(
          eq(authorizationTable.applicationId, existingApplication.id),
          eq(authorizationTable.codeHash, incomingCodeHash),
        ),
      )
      .limit(1);

    if (!authRecord) {
      throw APIError.BadRequest("Invalid authorization code");
    }

    if (authRecord.usedAt) {
      throw APIError.BadRequest("Authorization code already used");
    }

    if (authRecord.expiresAt < new Date()) {
      throw APIError.BadRequest("Authorization code has expired");
    }

    await db
      .update(authorizationTable)
      .set({ usedAt: new Date() })
      .where(eq(authorizationTable.id, authRecord.id));

    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, authRecord.ownerId))
      .limit(1);

    if (!user) {
      throw APIError.NotFound("User not found");
    }

    const accessToken = generateToken("Access", {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    });

    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 12);

    const ISSUER = `http://localhost:${env.PORT}`;
    const idToken = jwt.sign(
      { sub: user.id, email: user.email, firstName: user.firstName },
      PRIVATE_KEY,
      { algorithm: "RS256", expiresIn: "1h", issuer: ISSUER, audience: existingApplication.clientId },
    );

    // Store or update the refresh token in appAccessTable
    const [existingConsent] = await db
      .select()
      .from(appAccessTable)
      .where(
        and(
          eq(appAccessTable.userId, user.id),
          eq(appAccessTable.appId, existingApplication.id),
        ),
      )
      .limit(1);

    if (existingConsent) {
      await db
        .update(appAccessTable)
        .set({
          refreshTokenHash,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
        })
        .where(eq(appAccessTable.id, existingConsent.id));
    } else {
      await db.insert(appAccessTable).values({
        userId: user.id,
        appId: existingApplication.id,
        refreshTokenHash,
      });
    }

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      idToken,
      user: sanitizeUser(user),
    };
  }

  async getUserInfoService(userId: string) {
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!user) {
      throw APIError.NotFound("User not found");
    }

    return sanitizeUser(user);
  }
}

export default OIDCService;
