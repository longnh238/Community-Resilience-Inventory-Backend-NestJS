import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString } from 'class-validator';
import * as mongoose from 'mongoose';
import { TimelineVisibility } from '../enum/timeline-visibility.enum';

export class CreateTimelineDto {
    @ApiProperty() @IsString() readonly name: string;
    @ApiProperty({
        enum: TimelineVisibility,
        enumName: 'TimelineVisibility'
    }) @IsEnum(TimelineVisibility, { each: true }) readonly visibility: TimelineVisibility;
    @ApiProperty({
        type: 'mongoose.Types.ObjectId',
        isArray: true
    }) @IsArray() readonly snapshots: mongoose.Types.ObjectId[];
}