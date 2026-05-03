import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import AuthService from "../Auth/auth.service.js";
import ApplicationService from "../Application/application.service.js";
import UserService from "../User/user.service.js";
import OIDCService from "../OIDC/oidc.service.js";
import {
  requireAuth,
  requireGuest,
  flashMiddleware,
  setFlash,
} from "./views.middleware.js";
import { cookieOptions } from "../../constants.js";
import APIError from "../../utils/APIError.js";
import type { AppJwtPayload } from "../../utils/TokenUtils.js";
import { createApplicationPayload, updateApplicationPayload } from "../Application/application.validation.js";
import { registerPayload, loginPayload } from "../Auth/auth.validation.js";
import { updateProfilePayload, updateAvatarPayload } from "../User/user.validation.js";

const viewRouter = Router();

const authService = new AuthService();
const applicationService = new ApplicationService();
const userService = new UserService();
const oidcService = new OIDCService();

viewRouter.use(flashMiddleware());

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch((err: unknown) => {
      const message =
        err instanceof APIError ? err.message : "Something went wrong";
      const status = err instanceof APIError ? err.statusCode : 500;
      return res.status(status).render("error", {
        title: "Error",
        message,
        statusCode: status,
      });
    });
  };
}

function wrapForm(fallbackRedirect: string | ((req: Request) => string), fn: AsyncHandler) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      const message =
        err instanceof APIError ? err.message : "Something went wrong";
      setFlash(res, { type: "error", message });
      const target =
        typeof fallbackRedirect === "function"
          ? fallbackRedirect(req)
          : fallbackRedirect;
      return res.redirect(target);
    });
  };
}

function safeNextUrl(raw: unknown): string {
  if (typeof raw === "string" && raw.startsWith("/")) return raw;
  return "/dashboard";
}

// ─── Root redirect ────────────────────────────────────────────────────────────

