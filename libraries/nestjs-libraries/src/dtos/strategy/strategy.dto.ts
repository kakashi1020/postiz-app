import {
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FunnelStage, Market } from '@prisma/client';

export class GenerateStrategyDto {
  @IsDefined()
  @IsString()
  projectId: string;

  @IsDefined()
  @IsEnum(Market)
  market: Market;

  @IsDefined()
  @IsString()
  platform: string;

  @IsDefined()
  @IsEnum(FunnelStage)
  funnelStage: FunnelStage;

  @IsOptional()
  @IsString()
  frameworkDoc?: string;
}

export class GenerateHooksDto {
  @IsDefined()
  @IsString()
  topic: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  count?: number;
}

export class GenerateScriptDto {
  @IsDefined()
  @IsString()
  topic: string;

  @IsDefined()
  @IsString()
  structure: string;
}

export class GenerateCaptionDto {
  @IsDefined()
  @IsEnum(Market)
  market: Market;

  @IsDefined()
  @IsString()
  platform: string;

  @IsDefined()
  @IsString()
  pillar: string;

  @IsDefined()
  @IsString()
  postContent: string;
}

export class AnalyzeOutlierDto {
  @IsDefined()
  @IsString()
  postContent: string;

  @IsDefined()
  @IsEnum(Market)
  market: Market;
}
