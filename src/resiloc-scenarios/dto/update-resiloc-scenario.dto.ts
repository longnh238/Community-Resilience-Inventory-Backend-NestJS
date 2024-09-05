import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { ResilocScenarioVisibility } from "../enum/resiloc-scenario-visibility.enum";
import { ResilocScenarioMetadataDto } from "./create-resiloc-scenario.dto";

export class UpdateResilocScenarioDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly description: string;
  @ApiProperty({
    enum: ResilocScenarioVisibility,
    enumName: 'ResilocScenarioVisibility',
    required: false
  }) @IsEnum(ResilocScenarioVisibility, { each: true }) @IsOptional() readonly visibility: ResilocScenarioVisibility;
  @ApiProperty({
    type: ResilocScenarioMetadataDto,
    isArray: true
  }) @IsArray() @IsNotEmpty() @IsOptional() @ValidateNested() @Type(() => ResilocScenarioMetadataDto) readonly metadata: ResilocScenarioMetadataDto[];
}

export class UpdateResilocScenarioIndicatorProxyDto {
  @ApiProperty() @IsNumber() @IsOptional() readonly relevance: number;
  @ApiProperty() @IsNumber() @IsOptional() readonly direction: number;
}