viewRouter.get("/", (req: Request, res: Response) => {
  const token = req.cookies.accessToken as string | undefined;
  return res.redirect(token ? "/dashboard" : "/login");
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

viewRouter.get("/login", requireGuest(), (req: Request, res: Response) => {
  return res.render("auth/login", { title: "Sign In", next: req.query.next ?? "" });
});

viewRouter.post(
  "/login",
  requireGuest(),
  wrapForm("/login", async (req: Request, res: Response) => {
    const parsed = await loginPayload.safeParseAsync({
      email: req.body.email,
      password: req.body.password,
    });
    if (!parsed.success) {
      setFlash(res, { type: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" });
      return res.redirect("/login");
    }
    const user = await authService.handleLoginService(parsed.data);
    res.cookie("accessToken", user.accessToken, cookieOptions);
    res.cookie("refreshToken", user.refreshToken, cookieOptions);
    return res.redirect(safeNextUrl(req.query.next));
  }),
);

viewRouter.get("/signup", requireGuest(), (req: Request, res: Response) => {
  return res.render("auth/signup", { title: "Create Account" });
});

viewRouter.post(
  "/signup",
  requireGuest(),
  wrapForm("/signup", async (req: Request, res: Response) => {
    const parsed = await registerPayload.safeParseAsync({
      firstName: req.body.firstName,
      lastName: req.body.lastName || undefined,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
    });
    if (!parsed.success) {
      setFlash(res, { type: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" });
      return res.redirect("/signup");
    }
    const user = await authService.handleRegisterService(parsed.data);
    res.cookie("accessToken", user.accessToken, cookieOptions);
    res.cookie("refreshToken", user.refreshToken, cookieOptions);
    setFlash(res, { type: "success", message: `Welcome, ${user.firstName}!` });
    return res.redirect("/dashboard");
  }),
);

viewRouter.post("/logout", (req: Request, res: Response) => {
  const user = res.locals.user as AppJwtPayload | undefined;
  if (user) {
    authService.handleLogoutService(user.id).catch(() => {});
  }
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  return res.redirect("/login");
});

// ─── Dashboard / Applications ─────────────────────────────────────────────────

viewRouter.get(
  "/dashboard",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const apps = await applicationService.applicationFetchingService(user.id);
    return res.render("dashboard/apps", { title: "Applications", apps });
  }),
);

viewRouter.get(
  "/dashboard/apps/new",
  requireAuth(),
  (req: Request, res: Response) => {
    return res.render("dashboard/app-new", { title: "New Application" });
  },
);

viewRouter.post(
  "/dashboard/apps",
  requireAuth(),
  wrapForm("/dashboard/apps/new", async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const redirectURLRaw = (req.body.redirectURL as string) ?? "";
    const redirectURL = redirectURLRaw
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const parsed = await createApplicationPayload.safeParseAsync({
      name: req.body.name,
      redirectURL,
      privacyPolicyURL: req.body.privacyPolicyURL || undefined,
    });
    if (!parsed.success) {
      setFlash(res, { type: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" });
      return res.redirect("/dashboard/apps/new");
    }
    const app = await applicationService.applicationCreationService(user.id, parsed.data);
    setFlash(res, {
      type: "success",
      message: "Application created! Copy your client secret — it will not be shown again.",
      secret: app.clientSecret,
    });
    return res.redirect(`/dashboard/apps/${app.id}`);
  }),
);

viewRouter.get(
  "/dashboard/apps/:id",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const app = await applicationService.applicationSingleFetchService(String(req.params.id ?? ""), user.id);
    return res.render("dashboard/app-detail", { title: app.name, app });
  }),
);

viewRouter.post(
  "/dashboard/apps/:id/update",
  requireAuth(),
  wrapForm(
    (req) => `/dashboard/apps/${String(req.params.id ?? "")}`,
    async (req: Request, res: Response) => {
      const user = res.locals.user as AppJwtPayload;
      const appId = String(req.params.id ?? "");
      const redirectURLRaw = (req.body.redirectURL as string) ?? "";
      const redirectURL = redirectURLRaw
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const parsed = await updateApplicationPayload.safeParseAsync({
        name: req.body.name || undefined,
        redirectURL: redirectURL.length > 0 ? redirectURL : undefined,
        privacyPolicyURL: req.body.privacyPolicyURL || undefined,
      });
      if (!parsed.success) {
        setFlash(res, { type: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" });
        return res.redirect(`/dashboard/apps/${appId}`);
      }
      await applicationService.applicationUpdateService(appId, user.id, parsed.data);
      setFlash(res, { type: "success", message: "Application updated." });
      return res.redirect(`/dashboard/apps/${appId}`);
    },
  ),
);

viewRouter.post(
  "/dashboard/apps/:id/delete",
  requireAuth(),
  wrapForm("/dashboard", async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    await applicationService.applicationDeletionService(String(req.params.id ?? ""), user.id);
    setFlash(res, { type: "success", message: "Application deleted." });
    return res.redirect("/dashboard");
  }),
);

viewRouter.post(
  "/dashboard/apps/:id/reset-secret",
  requireAuth(),
  wrapForm(
    (req) => `/dashboard/apps/${String(req.params.id ?? "")}`,
    async (req: Request, res: Response) => {
      const user = res.locals.user as AppJwtPayload;
      const appId = String(req.params.id ?? "");
      const app = await applicationService.applicationResetSecretService(appId, user.id);
      setFlash(res, {
        type: "success",
        message: "Client secret has been reset. Copy it now — it will not be shown again.",
        secret: app.clientSecret,
      });
      return res.redirect(`/dashboard/apps/${appId}`);
    },
  ),
);

// ─── Profile ──────────────────────────────────────────────────────────────────

viewRouter.get(
  "/profile",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const profile = await userService.getUserProfileService(user.id);
    return res.render("profile/index", { title: "Profile", profile });
  }),
);

viewRouter.post(
  "/profile/update",
  requireAuth(),
  wrapForm("/profile", async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const raw: Record<string, string | undefined> = {};
    if (req.body.firstName) raw.firstName = req.body.firstName as string;
    if (req.body.lastName) raw.lastName = req.body.lastName as string;
    if (req.body.oldPassword) raw.oldPassword = req.body.oldPassword as string;
    if (req.body.password) raw.password = req.body.password as string;
    if (req.body.confirmPassword) raw.confirmPassword = req.body.confirmPassword as string;

    const parsed = await updateProfilePayload.safeParseAsync(raw);
    if (!parsed.success) {
      setFlash(res, { type: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" });
      return res.redirect("/profile");
    }
    await userService.updateProfileService(user.id, parsed.data);
    setFlash(res, { type: "success", message: "Profile updated successfully." });
    return res.redirect("/profile");
  }),
);

viewRouter.post(
  "/profile/avatar",
  requireAuth(),
  wrapForm("/profile", async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const parsed = await updateAvatarPayload.safeParseAsync({ avatar: req.body.avatar });
    if (!parsed.success) {
      setFlash(res, { type: "error", message: "Invalid avatar URL." });
      return res.redirect("/profile");
    }
    await userService.updateAvatarService(user.id, parsed.data);
    setFlash(res, { type: "success", message: "Avatar updated." });
    return res.redirect("/profile");
  }),
);

viewRouter.get(
  "/profile/consented-apps",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    const grantedApps = await userService.getGrantedAppAccessService(user.id);
    return res.render("profile/consented", { title: "Connected Apps", grantedApps });
  }),
);

