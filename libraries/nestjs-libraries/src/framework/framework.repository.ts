import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class FrameworkRepository {
  constructor(private _doc: PrismaRepository<'frameworkDocument'>) {}

  async upload(projectId: string, fileName: string, fileContent: string, diffSummary?: string) {
    // Deactivate previous active version
    await this._doc.model.frameworkDocument.updateMany({
      where: { projectId, isActive: true },
      data: { isActive: false },
    });

    // Get next version number
    const latest = await this._doc.model.frameworkDocument.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version || 0) + 1;

    return this._doc.model.frameworkDocument.create({
      data: {
        projectId,
        version: nextVersion,
        fileName,
        fileContent,
        diffSummary: diffSummary || null,
        isActive: true,
      },
    });
  }

  getCurrent(projectId: string) {
    return this._doc.model.frameworkDocument.findFirst({
      where: { projectId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  getVersionHistory(projectId: string) {
    return this._doc.model.frameworkDocument.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        fileName: true,
        diffSummary: true,
        isActive: true,
        uploadedAt: true,
      },
    });
  }

  getByVersion(projectId: string, version: number) {
    return this._doc.model.frameworkDocument.findFirst({
      where: { projectId, version },
    });
  }
}
