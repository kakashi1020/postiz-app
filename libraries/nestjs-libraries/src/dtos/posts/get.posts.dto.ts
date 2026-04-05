import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { FunnelStage, Market } from '@prisma/client';

export class GetPostsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  customer: string;

  @IsOptional()
  @IsEnum(FunnelStage)
  funnelStage?: FunnelStage;

  @IsOptional()
  @IsEnum(Market)
  market?: Market;
}
