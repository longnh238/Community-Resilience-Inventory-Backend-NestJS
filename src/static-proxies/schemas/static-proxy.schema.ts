import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StaticProxyType } from '../enum/static-proxy-type.enum';
import { StaticProxyMetadata, StaticProxyMetadataSchema } from './static-proxy-metadata.schema';

@Schema({ collection: 'static_proxies' })
export class StaticProxy extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: StaticProxyType, required: true })
  type: StaticProxyType;

  @Prop({ type: Number, required: true })
  vector: number;

  @Prop({ type: Number, required: true })
  availability: number;

  @Prop({ type: Number, required: true })
  relation: number;

  @Prop({ type: Date, required: true, default: Date.now })
  dateCreated: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  dateModified: Date;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: StaticProxyMetadataSchema, required: true })
  metadata: StaticProxyMetadata;
}

export const StaticProxySchema = SchemaFactory.createForClass(StaticProxy);
