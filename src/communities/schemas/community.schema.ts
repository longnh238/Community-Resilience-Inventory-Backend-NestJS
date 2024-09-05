import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import * as mongoose from 'mongoose';
import { Document, ObjectId } from 'mongoose';
import * as uniqueValidator from 'mongoose-unique-validator';
import { mongoose_unique_validator_error_tag } from '../../config/configuration';
import { CommunityVisibility } from '../enum/community-visibility.enum';
import { CommunityMetadata, CommunityMetadataSchema } from './community-metadata.schema';

function normaliseText(text): string {
    return text.replace(/\s\s+/g, ' ').trim();
}

@Schema({ timestamps: { createdAt: 'dateCreated', updatedAt: 'dateModified' } })
export class Community extends Document {
    @ApiProperty()
    @Prop({ type: String, unique: true, required: true, set: plain_name => normaliseText(plain_name) })
    name: string;

    @ApiProperty()
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
    users: ObjectId[];

    @ApiProperty()
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Community', default: [] })
    parents: ObjectId[];

    @ApiProperty()
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Community', default: [] })
    peers: ObjectId[];

    @ApiProperty()
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Community', default: [] })
    children: ObjectId[];

    @ApiProperty()
    @Prop({ type: [String], required: true })
    requestedProxies: string[];

    @ApiProperty()
    @Prop({
        type: Map,
        of: { type: String },
        default: {}
    })
    staticProxies: Map<string, string>;

    @ApiProperty()
    @Prop({
        type: Map,
        of: { type: String },
        default: {}
    })
    scenarios: Map<string, string>;

    @ApiProperty()
    @Prop({ type: [String], required: true })
    requestedIndicators: string[];

    @ApiProperty()
    @Prop({
        type: Map,
        of: { type: String },
        default: {}
    })
    indicators: Map<string, string>;

    @ApiProperty()
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Snapshot', default: [] })
    snapshots: ObjectId[];

    @ApiProperty({
        enum: CommunityVisibility,
        enumName: 'CommunityVisibility'
    })
    @Prop({ type: CommunityVisibility, required: true, default: CommunityVisibility.Draft })
    visibility: CommunityVisibility;

    @ApiProperty()
    @Prop({ type: CommunityMetadataSchema, default: new CommunityMetadata })
    metadata: CommunityMetadata;
}

export const CommunitySchema = SchemaFactory.createForClass(Community);
CommunitySchema.plugin(uniqueValidator, { message: mongoose_unique_validator_error_tag });