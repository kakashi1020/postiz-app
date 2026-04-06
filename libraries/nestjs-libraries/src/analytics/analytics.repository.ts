import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Injectable()
export class AnalyticsRepository {
  constructor(
    private _postSnapshot: PrismaRepository<'postAnalyticsSnapshot'>,
    private _accountSnapshot: PrismaRepository<'accountAnalyticsSnapshot'>,
    private _outlier: PrismaRepository<'outlierAlert'>
  ) {}

  // -- Post Snapshots --

  savePostSnapshot(data: {
    postId: string;
    organizationId: string;
    integrationId: string;
    projectId?: string;
    metric: string;
    value: number;
  }) {
    return this._postSnapshot.model.postAnalyticsSnapshot.create({
      data: {
        postId: data.postId,
        organizationId: data.organizationId,
        integrationId: data.integrationId,
        projectId: data.projectId || null,
        metric: data.metric,
        value: data.value,
      },
    });
  }

  savePostSnapshots(records: {
    postId: string;
    organizationId: string;
    integrationId: string;
    projectId?: string;
    metric: string;
    value: number;
  }[]) {
    return this._postSnapshot.model.postAnalyticsSnapshot.createMany({
      data: records.map((r) => ({
        ...r,
        projectId: r.projectId || null,
      })),
    });
  }

  getPostHistory(postId: string, metric: string, days: number) {
    return this._postSnapshot.model.postAnalyticsSnapshot.findMany({
      where: {
        postId,
        metric,
        fetchedAt: { gte: dayjs.utc().subtract(days, 'day').toDate() },
      },
      orderBy: { fetchedAt: 'asc' },
    });
  }

  // -- Account Snapshots --

  saveAccountSnapshot(data: {
    organizationId: string;
    integrationId: string;
    projectId?: string;
    metric: string;
    value: number;
    date: Date;
  }) {
    return this._accountSnapshot.model.accountAnalyticsSnapshot.upsert({
      where: {
        integrationId_metric_date: {
          integrationId: data.integrationId,
          metric: data.metric,
          date: data.date,
        },
      },
      create: {
        organizationId: data.organizationId,
        integrationId: data.integrationId,
        projectId: data.projectId || null,
        metric: data.metric,
        value: data.value,
        date: data.date,
      },
      update: {
        value: data.value,
      },
    });
  }

  getAccountHistory(integrationId: string, metric: string, days: number) {
    return this._accountSnapshot.model.accountAnalyticsSnapshot.findMany({
      where: {
        integrationId,
        metric,
        date: { gte: dayjs.utc().subtract(days, 'day').toDate() },
      },
      orderBy: { date: 'asc' },
    });
  }

  // -- Top/Bottom Posts --

  getTopPosts(orgId: string, projectId: string | null, days: number, limit: number) {
    return this._postSnapshot.model.postAnalyticsSnapshot.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { projectId } : {}),
        metric: 'views',
        fetchedAt: { gte: dayjs.utc().subtract(days, 'day').toDate() },
      },
      orderBy: { value: 'desc' },
      take: limit,
      distinct: ['postId'],
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishDate: true,
            integrationId: true,
            market: true,
          },
        },
      },
    });
  }

  getBottomPosts(orgId: string, projectId: string | null, days: number, limit: number) {
    return this._postSnapshot.model.postAnalyticsSnapshot.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { projectId } : {}),
        metric: 'views',
        fetchedAt: { gte: dayjs.utc().subtract(days, 'day').toDate() },
        value: { gt: 0 },
      },
      orderBy: { value: 'asc' },
      take: limit,
      distinct: ['postId'],
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishDate: true,
            integrationId: true,
            market: true,
          },
        },
      },
    });
  }

  // -- Outlier Alerts --

  createOutlierAlert(data: {
    postId: string;
    integrationId: string;
    organizationId: string;
    projectId?: string;
    market?: string;
    platform?: string;
    followerCountAtTime: number;
    viewCount: number;
    multiplier: number;
  }) {
    return this._outlier.model.outlierAlert.create({
      data: {
        ...data,
        projectId: data.projectId || null,
        market: data.market || null,
        platform: data.platform || null,
      },
    });
  }

  getOutliers(orgId: string, projectId: string | null, status?: string) {
    return this._outlier.model.outlierAlert.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishDate: true,
            market: true,
          },
        },
      },
    });
  }

  getOutlierById(id: string) {
    return this._outlier.model.outlierAlert.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishDate: true,
            market: true,
          },
        },
      },
    });
  }

  updateOutlierStatus(id: string, status: string, extra?: { analysisResult?: any; doubleDownDrafts?: any }) {
    return this._outlier.model.outlierAlert.update({
      where: { id },
      data: {
        status,
        ...(extra?.analysisResult !== undefined ? { analysisResult: extra.analysisResult } : {}),
        ...(extra?.doubleDownDrafts !== undefined ? { doubleDownDrafts: extra.doubleDownDrafts } : {}),
      },
    });
  }

  getExistingOutlierForPost(postId: string) {
    return this._outlier.model.outlierAlert.findFirst({
      where: { postId },
    });
  }
}
