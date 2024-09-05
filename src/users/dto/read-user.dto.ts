import { ApiProperty } from "@nestjs/swagger";
import { User } from "../schemas/user.schema";

export class PaginationMetaDataUsersDto {
    @ApiProperty() totalItems: number;
    @ApiProperty() itemsPerPage: number;
    @ApiProperty() currentPage: number;
    @ApiProperty() totalPages: number;
}

export class PaginationUsersDto {
    @ApiProperty({
        type: User,
        isArray: true
    }) items: User[];
    @ApiProperty({
        type: PaginationMetaDataUsersDto
    }) metadata: PaginationMetaDataUsersDto;
}