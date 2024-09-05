import { ApiProperty } from "@nestjs/swagger";
import { ObjectId } from "mongoose";
import { UserRole } from "../../user-roles/enum/user-role.enum";
import { Community } from "../schemas/community.schema";

export class PaginationMetaDataCommunitiesDto {
    @ApiProperty() totalItems: number;
    @ApiProperty() itemsPerPage: number;
    @ApiProperty() currentPage: number;
    @ApiProperty() totalPages: number;
}

export class PaginationCommunitiesDto {
    @ApiProperty({
        type: Community,
        isArray: true
    }) items: Community[];
    @ApiProperty({
        type: PaginationMetaDataCommunitiesDto
    }) metadata: PaginationMetaDataCommunitiesDto;
}

export class CommunityToFollowDto {
    @ApiProperty() _id: ObjectId;
    @ApiProperty() name: string;
}

export class PaginationCommunitiesToFollowDto {
    @ApiProperty({
        type: CommunityToFollowDto,
        isArray: true
    }) items: CommunityToFollowDto[];
    @ApiProperty({
        type: PaginationMetaDataCommunitiesDto
    }) metadata: PaginationMetaDataCommunitiesDto;
}

export class FollowedCommunityDto {
    @ApiProperty({
        enum: UserRole,
        enumName: 'UserRole',
        isArray: true
    }) userRoles: UserRole[];
    @ApiProperty() _id: ObjectId;
    @ApiProperty() name: string;
}

export class PaginationFollowedCommunitiesDto {
    @ApiProperty({
        type: FollowedCommunityDto,
        isArray: true
    }) items: FollowedCommunityDto[];
    @ApiProperty({
        type: PaginationMetaDataCommunitiesDto
    }) metadata: PaginationMetaDataCommunitiesDto;
}

export class UsersOfCommunityDto {
    @ApiProperty() _id: ObjectId;
    @ApiProperty() username: string;
    @ApiProperty() firstName: string;
    @ApiProperty() lastName: string;
    @ApiProperty() phone: string;
    @ApiProperty() email: string;
    @ApiProperty({
        enum: UserRole,
        enumName: 'UserRole',
        isArray: true
    }) userRoles: UserRole[];
}

export class PaginationUsersOfCommunityDto {
    @ApiProperty({
        type: UsersOfCommunityDto,
        isArray: true
    }) items: UsersOfCommunityDto[];
    @ApiProperty({
        type: PaginationMetaDataCommunitiesDto
    }) metadata: PaginationMetaDataCommunitiesDto;
}