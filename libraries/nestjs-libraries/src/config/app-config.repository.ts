import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class AppConfigRepository {
  constructor(
    private _appConfig: PrismaRepository<'appConfig'>
  ) {}

  getAll(organizationId: string) {
    return this._appConfig.model.appConfig.findMany({
      where: { organizationId },
    });
  }

  get(organizationId: string, key: string) {
    return this._appConfig.model.appConfig.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
  }

  set(organizationId: string, key: string, value: string) {
    return this._appConfig.model.appConfig.upsert({
      where: { organizationId_key: { organizationId, key } },
      update: { value },
      create: { organizationId, key, value },
    });
  }

  deleteKey(organizationId: string, key: string) {
    return this._appConfig.model.appConfig.deleteMany({
      where: { organizationId, key },
    });
  }
}
