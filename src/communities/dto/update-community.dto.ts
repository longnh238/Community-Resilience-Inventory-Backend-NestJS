import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import * as mongoose from 'mongoose';
import { CommunityVisibility } from '../enum/community-visibility.enum';

class UpdateCommunityMetadataDto {
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly description: string;
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly geometry: string;
}

export class UpdateCommunityDto {
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly name: string;
    @ApiProperty({
        enum: CommunityVisibility,
        enumName: 'CommunityVisibility',
        required: false
    }) @IsEnum(CommunityVisibility, { each: true }) @IsOptional() readonly visibility: CommunityVisibility;
    @ApiProperty({
        type: UpdateCommunityMetadataDto,
        required: false
    }) @ValidateNested() @IsOptional() @Type(() => UpdateCommunityMetadataDto) readonly metadata: UpdateCommunityMetadataDto;
}

export class UserOfCommunityDto {
    @ApiProperty() @IsString() readonly username: string;
}

export class PointersToOtherCommunitiesDto {
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false
    }) @IsArray() @IsNotEmpty() @IsOptional() readonly parents: mongoose.Types.ObjectId[];
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false
    }) @IsArray() @IsNotEmpty() @IsOptional() readonly peers: mongoose.Types.ObjectId[];
    @ApiProperty({
        type: 'string',
        isArray: true,
        required: false
    }) @IsArray() @IsNotEmpty() @IsOptional() readonly children: mongoose.Types.ObjectId[];
}

export class CommunityStaticProxiesDto {
    @ApiProperty({
        type: 'string',
        isArray: true
    }) @IsArray() readonly resilocProxyIds: string[];
}

export class CommunityScenariosDto {
    @ApiProperty({
        type: 'string',
        isArray: true
    }) @IsArray() readonly resilocScenarioIds: string[];
}

export class SnapshotsOfCommunityDto {
    @ApiProperty({
        type: 'string',
        isArray: true
    }) @IsArray() readonly snapshots: mongoose.Types.ObjectId[];
}

