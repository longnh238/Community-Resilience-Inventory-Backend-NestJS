import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { AvailabilityType, TypeOfDataType } from '../../resiloc-proxies/enum/resiloc-proxy-metadata-type.enum';
import { SnapshotType } from '../enum/snapshot-type.enum';
import { SnapshotVisibility } from '../enum/snapshot-visibility.enum';

class MetadataBooleanValueDto {
  @ApiProperty() @IsBoolean() @IsOptional() value: boolean;
}

class MetadataStringValueDto {
  @ApiProperty() @IsString() @IsOptional() value: string;
}

class MetadataDateValueDto {
  @ApiProperty({ example: '2021-01-01' }) @IsDateString() @IsOptional() value: Date;
}

class MetadataDateFromToDto {
  @ApiProperty({ example: '2021-01-01' }) @IsDateString() @IsOptional() from: Date;
  @ApiProperty({ example: '2022-01-01' }) @IsDateString() @IsOptional() to: Date;
}

class MetadataAvailabilityEnumValueDto {
  @ApiProperty({
    enum: AvailabilityType,
    enumName: 'AvailabilityType'
  }) @IsEnum(AvailabilityType, { each: true }) @IsOptional() value: AvailabilityType;
}

class MetadataTypeOfDataEnumValueDto {
  @ApiProperty({
    enum: TypeOfDataType,
    enumName: 'TypeOfDataType'
  }) @IsEnum(TypeOfDataType, { each: true }) @IsOptional() value: TypeOfDataType;
}

export class StaticProxyOfSnapshotMetadataValueDto {
  @ApiProperty({
    type: MetadataBooleanValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataBooleanValueDto) @IsOptional() certified: MetadataBooleanValueDto;
  @ApiProperty({
    type: MetadataDateValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataDateValueDto) @IsOptional() dateOfData: MetadataDateValueDto;
  @ApiProperty({
    type: MetadataDateFromToDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataDateFromToDto) @IsOptional() periodOfReference: MetadataDateFromToDto;
  @ApiProperty({
    type: MetadataStringValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringValueDto) @IsOptional() sourceType: MetadataStringValueDto;
  @ApiProperty({
    type: MetadataStringValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringValueDto) @IsOptional() actualSource: MetadataStringValueDto;
  @ApiProperty({
    type: MetadataStringValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataStringValueDto) @IsOptional() tooltip: MetadataStringValueDto;
  @ApiProperty({
    type: MetadataAvailabilityEnumValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataAvailabilityEnumValueDto) @IsOptional() availability: MetadataAvailabilityEnumValueDto;
  @ApiProperty({
    type: MetadataTypeOfDataEnumValueDto,
    required: false
  }) @ValidateNested() @Type(() => MetadataTypeOfDataEnumValueDto) @IsOptional() typeOfData: MetadataTypeOfDataEnumValueDto;
}

export class CreateStaticProxyOfSnapshotDto {
  @ApiProperty() @IsUUID() readonly staticProxyId: string;
  @ApiProperty() @IsNumber() readonly value: number;
  @ApiProperty({
    type: StaticProxyOfSnapshotMetadataValueDto,
    required: false
  }) @ValidateNested() @Type(() => StaticProxyOfSnapshotMetadataValueDto) @IsOptional() readonly metadataValue: StaticProxyOfSnapshotMetadataValueDto;
}

export class CreateSnapshotDto {
  @ApiProperty() @IsString() readonly name: string;
  @ApiProperty({
    enum: SnapshotType,
    enumName: 'SnapshotType'
  }) @IsEnum(SnapshotType, { each: true }) readonly type: SnapshotType;
  @ApiProperty() @IsString() readonly description: string;
  @ApiProperty({
    enum: SnapshotVisibility,
    enumName: 'SnapshotVisibility'
  }) @IsEnum(SnapshotVisibility, { each: true }) readonly visibility: SnapshotVisibility;
}