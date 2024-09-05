import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { AvailabilityType, ResilocProxyMetadataType, TypeOfDataType } from "../enum/resiloc-proxy-metadata-type.enum";
import { ResilocProxyType } from "../enum/resiloc-proxy-type.enum";
import { ResilocProxyVisibility } from "../enum/resiloc-proxy-visibility.enum";

export class MetadataBooleanDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty() @IsBoolean() @IsOptional() value: boolean;
}

export class MetadataStringDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty() @IsString() @IsOptional() value: string;
}

export class MetadataNumberDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty() @IsNumber() @IsOptional() value: number;
}

export class MetadataDateDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty({ example: '2021-01-01' }) @IsDateString() @IsOptional() value: Date;
}

export class MetadataDatePeriodDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty({ example: '2021-01-01' }) @IsDateString() @IsOptional() from: Date;
  @ApiProperty({ example: '2022-01-01' }) @IsDateString() @IsOptional() to: Date;
}

export class MetadataAvailabilityEnumDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty({
    enum: AvailabilityType,
    enumName: 'AvailabilityType'
  }) @IsEnum(AvailabilityType, { each: true }) @IsOptional() value: AvailabilityType;
}

export class MetadataTypeOfDataEnumDto {
  @ApiProperty({
    enum: ResilocProxyMetadataType,
    enumName: 'ResilocProxyMetadataType'
  }) @IsEnum(ResilocProxyMetadataType, { each: true }) readonly type: ResilocProxyMetadataType;
  @ApiProperty({
    enum: TypeOfDataType,
    enumName: 'TypeOfDataType'
  }) @IsEnum(TypeOfDataType, { each: true }) @IsOptional() value: TypeOfDataType;
}

export class ResilocProxyMetadataDto {
  @ApiProperty({
    type: MetadataBooleanDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataBooleanDto) certified: MetadataBooleanDto;
  @ApiProperty({
    type: MetadataDateDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataDateDto) dateOfData: MetadataDateDto;
  @ApiProperty({
    type: MetadataDatePeriodDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataDatePeriodDto) periodOfReference: MetadataDatePeriodDto;
  @ApiProperty({
    type: MetadataStringDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringDto) sourceType: MetadataStringDto;
  @ApiProperty({
    type: MetadataStringDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringDto) actualSource: MetadataStringDto;
  @ApiProperty({
    type: MetadataStringDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringDto) tooltip: MetadataStringDto;
  @ApiProperty({
    type: MetadataAvailabilityEnumDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataAvailabilityEnumDto) availability: MetadataAvailabilityEnumDto;
  @ApiProperty({
    type: MetadataTypeOfDataEnumDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataTypeOfDataEnumDto) typeOfData: MetadataTypeOfDataEnumDto;
}

export class UnitOfMeasurementDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty() @IsBoolean() readonly isDefault: boolean;
  @ApiProperty() @IsNumber() readonly fromDefaultMultiplier: number;
  @ApiProperty() @IsNumber() readonly toDefaultMultiplier: number;
}

export class CreateResilocProxyDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty() @IsString() @IsOptional() readonly description: string;
  @ApiProperty({
    enum: ResilocProxyType,
    enumName: 'ResilocProxyType'
  }) @IsEnum(ResilocProxyType, { each: true }) readonly type: ResilocProxyType;
  @ApiProperty({
    type: String,
    isArray: true
  }) @IsArray() @IsNotEmpty() readonly tags: string[];
  @ApiProperty({
    type: UnitOfMeasurementDto,
    isArray: true
  }) @IsArray() @IsNotEmpty() @ValidateNested() @Type(() => UnitOfMeasurementDto) readonly unitOfMeasurement: UnitOfMeasurementDto[];
  @ApiProperty({
    enum: ResilocProxyVisibility,
    enumName: 'ResilocProxyVisibility'
  }) @IsEnum(ResilocProxyVisibility, { each: true }) readonly visibility: ResilocProxyVisibility;
  @ApiProperty({
    type: ResilocProxyMetadataDto,
    required: true
  }) @ValidateNested() @Type(() => ResilocProxyMetadataDto) readonly metadata: ResilocProxyMetadataDto;
}