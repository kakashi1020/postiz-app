import { Global, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

@Injectable()
export class InfiniteWorkflowRegister implements OnModuleInit {
  private readonly logger = new Logger(InfiniteWorkflowRegister.name);

  constructor(private _temporalService: TemporalService) {}

  async onModuleInit(): Promise<void> {
    if (!!process.env.RUN_CRON) {
      try {
        const client = this._temporalService.client?.getRawClient();
        if (!client) {
          this.logger.warn(
            'Temporal client not available — skipping infinite workflow registration'
          );
          return;
        }
        await client.workflow.start('missingPostWorkflow', {
          workflowId: 'missing-post-workflow',
          taskQueue: 'main',
        });
      } catch (err) {
        this.logger.warn(
          'Failed to start missingPostWorkflow — Temporal may be unavailable',
          err instanceof Error ? err.message : err
        );
      }
    }
  }
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [InfiniteWorkflowRegister],
  get exports() {
    return this.providers;
  },
})
export class InfiniteWorkflowRegisterModule {}
