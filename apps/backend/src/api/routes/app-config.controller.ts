import { Body, Controller, Get, Put } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { AppConfigService } from '@gitroom/nestjs-libraries/config/app-config.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Config')
@Controller('/config')
export class AppConfigController {
  constructor(private _appConfigService: AppConfigService) {}

  @Get('/keys')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getKeys(@GetOrgFromRequest() org: Organization) {
    return this._appConfigService.getAllMasked(org.id);
  }

  @Put('/keys')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateKeys(
    @GetOrgFromRequest() org: Organization,
    @Body() body: Record<string, string>
  ) {
    const results: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!value || value.startsWith('••••')) {
        continue;
      }
      await this._appConfigService.set(org.id, key, value);
      results[key] = true;
    }
    return { updated: results };
  }
}
