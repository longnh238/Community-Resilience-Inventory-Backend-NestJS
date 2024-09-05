import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document, ObjectId } from 'mongoose';
import { TimelineVisibility } from '../enum/timeline-visibility.enum';

@Schema({ timestamps: { createdAt: 'dateCreated', updatedAt: 'dateModified' } })
export class Timeline extends Document {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: TimelineVisibility, required: true, default: TimelineVisibility.Draft })
    visibility: TimelineVisibility;

    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Snapshot', required: true })
    snapshots: ObjectId[];
}

export const TimelineSchema = SchemaFactory.createForClass(Timeline);