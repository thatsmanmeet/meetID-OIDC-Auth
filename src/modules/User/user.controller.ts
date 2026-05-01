import type { Request, Response } from "express";
import UserService from "./user.service.js";
import {
  UserIDParamsPayload,
  updateAvatarPayload,
  updateProfilePayload,
} from "./user.validation.js";
import APIError from "../../utils/APIError.js";
import APIResponse from "../../utils/APIResponse.js";

class UserController {
  private userService = new UserService();

  public async handleGetProfile(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const user = await this.userService.getUserProfileService(
      validatedUser.data.id,
    );
    return APIResponse.Ok(res, "Profile fetched successfully", user);
  }

  public async handleUpdateProfile(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const validatedPayload = await updateProfilePayload.safeParseAsync(
      req.body,
    );
    if (!validatedPayload.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const user = await this.userService.updateProfileService(
      validatedUser.data.id,
      validatedPayload.data,
    );
    return APIResponse.Ok(res, "Profile updated successfully", user);
  }

  public async handleUpdateAvatar(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const validatedPayload = await updateAvatarPayload.safeParseAsync(req.body);
    if (!validatedPayload.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const user = await this.userService.updateAvatarService(
      validatedUser.data.id,
      validatedPayload.data,
    );
    return APIResponse.Ok(res, "Avatar updated successfully", user);
  }

  public async handleGetGrantedAppAccess(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const apps = await this.userService.getGrantedAppAccessService(
      validatedUser.data.id,
    );
    return APIResponse.Ok(res, "Granted app access fetched successfully", apps);
  }
}

export default UserController;
