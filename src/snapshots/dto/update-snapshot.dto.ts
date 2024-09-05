import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { SnapshotType } from '../enum/snapshot-type.enum';
import { SnapshotVisibility } from '../enum/snapshot-visibility.enum';
import { StaticProxyOfSnapshotMetadataValueDto } from './create-snapshot.dto';

export class UpdateStaticProxyOfSnapshotDto {
  @ApiProperty() @IsUUID() @IsOptional() readonly staticProxyId: string;
  @ApiProperty() @IsNumber() @IsOptional() readonly value: number;
  @ApiProperty({
    type: StaticProxyOfSnapshotMetadataValueDto,
    required: false
  }) @ValidateNested() @Type(() => StaticProxyOfSnapshotMetadataValueDto) @IsOptional() readonly metadataValue: StaticProxyOfSnapshotMetadataValueDto;
}

export class UpdateSnapshotDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
  @ApiProperty({
    enum: SnapshotType,
    enumName: 'SnapshotType',
    required: false
  }) @IsEnum(SnapshotType, { each: true }) @IsOptional() readonly type: SnapshotType;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly description: string;
  @ApiProperty({
    enum: SnapshotVisibility,
    enumName: 'SnapshotVisibility',
    required: false
  }) @IsEnum(SnapshotVisibility, { each: true }) @IsOptional() readonly visibility: SnapshotVisibility;
  @ApiProperty({
    type: UpdateStaticProxyOfSnapshotDto,
    isArray: true,
    required: false
  }) @IsArray() @IsNotEmpty() @ValidateNested() @Type(() => UpdateStaticProxyOfSnapshotDto) @IsOptional() readonly staticProxies: UpdateStaticProxyOfSnapshotDto[];
}

class AssignStaticProxyDto {
  @ApiProperty() @IsUUID() readonly staticProxyId: string;
  @ApiProperty() @IsString() readonly value: number;
}

export class AssignStaticProxiesForSnapshotDto {
  @ApiProperty({
    type: AssignStaticProxyDto,
    isArray: true
  }) @IsArray() readonly staticProxies: AssignStaticProxyDto[];
}