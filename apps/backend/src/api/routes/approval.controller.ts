import { Body, Controller, Param, Post } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { ApprovalService } from '@gitroom/nestjs-libraries/database/prisma/posts/approval.service';
import {
  ApprovePostDto,
  RejectPostDto,
  RequestChangesDto,
} from '@gitroom/nestjs-libraries/dtos/posts/approval.dto';

@ApiTags('Approval')
@Controller('/posts')
export class ApprovalController {
  constructor(private _approvalService: ApprovalService) {}

  @Post('/:group/submit-approval')
  async submitForApproval(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    return this._approvalService.submitForApproval(org.id, group);
  }

  @Post('/:group/approve')
  async approve(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('group') group: string,
    @Body() body: ApprovePostDto
  ) {
    return this._approvalService.approve(
      org.id,
      group,
      user.id,
      body.expectedUpdatedAt
    );
  }

  @Post('/:group/reject')
  async reject(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('group') group: string,
    @Body() body: RejectPostDto
  ) {
    return this._approvalService.reject(org.id, group, user.id, body.reason);
  }

  @Post('/:group/request-changes')
  async requestChanges(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('group') group: string,
    @Body() body: RequestChangesDto
  ) {
    return this._approvalService.requestChanges(
      org.id,
      group,
      user.id,
      body.reason
    );
  }
}
