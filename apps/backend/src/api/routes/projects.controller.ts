import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from '@gitroom/nestjs-libraries/database/prisma/projects/projects.service';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/dtos/projects/create.project.dto';

@ApiTags('Projects')
@Controller('/projects')
export class ProjectsController {
  constructor(private _projectsService: ProjectsService) {}

  @Get('/')
  async getProjects(@GetOrgFromRequest() org: Organization) {
    return this._projectsService.list(org.id);
  }

  @Post('/')
  async createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateProjectDto
  ) {
    return this._projectsService.create(org.id, body);
  }

  @Put('/:id')
  async updateProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: CreateProjectDto
  ) {
    return this._projectsService.update(org.id, id, body);
  }

  @Delete('/:id')
  async deleteProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._projectsService.softDelete(org.id, id);
  }
}
