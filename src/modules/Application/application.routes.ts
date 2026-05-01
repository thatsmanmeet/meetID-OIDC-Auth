import express from "express";
import ApplicationController from "./application.controller.js";
import { RestrictToAuthenticatedUser } from "../../middlewares/auth.middleware.js";

const router = express.Router();
const applicationController = new ApplicationController();

router.get(
  "/",
  RestrictToAuthenticatedUser(),
  applicationController.handleGetAllApplications.bind(applicationController),
);
router.get(
  "/:id",
  RestrictToAuthenticatedUser(),
  applicationController.handleGetApplication.bind(applicationController),
);
router.post(
  "/",
  RestrictToAuthenticatedUser(),
  applicationController.handleCreateApplication.bind(applicationController),
);
router.put(
  "/:id",
  RestrictToAuthenticatedUser(),
  applicationController.handleUpdateApplication.bind(applicationController),
);
router.delete(
  "/:id",
  RestrictToAuthenticatedUser(),
  applicationController.handleDeleteApplication.bind(applicationController),
);
router.patch(
  "/:id/reset-secret",
  RestrictToAuthenticatedUser(),
  applicationController.handleClientSecretRefresh.bind(applicationController),
);

export default router;
