import { ApiProperty } from '@nestjs/swagger';
import { StaticProxy } from '../entities/static-proxy.entity';

export class ReadStaticProxiesOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty({
    type: StaticProxy,
    isArray: true
  }) staticProxies: StaticProxy[];
}

export class ReadStaticProxyIdsOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty() staticProxyIds: string[];
}

export class PaginationMetaDataStaticProxiesDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationStaticProxiesDto {
  @ApiProperty({
    type: StaticProxy,
    isArray: true
  }) items: StaticProxy[];
  @ApiProperty({
    type: PaginationMetaDataStaticProxiesDto
  }) metadata: PaginationMetaDataStaticProxiesDto;
}