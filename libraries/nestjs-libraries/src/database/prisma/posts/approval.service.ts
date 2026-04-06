import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { ApprovalStatus } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Injectable()
export class ApprovalService {
  constructor(
    private _postRepository: PostsRepository,
    private _postsService: PostsService
  ) {}

  async submitForApproval(orgId: string, group: string) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    if (!posts.length) {
      throw new NotFoundException('Post group not found');
    }

    const firstPost = posts[0];
    if (firstPost.approvalStatus === ApprovalStatus.PENDING) {
      throw new BadRequestException('Post is already pending approval');
    }

    await this._updateApprovalForGroup(orgId, group, {
      approvalStatus: ApprovalStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    });

    return { status: 'pending' };
  }

  async approve(
    orgId: string,
    group: string,
    userId: string,
    expectedUpdatedAt?: string
  ) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    if (!posts.length) {
      throw new NotFoundException('Post group not found');
    }

    const firstPost = posts[0];

    // Race condition guard: check that the post hasn't been modified since the
    // approver loaded it. We compare against the first (root) post's updatedAt.
    if (expectedUpdatedAt) {
      const postUpdatedAt = dayjs(firstPost.updatedAt).toISOString();
      const expected = dayjs(expectedUpdatedAt).toISOString();
      if (postUpdatedAt !== expected) {
        throw new ConflictException(
          'Post was modified after you loaded it. Please reload and review again.'
        );
      }
    }

    // Validate that publishDate is still in the future
    if (
      firstPost.state !== 'DRAFT' &&
      dayjs.utc().isAfter(dayjs.utc(firstPost.publishDate))
    ) {
      throw new BadRequestException(
        'The scheduled publish date has passed. Please reschedule the post before approving.'
      );
    }

    const now = new Date();
    await this._updateApprovalForGroup(orgId, group, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: userId,
      approvedAt: now,
      rejectionReason: null,
    });

    // Now trigger the Temporal workflow for each root post in the group,
    // mirroring the logic from PostsService.createPost().
    for (const post of posts) {
      if (post.parentPostId) continue; // only root posts
      if (post.state === 'DRAFT') continue; // drafts don't get workflows

      const taskQueue = (post.integration as any)?.providerIdentifier
        ?.split('-')[0]
        ?.toLowerCase();

      if (taskQueue) {
        this._postsService
          .startWorkflow(taskQueue, post.id, orgId, post.state)
          .catch(() => {});
      }
    }

    return { status: 'approved' };
  }

  async reject(orgId: string, group: string, userId: string, reason: string) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    if (!posts.length) {
      throw new NotFoundException('Post group not found');
    }

    await this._updateApprovalForGroup(orgId, group, {
      approvalStatus: ApprovalStatus.REJECTED,
      approvedBy: userId,
      approvedAt: null,
      rejectionReason: reason,
    });

    return { status: 'rejected' };
  }

  async requestChanges(
    orgId: string,
    group: string,
    userId: string,
    reason: string
  ) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    if (!posts.length) {
      throw new NotFoundException('Post group not found');
    }

    await this._updateApprovalForGroup(orgId, group, {
      approvalStatus: ApprovalStatus.CHANGES_REQUESTED,
      approvedBy: userId,
      approvedAt: null,
      rejectionReason: reason,
    });

    return { status: 'changes_requested' };
  }

  private async _updateApprovalForGroup(
    orgId: string,
    group: string,
    data: {
      approvalStatus: ApprovalStatus;
      approvedBy: string | null;
      approvedAt: Date | null;
      rejectionReason: string | null;
    }
  ) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    for (const post of posts) {
      await this._postRepository.updateApprovalStatus(post.id, data);
    }
  }
}
