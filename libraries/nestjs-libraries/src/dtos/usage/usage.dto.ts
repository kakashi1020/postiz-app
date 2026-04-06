import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SetBudgetDto {
  @IsDefined()
  @IsString()
  service: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  monthlyCapUsd: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  warningThreshold?: number;
}

export class MonthYearQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  year?: number;
}

export class ServiceQueryDto extends MonthYearQueryDto {
  @IsOptional()
  @IsString()
  service?: string;
}
