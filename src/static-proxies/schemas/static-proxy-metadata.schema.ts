import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class StaticProxyMetadata {
  @Prop({ type: Boolean, retured: true })
  certified: boolean;

  @Prop({ type: Date, required: true, default: Date.now })
  dateOfData: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  periodOfReference: Date;

  @Prop({ type: String, required: true })
  sourceType: string;

  @Prop({ type: String, required: true })
  actualSource: string;

  @Prop({ type: String, required: true })
  tooltip: string;

  @Prop({ type: String, required: true })
  typeOfData: string;
}

export const StaticProxyMetadataSchema = SchemaFactory.createForClass(StaticProxyMetadata);
