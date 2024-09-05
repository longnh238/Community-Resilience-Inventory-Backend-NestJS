import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { SnapshotStatus } from '../enum/snapshot-status.enum';
import { SnapshotType } from '../enum/snapshot-type.enum';
import { SnapshotVisibility } from '../enum/snapshot-visibility.enum';

@Schema({ timestamps: { createdAt: 'dateCreated', updatedAt: 'dateModified' } })
export class Snapshot extends Document {
  @ApiProperty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({
    enum: SnapshotType,
    enumName: 'SnapshotType'
  })
  @Prop({ type: SnapshotType, required: true })
  type: SnapshotType;

  @ApiProperty()
  @Prop({ type: String, default: "" })
  description: string;

  @ApiProperty({
    enum: SnapshotVisibility,
    enumName: 'SnapshotVisibility'
  })
  @Prop({ type: SnapshotVisibility, required: true, default: SnapshotVisibility.Draft })
  visibility: SnapshotVisibility;

  @ApiProperty()
  @Prop({ type: Date, required: true, default: Date.now })
  dateSubmitted: Date;

  @ApiProperty({
    enum: SnapshotStatus,
    enumName: 'SnapshotStatus'
  })
  @Prop({ type: SnapshotStatus, required: true, default: SnapshotStatus.OnHold })
  status: SnapshotStatus;

  @ApiProperty()
  @Prop({ type: [String], required: true })
  staticProxies: string[];
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot);