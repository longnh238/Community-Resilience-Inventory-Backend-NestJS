import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { ResilocProxyStatus } from "../enum/resiloc-proxy-status.enum";
import { ResilocProxyType } from "../enum/resiloc-proxy-type.enum";
import { ResilocProxyVisibility } from "../enum/resiloc-proxy-visibility.enum";
import { ResilocProxyMetadataDto } from "./create-resiloc-proxy.dto";

export class UnitOfMeasurementDto {
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
    @ApiProperty({ required: false }) @IsBoolean() @IsOptional() readonly isDefault: boolean;
    @ApiProperty({ required: false }) @IsNumber() @IsOptional() readonly fromDefaultMultiplier: number;
    @ApiProperty({ required: false }) @IsNumber() @IsOptional() readonly toDefaultMultiplier: number;
}

export class UpdateResilocProxyDto {
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
    @ApiProperty({ required: false }) @IsString() readonly description: string;
    @ApiProperty({
        enum: ResilocProxyType,
        enumName: 'ResilocProxyType',
        required: false
    }) @IsEnum(ResilocProxyType, { each: true }) @IsOptional() readonly type: ResilocProxyType;
    @ApiProperty({
        type: String,
        isArray: true,
        required: false
    }) @IsArray() @IsNotEmpty() @IsOptional() readonly tags: string[];
    @ApiProperty({
        type: UnitOfMeasurementDto,
        isArray: true,
        required: false
    }) @IsArray() @IsNotEmpty() @ValidateNested() @Type(() => UnitOfMeasurementDto) @IsOptional() readonly unitOfMeasurement: UnitOfMeasurementDto[];
    @ApiProperty({
        enum: ResilocProxyVisibility,
        enumName: 'ResilocProxyVisibility',
        required: false
      }) @IsEnum(ResilocProxyVisibility, { each: true }) @IsOptional() readonly visibility: ResilocProxyVisibility;
    @ApiProperty({
        type: ResilocProxyMetadataDto,
        required: false
    }) @ValidateNested() @Type(() => ResilocProxyMetadataDto) @IsOptional() readonly metadata: ResilocProxyMetadataDto;
}

export class UpdateResilocProxyStatusDto {
    @ApiProperty({
        enum: ResilocProxyStatus,
        enumName: 'ResilocProxyStatus'
    }) @IsEnum(ResilocProxyStatus, { each: true }) readonly status: ResilocProxyStatus;
}