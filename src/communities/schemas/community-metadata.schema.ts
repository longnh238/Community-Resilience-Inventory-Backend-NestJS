import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class CommunityMetadata {
    @Prop({ type: String, default: "" })
    description: string;

    @Prop({ type: String, default: "" })
    geometry: string;
}

export const CommunityMetadataSchema = SchemaFactory.createForClass(CommunityMetadata);