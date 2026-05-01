import type { Request, Response } from "express";
import ApplicationService from "./application.service.js";
import {
  ApplicationIDParamsPayload,
  UserIDParamsPayload,
  createApplicationPayload,
  updateApplicationPayload,
} from "./application.validation.js";
import APIError from "../../utils/APIError.js";
import APIResponse from "../../utils/APIResponse.js";

class ApplicationController {
  private applicationService = new ApplicationService();

  public async handleGetApplication(req: Request, res: Response) {
    const validatedParams = await ApplicationIDParamsPayload.safeParseAsync(
      req.params,
    );
    if (!validatedParams.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const app = await this.applicationService.applicationSingleFetchService(
      validatedParams.data.id,
      validatedUser.data.id,
    );
    return APIResponse.Ok(res, "Application fetched successfully", app);
  }

  public async handleGetAllApplications(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const apps = await this.applicationService.applicationFetchingService(
      validatedUser.data.id,
    );
    return APIResponse.Ok(res, "Applications fetched successfully", apps);
  }

  public async handleCreateApplication(req: Request, res: Response) {
    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const validatedPayload = await createApplicationPayload.safeParseAsync(
      req.body,
    );
    if (!validatedPayload.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const app = await this.applicationService.applicationCreationService(
      validatedUser.data.id,
      validatedPayload.data,
    );
    return APIResponse.Created(res, "Application created successfully", app);
  }

  public async handleUpdateApplication(req: Request, res: Response) {
    const validatedParams = await ApplicationIDParamsPayload.safeParseAsync(
      req.params,
    );
    if (!validatedParams.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const validatedPayload = await updateApplicationPayload.safeParseAsync(
      req.body,
    );
    if (!validatedPayload.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const app = await this.applicationService.applicationUpdateService(
      validatedParams.data.id,
      validatedUser.data.id,
      validatedPayload.data,
    );
    return APIResponse.Ok(res, "Application updated successfully", app);
  }

  public async handleDeleteApplication(req: Request, res: Response) {
    const validatedParams = await ApplicationIDParamsPayload.safeParseAsync(
      req.params,
    );
    if (!validatedParams.success)
      throw APIError.BadRequest("Invalid Information Received!");

    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);
    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    await this.applicationService.applicationDeletionService(
      validatedParams.data.id,
      validatedUser.data.id,
    );
    return APIResponse.NoContent(res);
  }

  public async handleClientSecretRefresh(req: Request, res: Response) {
    const validatedParams = await ApplicationIDParamsPayload.safeParseAsync(
      req.params,
    );
    if (!validatedParams.success)
      throw APIError.BadRequest("Invalid Application ID");

    const validatedUser = await UserIDParamsPayload.safeParseAsync(req.user);

    if (!validatedUser.success)
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");

    const app = await this.applicationService.applicationResetSecretService(
      validatedParams.data.id,
      validatedUser.data.id,
    );

    return APIResponse.Ok(res, "Client Secret Updated", app);
  }
}

export default ApplicationController;
