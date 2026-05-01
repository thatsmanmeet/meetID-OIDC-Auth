import express from "express";
import UserController from "./user.controller.js";
import { RestrictToAuthenticatedUser } from "../../middlewares/auth.middleware.js";

const router = express.Router();
const userController = new UserController();

router.get(
  "/me",
  RestrictToAuthenticatedUser(),
  userController.handleGetProfile.bind(userController),
);
router.patch(
  "/me",
  RestrictToAuthenticatedUser(),
  userController.handleUpdateProfile.bind(userController),
);
router.patch(
  "/me/avatar",
  RestrictToAuthenticatedUser(),
  userController.handleUpdateAvatar.bind(userController),
);
router.get(
  "/me/app-access",
  RestrictToAuthenticatedUser(),
  userController.handleGetGrantedAppAccess.bind(userController),
);

export default router;
