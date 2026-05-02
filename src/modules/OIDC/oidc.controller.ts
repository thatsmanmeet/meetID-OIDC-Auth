import type { Request, Response } from "express";
import OIDCService from "./oidc.service.js";
import APIError from "../../utils/APIError.js";
import APIResponse from "../../utils/APIResponse.js";
import {
  ApplicationInfoPayload,
  AuthenticateQueryPayload,
  ConsentQueryPayload,
  TokenExchangePayload,
  UserFromParamsPayload,
} from "./oidc.validation.js";

class OIDCController {
  private oidcService = new OIDCService();

  public async handleGetApplicationInfo(req: Request, res: Response) {
    const validatedPayload = await ApplicationInfoPayload.safeParseAsync(
      req.query,
    );

    if (!validatedPayload.success) {
      throw APIError.BadRequest("ClientId not present");
    }

    const application = await this.oidcService.getApplicationInformationService(
      validatedPayload.data.clientId,
    );

    return APIResponse.Ok(res, "Application Details Fetched", application);
  }

  public async handleAuthenticate(req: Request, res: Response) {
    const validatedQuery = await AuthenticateQueryPayload.safeParseAsync(
      req.query,
    );

    if (!validatedQuery.success) {
      throw APIError.BadRequest("Invalid query parameters");
    }

    const validatedUser = await UserFromParamsPayload.safeParseAsync(req.user);

    if (!validatedUser.success) {
      throw APIError.UnAuthorized("You are not logged in");
    }

    const { clientId, redirectUri, state } = validatedQuery.data;

    const consentInfo = await this.oidcService.getConsentInfoService(
      clientId,
      validatedUser.data.id,
    );

    if (consentInfo.status === "consent_accepted") {
      const { authCode } = await this.oidcService.acceptConsentService(
        clientId,
        validatedUser.data.id,
      );

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("code", authCode);
      if (state) redirectUrl.searchParams.set("state", state);

      return res.redirect(redirectUrl.toString());
    }

    // Consent not yet given — return app info so frontend can show the consent screen
    const application = await this.oidcService.getApplicationInformationService(
      clientId,
    );

    return APIResponse.Ok(res, "Consent Required", {
      consentRequired: true,
      application,
    });
  }

  public async handleAcceptConsent(req: Request, res: Response) {
    const validatedUser = await UserFromParamsPayload.safeParseAsync(req.user);

    if (!validatedUser.success) {
      throw APIError.UnAuthorized("You are not logged in");
    }

    const validatedQuery = await ConsentQueryPayload.safeParseAsync(req.query);

    if (!validatedQuery.success) {
      throw APIError.BadRequest("Invalid query parameters");
    }

    const { clientId, redirectUri, state } = validatedQuery.data;

    const { authCode } = await this.oidcService.acceptConsentService(
      clientId,
      validatedUser.data.id,
    );

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", authCode);
    if (state) redirectUrl.searchParams.set("state", state);

    return res.redirect(redirectUrl.toString());
  }

  public async handleVerifyAuthCode(req: Request, res: Response) {
    const validatedPayload = await TokenExchangePayload.safeParseAsync(
      req.body,
    );

    if (!validatedPayload.success) {
      throw APIError.BadRequest("Invalid token exchange payload");
    }

    const { clientId, clientSecret, code, redirectUri } = validatedPayload.data;

    const tokens = await this.oidcService.verifyAuthTokenService(
      clientId,
      clientSecret,
      code,
      redirectUri,
    );

    return APIResponse.Ok(res, "Token Exchange Successful", tokens);
  }

  public async handleGetUserInfo(req: Request, res: Response) {
    const validatedUser = await UserFromParamsPayload.safeParseAsync(req.user);

    if (!validatedUser.success) {
      throw APIError.UnAuthorized("You are not logged in");
    }

    const user = await this.oidcService.getUserInfoService(
      validatedUser.data.id,
    );

    return APIResponse.Ok(res, "User Info Fetched", user);
  }
}

export default OIDCController;
