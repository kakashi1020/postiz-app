import { Injectable } from '@nestjs/common';
import { ProjectsRepository } from '@gitroom/nestjs-libraries/database/prisma/projects/projects.repository';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/dtos/projects/create.project.dto';

@Injectable()
export class ProjectsService {
  constructor(private _projectsRepository: ProjectsRepository) {}

  create(orgId: string, body: CreateProjectDto) {
    return this._projectsRepository.create(orgId, body);
  }

  update(orgId: string, id: string, body: CreateProjectDto) {
    return this._projectsRepository.update(orgId, id, body);
  }

  list(orgId: string) {
    return this._projectsRepository.list(orgId);
  }

  getBySlug(orgId: string, slug: string) {
    return this._projectsRepository.getBySlug(orgId, slug);
  }

  softDelete(orgId: string, id: string) {
    return this._projectsRepository.softDelete(orgId, id);
  }
}
