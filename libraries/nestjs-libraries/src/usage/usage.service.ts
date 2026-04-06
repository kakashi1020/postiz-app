import { Injectable } from '@nestjs/common';
import { UsageRepository, TrackUsageEvent } from '@gitroom/nestjs-libraries/usage/usage.repository';

export type BudgetStatus = 'OK' | 'WARNING' | 'BLOCKED';

export interface BudgetCheckResult {
  status: BudgetStatus;
  used: number;
  cap: number;
  percentage: number;
}

export interface MonthlyServiceReport {
  service: string;
  totalCost: number;
  totalUnits: number;
  count: number;
  budget: BudgetCheckResult | null;
}

@Injectable()
export class UsageService {
  constructor(private _repo: UsageRepository) {}

  async track(event: TrackUsageEvent) {
    return this._repo.trackUsage(event);
  }

  async getMonthlyReport(projectId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const usage = await this._repo.getMonthlyUsage(projectId, m, y);
    const budgets = await this._repo.getAllBudgetConfigs(projectId);
    const budgetMap = new Map(budgets.map((b) => [b.service, b]));

    const report: MonthlyServiceReport[] = usage.map((row) => {
      const totalCost = row._sum.estimatedCostUsd || 0;
      const budget = budgetMap.get(row.service);
      let budgetCheck: BudgetCheckResult | null = null;

      if (budget) {
        const percentage = budget.monthlyCapUsd > 0 ? totalCost / budget.monthlyCapUsd : 0;
        let status: BudgetStatus = 'OK';
        if (percentage >= 1) {
          status = 'BLOCKED';
        } else if (percentage >= budget.warningThreshold) {
          status = 'WARNING';
        }
        budgetCheck = {
          status,
          used: totalCost,
          cap: budget.monthlyCapUsd,
          percentage,
        };
      }

      return {
        service: row.service,
        totalCost,
        totalUnits: row._sum.unitsUsed || 0,
        count: row._count,
        budget: budgetCheck,
      };
    });

    return {
      month: m,
      year: y,
      services: report,
      totalCost: report.reduce((sum, r) => sum + r.totalCost, 0),
    };
  }

  async getUsageByService(projectId: string, service: string, month?: number, year?: number) {
    return this._repo.getUsageByService(projectId, service, month, year);
  }

  async checkBudget(projectId: string, service: string): Promise<BudgetCheckResult> {
    const budget = await this._repo.getBudgetConfig(projectId, service);
    if (!budget) {
      return { status: 'OK', used: 0, cap: 0, percentage: 0 };
    }

    const now = new Date();
    const agg = await this._repo.getMonthlyTotalByService(
      projectId,
      service,
      now.getMonth() + 1,
      now.getFullYear()
    );

    const used = agg._sum.estimatedCostUsd || 0;
    const percentage = budget.monthlyCapUsd > 0 ? used / budget.monthlyCapUsd : 0;

    let status: BudgetStatus = 'OK';
    if (percentage >= 1) {
      status = 'BLOCKED';
    } else if (percentage >= budget.warningThreshold) {
      status = 'WARNING';
    }

    return { status, used, cap: budget.monthlyCapUsd, percentage };
  }

  async setBudgetConfig(
    projectId: string,
    organizationId: string,
    service: string,
    monthlyCapUsd: number,
    warningThreshold?: number
  ) {
    return this._repo.setBudgetConfig(projectId, organizationId, service, monthlyCapUsd, warningThreshold);
  }

  async getGlobalSummary(organizationId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const usage = await this._repo.getGlobalUsage(organizationId, m, y);

    const byProject = new Map<string, { services: Map<string, { cost: number; units: number; count: number }> }>();

    for (const row of usage) {
      if (!byProject.has(row.projectId)) {
        byProject.set(row.projectId, { services: new Map() });
      }
      byProject.get(row.projectId)!.services.set(row.service, {
        cost: row._sum.estimatedCostUsd || 0,
        units: row._sum.unitsUsed || 0,
        count: row._count,
      });
    }

    const projects = Array.from(byProject.entries()).map(([projectId, data]) => ({
      projectId,
      services: Array.from(data.services.entries()).map(([service, stats]) => ({
        service,
        ...stats,
      })),
      totalCost: Array.from(data.services.values()).reduce((s, v) => s + v.cost, 0),
    }));

    return {
      month: m,
      year: y,
      projects,
      totalCost: projects.reduce((s, p) => s + p.totalCost, 0),
    };
  }
}
