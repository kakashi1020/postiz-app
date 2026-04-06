import { Injectable, NotFoundException } from '@nestjs/common';
import { ClaudeService } from '@gitroom/nestjs-libraries/openai/claude.service';
import { MarketContextService } from '@gitroom/nestjs-libraries/openai/market-context.service';
import { StrategyRepository } from '@gitroom/nestjs-libraries/strategy/strategy.repository';
import { FunnelStage, Market } from '@prisma/client';

function parseJson<T>(text: string, fallback: T): T {
  // Extract JSON from markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const STRATEGY_SYSTEM_PROMPT = `You are an expert content strategist. You generate comprehensive content strategies for social media marketing.

Consider these dimensions when generating:
1. Business Offerings — what the company sells and its value propositions
2. Market Context — local regulations, terminology, competitors
3. Marketing Frameworks — funnel stages (TOFU awareness, MOFU consideration, BOFU conversion)
4. Brand Identity — tone of voice, positioning, differentiation

Always respond with valid JSON only — no markdown fences, no commentary.`;

@Injectable()
export class StrategyService {
  constructor(
    private _claude: ClaudeService,
    private _marketContext: MarketContextService,
    private _repo: StrategyRepository
  ) {}

  async generateStrategy(
    projectId: string,
    market: Market,
    platform: string,
    funnelStage: FunnelStage,
    frameworkDoc?: string
  ) {
    const prompt = this._marketContext.enrichPrompt(
      `Generate a complete content strategy for the "${platform}" platform targeting the "${funnelStage}" funnel stage.

${frameworkDoc ? `Additional framework/brand guidelines:\n${frameworkDoc}\n\n` : ''}Respond with this exact JSON structure:
{
  "pillarBreakdown": {
    "pillars": [
      { "name": "string", "description": "string", "percentage": number }
    ]
  },
  "hooks": [
    { "text": "string", "hookType": "question|statistic|story|bold_claim|contrarian", "pillar": "string" }
  ],
  "scripts": [
    { "title": "string", "scriptStructure": "hook_story_cta|problem_agitate_solve|edu_thread|case_study", "pillar": "string", "content": "string (full script text, 200-400 words)" }
  ],
  "seriesConcepts": [
    { "name": "string", "seriesType": "weekly|biweekly|monthly", "episodePlan": [{ "episode": number, "topic": "string" }] }
  ],
  "monthlyPlan": {
    "month": ${new Date().getMonth() + 1},
    "year": ${new Date().getFullYear()},
    "weekPlans": [
      { "week": 1, "posts": [{ "day": "string", "pillar": "string", "format": "string", "topic": "string" }] }
    ],
    "contentMix": { "educational": number, "promotional": number, "engagement": number, "storytelling": number }
  }
}

Generate 20-30 hooks, 10 scripts, 3-5 series concepts, and a 4-week monthly plan.`,
      market,
      platform
    );

    const raw = await this._claude.generateContent(prompt, STRATEGY_SYSTEM_PROMPT, 16384);
    const result = parseJson<any>(raw, null);

    if (!result) {
      throw new Error('Failed to parse strategy response from Claude');
    }

    // Persist strategy
    const strategy = await this._repo.createStrategy({
      projectId,
      market,
      platform,
      funnelStage,
      pillarBreakdown: result.pillarBreakdown || {},
    });

    // Persist hooks
    if (result.hooks?.length) {
      await this._repo.createHooks(
        result.hooks.map((h: any) => ({
          strategyId: strategy.id,
          text: h.text,
          hookType: h.hookType || 'question',
          pillar: h.pillar || '',
        }))
      );
    }

    // Persist scripts
    if (result.scripts?.length) {
      await this._repo.createScripts(
        result.scripts.map((s: any) => ({
          strategyId: strategy.id,
          title: s.title,
          scriptStructure: s.scriptStructure || 'hook_story_cta',
          pillar: s.pillar || '',
          content: s.content || '',
        }))
      );
    }

    // Persist series concepts
    if (result.seriesConcepts?.length) {
      await this._repo.createSeriesConcepts(
        result.seriesConcepts.map((sc: any) => ({
          strategyId: strategy.id,
          name: sc.name,
          seriesType: sc.seriesType || 'weekly',
          episodePlan: sc.episodePlan || [],
        }))
      );
    }

    // Persist monthly plan
    if (result.monthlyPlan) {
      await this._repo.createMonthlyPlan({
        strategyId: strategy.id,
        month: result.monthlyPlan.month,
        year: result.monthlyPlan.year,
        weekPlans: result.monthlyPlan.weekPlans || [],
        contentMix: result.monthlyPlan.contentMix || {},
      });
    }

    return this._repo.getStrategy(strategy.id);
  }

  async getStrategyByScope(projectId: string, market: Market, platform: string) {
    const strategy = await this._repo.getStrategyByScope(projectId, market, platform);
    if (!strategy) {
      throw new NotFoundException('No active strategy found for this scope');
    }
    return strategy;
  }

  async getHooks(strategyId: string) {
    return this._repo.getHooks(strategyId);
  }

  async getScripts(strategyId: string) {
    return this._repo.getScripts(strategyId);
  }

  async generateHooks(strategyId: string, topic: string, count: number) {
    const strategy = await this._repo.getStrategy(strategyId);
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const prompt = this._marketContext.enrichPrompt(
      `Generate ${count} social media hooks about "${topic}" for the "${strategy.platform}" platform.
Funnel stage: ${strategy.funnelStage}. Content pillars: ${JSON.stringify(strategy.pillarBreakdown)}.

Respond with JSON: { "hooks": [{ "text": "string", "hookType": "question|statistic|story|bold_claim|contrarian", "pillar": "string" }] }`,
      strategy.market,
      strategy.platform
    );

    const raw = await this._claude.generateContent(prompt, STRATEGY_SYSTEM_PROMPT);
    const result = parseJson<{ hooks: any[] }>(raw, { hooks: [] });

    if (result.hooks.length) {
      await this._repo.createHooks(
        result.hooks.map((h) => ({
          strategyId,
          text: h.text,
          hookType: h.hookType || 'question',
          pillar: h.pillar || '',
        }))
      );
    }

    return this._repo.getHooks(strategyId);
  }

  async generateScript(strategyId: string, topic: string, structure: string) {
    const strategy = await this._repo.getStrategy(strategyId);
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const prompt = this._marketContext.enrichPrompt(
      `Generate a complete social media script about "${topic}" using the "${structure}" structure for "${strategy.platform}".
Funnel stage: ${strategy.funnelStage}. Content pillars: ${JSON.stringify(strategy.pillarBreakdown)}.

Respond with JSON: { "title": "string", "scriptStructure": "${structure}", "pillar": "string", "content": "string (full script, 200-400 words)" }`,
      strategy.market,
      strategy.platform
    );

    const raw = await this._claude.generateContent(prompt, STRATEGY_SYSTEM_PROMPT);
    const result = parseJson<any>(raw, null);

    if (!result) {
      throw new Error('Failed to parse script response from Claude');
    }

    const script = await this._repo.createScript({
      strategyId,
      title: result.title || topic,
      scriptStructure: result.scriptStructure || structure,
      pillar: result.pillar || '',
      content: result.content || '',
    });

    return script;
  }

  async generateCaption(market: Market, platform: string, pillar: string, postContent: string) {
    const prompt = this._marketContext.enrichPrompt(
      `Write a social media caption for "${platform}" in the "${pillar}" content pillar.

Post content/context: ${postContent}

Respond with JSON: { "caption": "string", "hashtags": ["string"] }`,
      market,
      platform
    );

    const raw = await this._claude.generateContent(prompt, STRATEGY_SYSTEM_PROMPT);
    return parseJson<{ caption: string; hashtags: string[] }>(raw, { caption: '', hashtags: [] });
  }

  async analyzeOutlier(postContent: string, market: Market) {
    const prompt = this._marketContext.enrichPrompt(
      `Analyze this viral/high-performing post and break down what made it work. Then generate 3 "double-down" draft posts that replicate the winning formula.

Original post:
${postContent}

Respond with JSON:
{
  "analysis": {
    "hookStrength": "string (what made the hook compelling)",
    "emotionalTrigger": "string",
    "formatInsight": "string",
    "audienceResonance": "string"
  },
  "doubleDownDrafts": [
    { "content": "string (complete draft post)", "angle": "string (how this riffs on the original)" }
  ]
}`,
      market
    );

    const raw = await this._claude.generateContent(prompt, STRATEGY_SYSTEM_PROMPT);
    return parseJson<any>(raw, { analysis: {}, doubleDownDrafts: [] });
  }
}
