import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export interface TrackUsageEvent {
  projectId: string;
  organizationId: string;
  service: string;
  operation: string;
  market?: string;
  platform?: string;
  unitsUsed: number;
  estimatedCostUsd: number;
  metadata?: any;
}

@Injectable()
export class UsageRepository {
  constructor(
    private _usage: PrismaRepository<'usageTracking'>,
    private _budget: PrismaRepository<'budgetConfig'>
  ) {}

  trackUsage(event: TrackUsageEvent) {
    return this._usage.model.usageTracking.create({
      data: {
        projectId: event.projectId,
        organizationId: event.organizationId,
        service: event.service,
        operation: event.operation,
        market: event.market || null,
        platform: event.platform || null,
        unitsUsed: event.unitsUsed,
        estimatedCostUsd: event.estimatedCostUsd,
        metadata: event.metadata || undefined,
      },
    });
  }

  getMonthlyUsage(projectId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this._usage.model.usageTracking.groupBy({
      by: ['service'],
      where: {
        projectId,
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: {
        unitsUsed: true,
        estimatedCostUsd: true,
      },
      _count: true,
    });
  }

  getUsageByService(projectId: string, service: string, month?: number, year?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    return this._usage.model.usageTracking.findMany({
      where: {
        projectId,
        service,
        createdAt: { gte: startDate, lt: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getMonthlyTotalByService(projectId: string, service: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this._usage.model.usageTracking.aggregate({
      where: {
        projectId,
        service,
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: {
        estimatedCostUsd: true,
      },
    });
  }

  getGlobalUsage(organizationId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this._usage.model.usageTracking.groupBy({
      by: ['projectId', 'service'],
      where: {
        organizationId,
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: {
        unitsUsed: true,
        estimatedCostUsd: true,
      },
      _count: true,
    });
  }

  getBudgetConfig(projectId: string, service: string) {
    return this._budget.model.budgetConfig.findUnique({
      where: {
        projectId_service: { projectId, service },
      },
    });
  }

  getAllBudgetConfigs(projectId: string) {
    return this._budget.model.budgetConfig.findMany({
      where: { projectId },
    });
  }

  setBudgetConfig(
    projectId: string,
    organizationId: string,
    service: string,
    monthlyCapUsd: number,
    warningThreshold?: number
  ) {
    return this._budget.model.budgetConfig.upsert({
      where: {
        projectId_service: { projectId, service },
      },
      create: {
        projectId,
        organizationId,
        service,
        monthlyCapUsd,
        ...(warningThreshold !== undefined ? { warningThreshold } : {}),
      },
      update: {
        monthlyCapUsd,
        ...(warningThreshold !== undefined ? { warningThreshold } : {}),
      },
    });
  }
}
