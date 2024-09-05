import { IsString, IsEnum, IsOptional, IsArray, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";
import { ObjectId } from "mongoose";
import { UserRole } from '../../user-roles/enum/user-role.enum';

export class UpdateUserDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly firstName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly lastName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly phone: string;
  @ApiProperty({ required: false }) @IsEmail() @IsOptional() readonly email: string;
}

export class UserRolesDto {
  @ApiProperty({ type: String }) @IsString() readonly communityId: ObjectId;
  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    isArray: true
  }) @ApiProperty() @IsArray() @IsNotEmpty() @IsEnum(UserRole, { each: true }) readonly userRoles: UserRole[];
}

export class UpdateUserPasswordDto {
  @ApiProperty({ required: true }) @IsString() readonly oldPassword: string;
  @ApiProperty({ required: true }) @IsString() readonly newPassword: string;
}

export class ResetUserPasswordDto {
  @ApiProperty({ required: true }) @IsString() readonly password: string;
  @ApiProperty({ required: true }) @IsString() readonly confirmPassword: string;
}