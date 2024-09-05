import { ApiProperty } from '@nestjs/swagger';
import { ResilocProxy } from '../entities/resiloc-proxy.entity';

export class PaginationMetaDataResilocProxiesDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationResilocProxiesDto {
  @ApiProperty({
    type: ResilocProxy,
    isArray: true
  }) items: ResilocProxy[];
  @ApiProperty({
    type: PaginationMetaDataResilocProxiesDto
  }) metadata: PaginationMetaDataResilocProxiesDto;
}

export class PaginationResilocProxiyTagsDto {
  @ApiProperty({
    type: String,
    isArray: true
  }) items: String[];
  @ApiProperty({
    type: PaginationMetaDataResilocProxiesDto
  }) metadata: PaginationMetaDataResilocProxiesDto;
}