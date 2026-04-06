import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from '@gitroom/nestjs-libraries/analytics/analytics.service';

@ApiTags('Analytics History')
@Controller('/analytics')
export class AnalyticsHistoryController {
  constructor(private _analyticsService: AnalyticsService) {}

  @Get('/history/:integrationId')
  async getAccountHistory(
    @Param('integrationId') integrationId: string,
    @Query('metric') metric: string,
    @Query('days') days: string
  ) {
    return this._analyticsService.getAccountHistory(
      integrationId,
      metric || 'followers',
      parseInt(days, 10) || 30
    );
  }

  @Get('/post/:postId/history')
  async getPostHistory(
    @Param('postId') postId: string,
    @Query('metric') metric: string,
    @Query('days') days: string
  ) {
    return this._analyticsService.getPostHistory(
      postId,
      metric || 'views',
      parseInt(days, 10) || 30
    );
  }

  @Get('/outliers/:projectId')
  async getOutliers(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string,
    @Query('status') status: string
  ) {
    return this._analyticsService.getOutliers(
      org.id,
      projectId !== 'all' ? projectId : null,
      status || undefined
    );
  }

  @Post('/outliers/:id/analyze')
  async analyzeOutlier(@Param('id') id: string) {
    return this._analyticsService.analyzeOutlier(id);
  }

  @Post('/outliers/:id/dismiss')
  async dismissOutlier(@Param('id') id: string) {
    return this._analyticsService.dismissOutlier(id);
  }

  @Post('/review/:projectId')
  async getMonthlyReview(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string
  ) {
    return this._analyticsService.getMonthlyReview(projectId, org.id);
  }
}
