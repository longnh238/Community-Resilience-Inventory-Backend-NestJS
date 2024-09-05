import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CommunityVisibility } from '../enum/community-visibility.enum';

class CreateCommunityMetadataDto {
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly description: string;
    @ApiProperty({ required: false }) @IsString() @IsOptional() readonly geometry: string;
}

export class CreateCommunityDto {
    @ApiProperty() @IsString() readonly name: string;
    @ApiProperty({
        enum: CommunityVisibility,
        enumName: 'CommunityVisibilityType'
    }) @IsEnum(CommunityVisibility, { each: true }) readonly visibility: CommunityVisibility;
    @ApiProperty({
        type: CreateCommunityMetadataDto
    }) @ValidateNested() @Type(() => CreateCommunityMetadataDto) readonly metadata: CreateCommunityMetadataDto;
}