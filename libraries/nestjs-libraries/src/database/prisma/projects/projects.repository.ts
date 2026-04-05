import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/dtos/projects/create.project.dto';

@Injectable()
export class ProjectsRepository {
  constructor(private _projects: PrismaRepository<'project'>) {}

  create(orgId: string, body: CreateProjectDto) {
    return this._projects.model.project.create({
      data: {
        organizationId: orgId,
        name: body.name,
        description: body.description,
        slug: body.slug,
      },
    });
  }

  update(orgId: string, id: string, body: CreateProjectDto) {
    return this._projects.model.project.update({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
      data: {
        name: body.name,
        description: body.description,
        slug: body.slug,
      },
    });
  }

  list(orgId: string) {
    return this._projects.model.project.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  getBySlug(orgId: string, slug: string) {
    return this._projects.model.project.findFirst({
      where: {
        organizationId: orgId,
        slug,
        deletedAt: null,
      },
    });
  }

  softDelete(orgId: string, id: string) {
    return this._projects.model.project.update({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
