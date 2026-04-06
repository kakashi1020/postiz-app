import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FrameworkService } from '@gitroom/nestjs-libraries/framework/framework.service';

@ApiTags('Framework')
@Controller('/framework')
export class FrameworkController {
  constructor(private _frameworkService: FrameworkService) {}

  @Post('/:projectId/upload')
  async upload(
    @Param('projectId') projectId: string,
    @Body() body: { fileName: string; content: string }
  ) {
    return this._frameworkService.upload(projectId, body.fileName, body.content);
  }

  @Get('/:projectId/current')
  async getCurrent(@Param('projectId') projectId: string) {
    return this._frameworkService.getCurrent(projectId);
  }

  @Get('/:projectId/versions')
  async getVersions(@Param('projectId') projectId: string) {
    return this._frameworkService.getVersionHistory(projectId);
  }

  @Get('/:projectId/versions/:version')
  async getByVersion(
    @Param('projectId') projectId: string,
    @Param('version') version: string
  ) {
    return this._frameworkService.getByVersion(projectId, parseInt(version, 10));
  }
}
