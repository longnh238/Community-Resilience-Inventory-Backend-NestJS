import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty() @IsString() readonly username: string;
  @ApiProperty() @IsString() readonly password: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly firstName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly lastName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() readonly phone: string;
  @ApiProperty() @IsEmail() readonly email: string;
}