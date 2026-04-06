import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { FunnelStage, Market } from '@prisma/client';

@Injectable()
export class StrategyRepository {
  constructor(
    private _strategy: PrismaRepository<'contentStrategy'>,
    private _hook: PrismaRepository<'hook'>,
    private _script: PrismaRepository<'script'>,
    private _series: PrismaRepository<'seriesConcept'>,
    private _monthlyPlan: PrismaRepository<'monthlyContentPlan'>
  ) {}

  // -- ContentStrategy --

  createStrategy(data: {
    projectId: string;
    market: Market;
    platform: string;
    funnelStage: FunnelStage;
    pillarBreakdown: any;
  }) {
    return this._strategy.model.contentStrategy.create({ data });
  }

  getStrategy(id: string) {
    return this._strategy.model.contentStrategy.findUnique({
      where: { id },
      include: {
        hooks: { orderBy: { createdAt: 'desc' } },
        scripts: { orderBy: { createdAt: 'desc' } },
        seriesConcepts: true,
        monthlyPlans: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
      },
    });
  }

  getStrategyByScope(projectId: string, market: Market, platform: string) {
    return this._strategy.model.contentStrategy.findFirst({
      where: { projectId, market, platform, isActive: true },
      include: {
        hooks: { orderBy: { createdAt: 'desc' } },
        scripts: { orderBy: { createdAt: 'desc' } },
        seriesConcepts: true,
        monthlyPlans: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
      },
    });
  }

  // -- Hooks --

  createHooks(hooks: { strategyId: string; text: string; hookType: string; pillar: string }[]) {
    return this._hook.model.hook.createMany({ data: hooks });
  }

  getHooks(strategyId: string) {
    return this._hook.model.hook.findMany({
      where: { strategyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  starHook(id: string, isStarred: boolean) {
    return this._hook.model.hook.update({
      where: { id },
      data: { isStarred },
    });
  }

  incrementHookUsage(id: string) {
    return this._hook.model.hook.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  // -- Scripts --

  createScript(data: {
    strategyId: string;
    title: string;
    scriptStructure: string;
    pillar: string;
    content: string;
  }) {
    return this._script.model.script.create({ data });
  }

  createScripts(scripts: { strategyId: string; title: string; scriptStructure: string; pillar: string; content: string }[]) {
    return this._script.model.script.createMany({ data: scripts });
  }

  getScripts(strategyId: string) {
    return this._script.model.script.findMany({
      where: { strategyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  incrementScriptUsage(id: string) {
    return this._script.model.script.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  // -- Series Concepts --

  createSeriesConcepts(concepts: { strategyId: string; name: string; seriesType: string; episodePlan: any }[]) {
    return this._series.model.seriesConcept.createMany({ data: concepts });
  }

  // -- Monthly Plans --

  createMonthlyPlan(data: {
    strategyId: string;
    month: number;
    year: number;
    weekPlans: any;
    contentMix: any;
  }) {
    return this._monthlyPlan.model.monthlyContentPlan.create({ data });
  }

  createMonthlyPlans(plans: { strategyId: string; month: number; year: number; weekPlans: any; contentMix: any }[]) {
    return this._monthlyPlan.model.monthlyContentPlan.createMany({ data: plans });
  }
}
