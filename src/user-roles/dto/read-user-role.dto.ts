import { ApiProperty } from "@nestjs/swagger";
import { ObjectId } from "mongoose";
import { UserRole } from "../enum/user-role.enum";

export class UserRolesByCommunitiesDto {
     @ApiProperty() _id: ObjectId;
     @ApiProperty() name: string;
     @ApiProperty({
          type: UserRole,
          isArray: true
     }) userRoles: UserRole[];
}