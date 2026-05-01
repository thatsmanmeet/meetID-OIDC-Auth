import type z from "zod";
import type { loginPayload, registerPayload } from "./auth.validation.js";
import APIError from "../../utils/APIError.js";
import { userTable } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../../utils/TokenUtils.js";
import { sanitizeUser } from "../../utils/ParameterSanitizer.js";

class AuthService {
  async handleRegisterService({
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
  }: z.infer<typeof registerPayload>) {
    // ! check for password matches
    if (password !== confirmPassword)
      throw APIError.BadRequest("Passwords doesn't match");

    // ! check if user already exists or not

    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    if (existingUser.length > 0) {
      throw APIError.Conflict("Email already in use!");
    }

    // ! Hash the password

    const hashedPassword = await bcrypt.hash(password, 12);

    // ! Insert the user in the DB

    const [newUser] = await db
      .insert(userTable)
      .values({
        firstName,
        lastName: lastName ?? null,
        email,
        password: hashedPassword,
      })
      .returning({
        id: userTable.id,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        avatar: userTable.avatar,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      });

    if (!newUser) {
      throw APIError.InternalError(
        "Something went wrong creating user account",
      );
    }

    // ! Create access and refresh tokens

    const accessToken = generateToken("Access", {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
    });

    const refreshToken = generateToken("Refresh", {
      id: newUser.id,
      email: newUser.email,
    });

    // ! Hash refresh token!
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await db
      .update(userTable)
      .set({ refreshTokenHash: hashedRefreshToken })
      .where(eq(userTable.id, newUser.id));

    // Return the information...

    return {
      ...newUser,
      accessToken,
      refreshToken,
    };
  }

  async handleLoginService({ email, password }: z.infer<typeof loginPayload>) {
    // ! check if user already exists or not

    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (!existingUser) {
      throw APIError.UnAuthorized("Invalid email or password");
    }

    // ! validate the password

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordValid) {
      throw APIError.UnAuthorized("Not a valid Email or Password combination");
    }

    // ! Create access and refresh tokens

    const accessToken = generateToken("Access", {
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
    });

    const refreshToken = generateToken("Refresh", {
      id: existingUser.id,
      email: existingUser.email,
    });

    // ! Hash refresh token!
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await db
      .update(userTable)
      .set({ refreshTokenHash: hashedRefreshToken })
      .where(eq(userTable.id, existingUser.id));

    const data = sanitizeUser(existingUser);

    // Return the information...

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  }

  async handleLogoutService(id: string) {
    // just fetch the id to reduce network load!
    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, id));

    if (!user) {
      throw APIError.NotFound("User not found");
    }

    await db
      .update(userTable)
      .set({ refreshTokenHash: null })
      .where(eq(userTable.id, user.id));

    return { success: true };
  }

  async handleRefreshTokenService(oldRefreshToken: string) {
    const decodedToken = verifyToken("Refresh", oldRefreshToken);

    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, decodedToken.id))
      .limit(1);

    if (!user) {
      throw APIError.NotFound("User not found with Associated Token");
    }

    if (!user.refreshTokenHash) {
      throw APIError.Conflict("Something went wrong! Login Required.");
    }

    // compare hash
    const isOldRefreshTokenValid = await bcrypt.compare(
      oldRefreshToken,
      user.refreshTokenHash!,
    );

    if (!isOldRefreshTokenValid) {
      throw APIError.Conflict("Tampered token found");
    }

    const refreshToken = generateToken("Refresh", {
      id: user.id,
      email: user.email,
    });
    const accessToken = generateToken("Access", {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    });

    // Rehashing...
    const newHashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    await db
      .update(userTable)
      .set({ refreshTokenHash: newHashedRefreshToken })
      .where(eq(userTable.id, user.id));

    const data = sanitizeUser(user);

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  }
}

export default AuthService;
