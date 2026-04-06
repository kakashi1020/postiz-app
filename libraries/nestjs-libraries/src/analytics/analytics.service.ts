import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsRepository } from '@gitroom/nestjs-libraries/analytics/analytics.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { ClaudeService } from '@gitroom/nestjs-libraries/openai/claude.service';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

function parseJson<T>(text: string, fallback: T): T {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const OUTLIER_MULTIPLIER_THRESHOLD = 5;

@Injectable()
export class AnalyticsService {
  constructor(
    private _repo: AnalyticsRepository,
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _postsRepository: PostsRepository,
    private _claude: ClaudeService
  ) {}

  async syncIntegrationAnalytics(org: Organization, integrationId: string) {
    const dateNum = dayjs().unix();
    try {
      const data = await this._integrationService.checkAnalytics(
        org,
        integrationId,
        dateNum.toString()
      );
      if (!Array.isArray(data)) return;

      for (const metric of data) {
        for (const point of metric.data || []) {
          await this._repo.saveAccountSnapshot({
            organizationId: org.id,
            integrationId,
            metric: metric.label,
            value: parseInt(point.total, 10) || 0,
            date: new Date(point.date),
          });
        }
      }
    } catch {
      // Analytics not available for this integration — skip
    }
  }

  async syncPostAnalytics(
    orgId: string,
    postId: string,
    integrationId: string,
    projectId?: string
  ) {
    const dateNum = dayjs().subtract(30, 'day').unix();
    try {
      const data = await this._postsService.checkPostAnalytics(orgId, postId, dateNum);
      if (!data || 'missing' in data) return;

      const records = [];
      for (const metric of data) {
        for (const point of metric.data || []) {
          records.push({
            postId,
            organizationId: orgId,
            integrationId,
            projectId,
            metric: metric.label,
            value: parseInt(point.total, 10) || 0,
          });
        }
      }
      if (records.length) {
        await this._repo.savePostSnapshots(records);
      }
    } catch {
      // Post analytics not available — skip
    }
  }

  async getPostHistory(postId: string, metric: string, days = 30) {
    return this._repo.getPostHistory(postId, metric, days);
  }

  async getAccountHistory(integrationId: string, metric: string, days = 30) {
    return this._repo.getAccountHistory(integrationId, metric, days);
  }

  async detectOutliers(orgId: string, projectId: string | null) {
    const topPosts = await this._repo.getTopPosts(orgId, projectId, 30, 50);
    const created: any[] = [];

    for (const snapshot of topPosts) {
      // Skip if we already have an outlier alert for this post
      const existing = await this._repo.getExistingOutlierForPost(snapshot.postId);
      if (existing) continue;

      // We need a follower count baseline. Use the latest account-level
      // "followers" metric for the same integration.
      const followerHistory = await this._repo.getAccountHistory(
        snapshot.integrationId,
        'followers',
        7
      );
      const followerCount = followerHistory.length > 0
        ? followerHistory[followerHistory.length - 1].value
        : 0;

      if (followerCount <= 0) continue;

      const multiplier = snapshot.value / followerCount;
      if (multiplier < OUTLIER_MULTIPLIER_THRESHOLD) continue;

      const outlier = await this._repo.createOutlierAlert({
        postId: snapshot.postId,
        integrationId: snapshot.integrationId,
        organizationId: orgId,
        projectId: projectId || undefined,
        market: (snapshot.post as any)?.market || undefined,
        platform: undefined,
        followerCountAtTime: followerCount,
        viewCount: snapshot.value,
        multiplier,
      });
      created.push(outlier);
    }

    return created;
  }

  async getOutliers(orgId: string, projectId: string | null, status?: string) {
    return this._repo.getOutliers(orgId, projectId, status);
  }

  async analyzeOutlier(outlierId: string) {
    const outlier = await this._repo.getOutlierById(outlierId);
    if (!outlier) {
      throw new NotFoundException('Outlier not found');
    }

    const postContent = outlier.post?.content || '';
    const prompt = `Analyze this viral social media post and break down what made it work. The post got ${outlier.viewCount} views with only ${outlier.followerCountAtTime} followers (${outlier.multiplier.toFixed(1)}x multiplier).

Post content:
${postContent}

Respond with JSON:
{
  "analysis": {
    "hookStrength": "string",
    "emotionalTrigger": "string",
    "formatInsight": "string",
    "audienceResonance": "string",
    "timingFactor": "string"
  },
  "doubleDownDrafts": [
    { "content": "string (complete draft post)", "angle": "string (how this riffs on the original)" }
  ]
}

Generate 3 double-down drafts.`;

    const raw = await this._claude.generateContent(prompt, 'You are an expert social media analyst. Respond with valid JSON only.');
    const result = parseJson<any>(raw, { analysis: {}, doubleDownDrafts: [] });

    await this._repo.updateOutlierStatus(outlierId, 'ANALYZED', {
      analysisResult: result.analysis || {},
      doubleDownDrafts: result.doubleDownDrafts || [],
    });

    return this._repo.getOutlierById(outlierId);
  }

  async dismissOutlier(outlierId: string) {
    const outlier = await this._repo.getOutlierById(outlierId);
    if (!outlier) {
      throw new NotFoundException('Outlier not found');
    }
    return this._repo.updateOutlierStatus(outlierId, 'DISMISSED');
  }

  async getMonthlyReview(projectId: string, orgId: string) {
    const topPosts = await this._repo.getTopPosts(orgId, projectId, 30, 10);
    const bottomPosts = await this._repo.getBottomPosts(orgId, projectId, 30, 10);

    const topContent = topPosts.map((s) => ({
      content: (s.post as any)?.content?.substring(0, 200) || '',
      views: s.value,
      market: (s.post as any)?.market,
    }));
    const bottomContent = bottomPosts.map((s) => ({
      content: (s.post as any)?.content?.substring(0, 200) || '',
      views: s.value,
      market: (s.post as any)?.market,
    }));

    const prompt = `Analyze the performance of these social media posts from the past 30 days and provide strategic recommendations.

Top performing posts:
${JSON.stringify(topContent, null, 2)}

Bottom performing posts:
${JSON.stringify(bottomContent, null, 2)}

Respond with JSON:
{
  "summary": "string (2-3 sentence overview)",
  "topPatterns": ["string (pattern found in top posts)"],
  "bottomPatterns": ["string (pattern found in bottom posts)"],
  "recommendations": ["string (actionable recommendation)"],
  "contentMixSuggestion": { "educational": number, "promotional": number, "engagement": number, "storytelling": number }
}`;

    const raw = await this._claude.generateContent(prompt, 'You are an expert social media strategist. Respond with valid JSON only.');
    return parseJson<any>(raw, { summary: '', topPatterns: [], bottomPatterns: [], recommendations: [], contentMixSuggestion: {} });
  }
}
