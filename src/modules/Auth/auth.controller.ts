import type { Request, Response } from "express";
import AuthService from "./auth.service.js";
import {
  loginPayload,
  logoutPayload,
  refreshTokenPayload,
  registerPayload,
} from "./auth.validation.js";
import APIError from "../../utils/APIError.js";
import APIResponse from "../../utils/APIResponse.js";
import { cookieOptions } from "../../constants.js";

class AuthController {
  private authService = new AuthService();

  public async handleSignUp(req: Request, res: Response) {
    const validatedPayload = await registerPayload.safeParseAsync(req.body);

    if (!validatedPayload.success) {
      throw APIError.BadRequest("Invalid Information Received!");
    }

    const user = await this.authService.handleRegisterService(
      validatedPayload.data,
    );

    // ! Also send the tokens in the cookies as well!

    res.cookie("accessToken", user.accessToken, cookieOptions);
    res.cookie("refreshToken", user.refreshToken, cookieOptions);

    return APIResponse.Created(res, "User created successfully!", user);
  }

  public async handleLogin(req: Request, res: Response) {
    const validatedPayload = await loginPayload.safeParseAsync(req.body);

    if (!validatedPayload.success) {
      throw APIError.BadRequest("Invalid Information Received");
    }

    const user = await this.authService.handleLoginService(
      validatedPayload.data,
    );

    // ! Also send the tokens in the cookies as well!

    res.cookie("accessToken", user.accessToken, cookieOptions);
    res.cookie("refreshToken", user.refreshToken, cookieOptions);

    return APIResponse.Ok(res, "Login Successful", user);
  }

  public async handleLogout(req: Request, res: Response) {
    const validatedPayload = await logoutPayload.parseAsync(req.user);

    if (!validatedPayload) {
      throw APIError.BadRequest("Invalid Information Received");
    }

    await this.authService.handleLogoutService(validatedPayload.id);

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return APIResponse.Ok(res, "User logged out");
  }

  public async handleRefreshToken(req: Request, res: Response) {
    const fromCookies = await refreshTokenPayload.safeParseAsync(req.cookies);
    const validatedPayload = fromCookies.success
      ? fromCookies
      : await refreshTokenPayload.safeParseAsync(req.headers);

    if (!validatedPayload.success) {
      throw APIError.BadRequest("Token not found");
    }

    const user = await this.authService.handleRefreshTokenService(
      validatedPayload.data.refreshToken,
    );

    res.cookie("refreshToken", user.refreshToken, cookieOptions);
    res.cookie("accessToken", user.accessToken, cookieOptions);
    return APIResponse.Ok(res, "Tokens Refreshed", user);
  }
}

export default AuthController;
