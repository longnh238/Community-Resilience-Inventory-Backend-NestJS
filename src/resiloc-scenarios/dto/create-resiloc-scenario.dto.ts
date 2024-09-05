import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { IsType } from "../../common/decorator/is-type.decorator";
import { ResilocScenarioProxyFormulaType } from "../enum/resiloc-scenario-associated-proxy.enum";
import { ResilocScenarioMetadataMandatory, ResilocScenarioMetadataType } from "../enum/resiloc-scenario-metadata.enum";

export class ResilocScenarioMetadataDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty({
    enum: ResilocScenarioMetadataType,
    enumName: 'ResilocScenarioMetadataType'
  }) @IsEnum(ResilocScenarioMetadataType, { each: true }) type: ResilocScenarioMetadataType;
  @ApiProperty({
    enum: ResilocScenarioMetadataMandatory,
    enumName: 'ResilocScenarioMetadataMandatory'
  }) @IsEnum(ResilocScenarioMetadataMandatory, { each: true }) mandatory: ResilocScenarioMetadataMandatory;
  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'number' },
    ]
  }) @IsType(["string", "number"]) readonly value: string | number;
}

export class CreateResilocScenarioDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty() @IsString() readonly description: string;
  @ApiProperty({
    type: ResilocScenarioMetadataDto,
    isArray: true
  }) @IsArray() @IsNotEmpty() @IsOptional() @ValidateNested() @Type(() => ResilocScenarioMetadataDto) readonly metadata: ResilocScenarioMetadataDto[];
}

export class CreateResilocIndicatorsOfResilocProxyDto {
  @ApiProperty({
    type: 'string',
    isArray: true
  }) @IsArray() readonly resilocIndicatorIds: string[];
  @ApiProperty({
    enum: ResilocScenarioProxyFormulaType,
    enumName: 'FormulaType'
  }) @IsEnum(ResilocScenarioProxyFormulaType, { each: true }) @IsOptional() readonly formula: ResilocScenarioProxyFormulaType;
}

export class CreateResilocScenarioIndicatorDto {
  @ApiProperty() @IsString() _id: string;
}