viewRouter.post(
  "/profile/consented-apps/:id/revoke",
  requireAuth(),
  wrapForm("/profile/consented-apps", async (req: Request, res: Response) => {
    const user = res.locals.user as AppJwtPayload;
    await userService.revokeAppAccessService(String(req.params.id ?? ""), user.id);
    setFlash(res, { type: "success", message: "App access revoked." });
    return res.redirect("/profile/consented-apps");
  }),
);

// ─── OIDC Consent ─────────────────────────────────────────────────────────────

viewRouter.get(
  "/oidc/authorize",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const client_id = req.query.client_id as string | undefined;
    const redirect_uri = req.query.redirect_uri as string | undefined;
    const state = req.query.state as string | undefined;

    if (!client_id || !redirect_uri) {
      return res.status(400).render("error", {
        title: "Bad Request",
        message: "Missing required parameters: client_id and redirect_uri",
        statusCode: 400,
      });
    }

    const user = res.locals.user as AppJwtPayload;
    const consentInfo = await oidcService.getConsentInfoService(client_id, user.id);

    if (consentInfo.status === "consent_accepted") {
      const { authCode } = await oidcService.acceptConsentService(client_id, user.id);
      const params = new URLSearchParams({ code: authCode });
      if (state) params.set("state", state);
      return res.redirect(`${redirect_uri}?${params.toString()}`);
    }

    const application = await oidcService.getApplicationInformationService(client_id);
    const profile = await userService.getUserProfileService(user.id);
    return res.render("oidc/consent", {
      title: `Authorize ${application.name}`,
      application,
      profile,
      redirect_uri,
      state: state ?? "",
      client_id,
    });
  }),
);

viewRouter.post(
  "/oidc/authorize",
  requireAuth(),
  wrap(async (req: Request, res: Response) => {
    const { client_id, redirect_uri, state, action } = req.body as {
      client_id: string;
      redirect_uri: string;
      state?: string;
      action: string;
    };

    if (!client_id || !redirect_uri) {
      return res.status(400).render("error", {
        title: "Bad Request",
        message: "Missing required parameters.",
        statusCode: 400,
      });
    }

    if (action === "deny") {
      const params = new URLSearchParams({ error: "access_denied" });
      if (state) params.set("state", state);
      return res.redirect(`${redirect_uri}?${params.toString()}`);
    }

    const user = res.locals.user as AppJwtPayload;
    const { authCode } = await oidcService.acceptConsentService(client_id, user.id);
    const params = new URLSearchParams({ code: authCode });
    if (state) params.set("state", state);
    return res.redirect(`${redirect_uri}?${params.toString()}`);
  }),
);

export default viewRouter;
