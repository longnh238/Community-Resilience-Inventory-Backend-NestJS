import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { ResilocProxyMetadataDto } from '../../resiloc-proxies/dto/create-resiloc-proxy.dto';
import { StaticProxyVisibility } from '../enum/static-proxy-visibility.enum';

export class UpdateStaticProxyOfSnapshotDto {
  @ApiProperty({ required: false }) @IsNumber() @IsOptional() value: number;
  @ApiProperty({
    enum: StaticProxyVisibility,
    enumName: 'StaticProxyVisibility',
    required: false
  }) @IsEnum(StaticProxyVisibility, { each: true }) @IsOptional() readonly visibility: StaticProxyVisibility;
  @ApiProperty({
    type: ResilocProxyMetadataDto,
    required: false
  }) @ValidateNested() @Type(() => ResilocProxyMetadataDto) @IsOptional() readonly metadata: ResilocProxyMetadataDto;
}

export class UpdateStaticProxyOfCommunityDto {
  @ApiProperty({
    enum: StaticProxyVisibility,
    enumName: 'StaticProxyVisibility',
    required: false
  }) @IsEnum(StaticProxyVisibility, { each: true }) @IsOptional() readonly visibility: StaticProxyVisibility;
  @ApiProperty({ required: false }) @IsNumber() @IsOptional() minTarget: number;
  @ApiProperty({ required: false }) @IsNumber() @IsOptional() maxTarget: number;
  @ApiProperty({
    type: ResilocProxyMetadataDto,
    required: false
  }) @ValidateNested() @Type(() => ResilocProxyMetadataDto) @IsOptional() readonly metadata: ResilocProxyMetadataDto;
}

