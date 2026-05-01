import { eq } from "drizzle-orm";
import type z from "zod";
import { db } from "../../db/index.js";
import {
  appAccessTable,
  applicationTable,
  userTable,
} from "../../db/schema.js";
import APIError from "../../utils/APIError.js";
import type {
  updateAvatarPayload,
  updateProfilePayload,
} from "./user.validation.js";
import bcrypt from "bcryptjs";

const safeUserFields = {
  id: userTable.id,
  firstName: userTable.firstName,
  lastName: userTable.lastName,
  avatar: userTable.avatar,
  email: userTable.email,
  emailVerified: userTable.emailVerified,
  createdAt: userTable.createdAt,
  updatedAt: userTable.updatedAt,
};

class UserService {
  async getUserProfileService(userId: string) {
    const [user] = await db
      .select(safeUserFields)
      .from(userTable)
      .where(eq(userTable.id, userId));

    if (!user) throw APIError.NotFound("User not found");
    return user;
  }

  async updateProfileService(
    userId: string,
    data: z.infer<typeof updateProfilePayload>,
  ) {
    const payload: z.infer<typeof updateProfilePayload> = {};
    // first check if user sent password and confirm password or not
    if (data.oldPassword || data.password || data.confirmPassword) {
      if (!data.oldPassword || !data.password || !data.confirmPassword) {
        throw APIError.BadRequest("All password fields are required");
      }
      if (data.password !== data.confirmPassword) {
        throw APIError.BadRequest("Passwords don't match");
      }

      // need to validate old password
      const [existingUser] = await db
        .select({ password: userTable.password })
        .from(userTable)
        .where(eq(userTable.id, userId));

      if (!existingUser) {
        throw APIError.NotFound("User not found");
      }

      const isPasswordValid = await bcrypt.compare(
        data.oldPassword,
        existingUser.password,
      );

      if (!isPasswordValid) {
        throw APIError.UnAuthorized("Invalid Old Password");
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);

      payload.password = hashedPassword;
    }

    if (data.firstName) payload.firstName = data.firstName;
    if (data.lastName) payload.lastName = data.lastName;

    if (Object.keys(payload).length === 0) {
      throw APIError.BadRequest("Nothing to update");
    }

    const [user] = await db
      .update(userTable)
      .set(payload)
      .where(eq(userTable.id, userId))
      .returning(safeUserFields);

    if (!user) throw APIError.NotFound("User not found");
    return user;
  }

  async updateAvatarService(
    userId: string,
    data: z.infer<typeof updateAvatarPayload>,
  ) {
    // TODO: when implementing file upload, remove updateAvatarPayload from the controller
    // entirely — the file will arrive via req.file (multer), get uploaded to Cloudinary,
    // and the resulting URL passed directly to this method. req.body validation won't apply.
    const [user] = await db
      .update(userTable)
      .set(data)
      .where(eq(userTable.id, userId))
      .returning(safeUserFields);

    if (!user) throw APIError.NotFound("User not found");
    return user;
  }

  async getGrantedAppAccessService(userId: string) {
    return db
      .select({
        accessId: appAccessTable.id,
        appId: appAccessTable.appId,
        appName: applicationTable.name,
        clientId: applicationTable.clientId,
        redirectURL: applicationTable.redirectURL,
        privacyPolicyURL: applicationTable.privacyPolicyURL,
        grantedAt: appAccessTable.createdAt,
        expiresAt: appAccessTable.expiresAt,
        revokedAt: appAccessTable.revokedAt,
      })
      .from(appAccessTable)
      .innerJoin(
        applicationTable,
        eq(appAccessTable.appId, applicationTable.id),
      )
      .where(eq(appAccessTable.userId, userId));
  }
}

export default UserService;
