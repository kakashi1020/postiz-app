import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { UsageService } from '@gitroom/nestjs-libraries/usage/usage.service';
import {
  SetBudgetDto,
  MonthYearQueryDto,
  ServiceQueryDto,
} from '@gitroom/nestjs-libraries/dtos/usage/usage.dto';

@ApiTags('Usage')
@Controller('/usage')
export class UsageController {
  constructor(private _usageService: UsageService) {}

  @Get('/:projectId/monthly')
  async getMonthlyReport(
    @Param('projectId') projectId: string,
    @Query() query: MonthYearQueryDto
  ) {
    return this._usageService.getMonthlyReport(projectId, query.month, query.year);
  }

  @Get('/:projectId/by-service')
  async getByService(
    @Param('projectId') projectId: string,
    @Query() query: ServiceQueryDto
  ) {
    if (!query.service) {
      return { error: 'service query param is required' };
    }
    return this._usageService.getUsageByService(
      projectId,
      query.service,
      query.month,
      query.year
    );
  }

  @Get('/:projectId/budget')
  async getBudget(@Param('projectId') projectId: string) {
    // Return all budget configs and current status for each
    const report = await this._usageService.getMonthlyReport(projectId);
    return report;
  }

  @Post('/:projectId/budget')
  async setBudget(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Body() body: SetBudgetDto
  ) {
    return this._usageService.setBudgetConfig(
      projectId,
      org.id,
      body.service,
      body.monthlyCapUsd,
      body.warningThreshold
    );
  }

  @Get('/global')
  async getGlobalSummary(
    @GetOrgFromRequest() org: Organization,
    @Query() query: MonthYearQueryDto
  ) {
    return this._usageService.getGlobalSummary(org.id, query.month, query.year);
  }
}
