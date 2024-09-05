import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ResilocIndicatorContextType, ResilocIndicatorCriteriaType, ResilocIndicatorDimensionType } from "../enum/resiloc-indicator-type.enum";

export class CreateResilocIndicatorDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty() @IsString() readonly description: string;
  @ApiProperty({
    enum: ResilocIndicatorContextType,
    enumName: 'ResilocIndicatorContextType'
  }) @IsEnum(ResilocIndicatorContextType, { each: true }) readonly context: ResilocIndicatorContextType;
  @ApiProperty({
    enum: ResilocIndicatorCriteriaType,
    enumName: 'ResilocIndicatorCriteriaType'
  }) @IsEnum(ResilocIndicatorCriteriaType, { each: true }) readonly criteria: ResilocIndicatorCriteriaType;
  @ApiProperty({
    enum: ResilocIndicatorDimensionType,
    enumName: 'ResilocIndicatorDimensionType'
  }) @IsEnum(ResilocIndicatorDimensionType, { each: true }) readonly dimension: ResilocIndicatorDimensionType;
  @ApiProperty({
    type: String,
    isArray: true
  }) @IsArray() @IsNotEmpty() readonly tags: string[];
}

export class CreateResilocProxiesOfResilocIndicatorDto {
  @ApiProperty({
    type: 'string',
    isArray: true
  }) @IsArray() readonly resilocProxyIds: string[];
}