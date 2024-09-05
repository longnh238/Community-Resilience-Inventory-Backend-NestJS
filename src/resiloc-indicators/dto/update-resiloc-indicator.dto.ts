import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ResilocIndicatorStatus } from "../enum/resiloc-indicator-status.enum";
import { ResilocIndicatorContextType, ResilocIndicatorCriteriaType, ResilocIndicatorDimensionType } from "../enum/resiloc-indicator-type.enum";
import { ResilocIndicatorVisibility } from "../enum/resiloc-indicator-visibility.enum";

export class UpdateResilocIndicatorDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly description: string;
  @ApiProperty({
    enum: ResilocIndicatorContextType,
    enumName: 'ResilocIndicatorContextType'
  }) @IsEnum(ResilocIndicatorContextType, { each: true }) @IsOptional() readonly context: ResilocIndicatorContextType;
  @ApiProperty({
    enum: ResilocIndicatorCriteriaType,
    enumName: 'ResilocIndicatorCriteriaType'
  }) @IsEnum(ResilocIndicatorCriteriaType, { each: true }) @IsOptional() readonly criteria: ResilocIndicatorCriteriaType;
  @ApiProperty({
    enum: ResilocIndicatorDimensionType,
    enumName: 'ResilocIndicatorDimensionType'
  }) @IsEnum(ResilocIndicatorDimensionType, { each: true }) @IsOptional() readonly dimension: ResilocIndicatorDimensionType;
  @ApiProperty({
    enum: ResilocIndicatorVisibility,
    enumName: 'ResilocIndicatorVisibility',
    required: false
  }) @IsEnum(ResilocIndicatorVisibility, { each: true }) @IsOptional() readonly visibility: ResilocIndicatorVisibility;
  @ApiProperty({
    type: String,
    isArray: true,
    required: false
  }) @IsArray() @IsNotEmpty() @IsOptional() readonly tags: string[];
}

export class UpdateResilocIndicatorStatusDto {
  @ApiProperty({
    enum: ResilocIndicatorStatus,
    enumName: 'ResilocIndicatorStatus'
  }) @IsEnum(ResilocIndicatorStatus, { each: true }) readonly status: ResilocIndicatorStatus;
}