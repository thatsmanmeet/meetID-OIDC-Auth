import express from "express";
import AuthController from "./auth.controller.js";
import { RestrictToAuthenticatedUser } from "../../middlewares/auth.middleware.js";

const router = express.Router();
const authController = new AuthController();

router.post("/register", authController.handleSignUp.bind(authController));
router.post("/login", authController.handleLogin.bind(authController));
router.post(
  "/logout",
  RestrictToAuthenticatedUser(),
  authController.handleLogout.bind(authController),
);
router.post(
  "/refresh-token",
  authController.handleRefreshToken.bind(authController),
);

export default router;
