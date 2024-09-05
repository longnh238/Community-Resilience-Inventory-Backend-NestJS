import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import * as uniqueValidator from 'mongoose-unique-validator';
import { ResilocServiceRole } from '../../user-roles/enum/resiloc-service-role.enum';
import { UserRole } from '../../user-roles/enum/user-role.enum';
import { mongoose_unique_validator_error_tag } from '../../config/configuration';

function hashPassword(plain_password, saltRounds) {
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(plain_password, salt);
}

function normaliseText(text) {
  return text.replace(/\s/g, "").trim().toLowerCase();
}

function capitaliseFirstLetter(text) {
  return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');;
}

@Schema({ timestamps: { createdAt: 'dateCreated', updatedAt: 'dateModified' } })
export class User extends Document {
  @ApiProperty()
  @Prop({ type: String, unique: true, required: true, set: normalised_username => normaliseText(normalised_username) })
  username: string;

  @ApiProperty()
  @Prop({ type: String, required: true, set: plain_password => hashPassword(plain_password, 10) })
  password: string;

  @ApiProperty()
  @Prop({
    type: Map,
    of: { type: [String] },
    ref: 'Community',
    default: {}
  })
  userRoles: Map<ObjectId, UserRole[]>;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  @ApiProperty()
  @Prop({ type: ResilocServiceRole, default: '' })
  resilocServiceRole: ResilocServiceRole;

  @ApiProperty()
  @Prop({ type: String, default: '', set: plain_firstName => capitaliseFirstLetter(plain_firstName) })
  firstName: string;

  @ApiProperty()
  @Prop({ type: String, default: '', set: plain_lastName => capitaliseFirstLetter(plain_lastName) })
  lastName: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  phone: string;

  @ApiProperty()
  @Prop({ type: String, unique: true, required: true, set: plain_email => normaliseText(plain_email) })
  email: string;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(uniqueValidator, { message: mongoose_unique_validator_error_tag });




