import express from "express";
import OIDCController from "./oidc.controller.js";
import { RestrictToAuthenticatedUser } from "../../middlewares/auth.middleware.js";

const router = express.Router();
const oidcController = new OIDCController();

router.get(
  "/app-info",
  oidcController.handleGetApplicationInfo.bind(oidcController),
);
router.get(
  "/authenticate",
  RestrictToAuthenticatedUser(),
  oidcController.handleAuthenticate.bind(oidcController),
);
router.post(
  "/consent",
  RestrictToAuthenticatedUser(),
  oidcController.handleAcceptConsent.bind(oidcController),
);
router.post("/token", oidcController.handleVerifyAuthCode.bind(oidcController));
router.get(
  "/userinfo",
  RestrictToAuthenticatedUser(),
  oidcController.handleGetUserInfo.bind(oidcController),
);

export default router;
