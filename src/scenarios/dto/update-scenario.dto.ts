import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { ResilocScenarioMetadataDto } from "../../resiloc-scenarios/dto/create-resiloc-scenario.dto";
import { ScenarioVisibility } from "../enum/scenario-visibility.enum";

export class UpdateScenarioDto {
  @ApiProperty({
    enum: ScenarioVisibility,
    enumName: 'ScenarioVisibility',
    required: false
  }) @IsEnum(ScenarioVisibility, { each: true }) @IsOptional() readonly visibility: ScenarioVisibility;
  @ApiProperty({
    type: ResilocScenarioMetadataDto,
    isArray: true
  }) @IsArray() @IsNotEmpty() @IsOptional() @ValidateNested() @Type(() => ResilocScenarioMetadataDto) readonly metadata: ResilocScenarioMetadataDto[];
}

export class UpdateScenarioIndicatorProxyDto {
  @ApiProperty() @IsNumber() @IsOptional() readonly relevance: number;
  @ApiProperty() @IsNumber() @IsOptional() readonly direction: number;
}