import { ApiProperty } from '@nestjs/swagger';
import { ResilocIndicator } from '../entities/resiloc-indicator.entity';

export class PaginationMetaDataResilocIndicatorsDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationResilocIndicatorsDto {
  @ApiProperty({
    type: ResilocIndicator,
    isArray: true
  }) items: ResilocIndicator[];
  @ApiProperty({
    type: PaginationMetaDataResilocIndicatorsDto
  }) metadata: PaginationMetaDataResilocIndicatorsDto;
}

export class PaginationResilocIndicatorTagsDto {
  @ApiProperty({
    type: String,
    isArray: true
  }) items: String[];
  @ApiProperty({
    type: PaginationMetaDataResilocIndicatorsDto
  }) metadata: PaginationMetaDataResilocIndicatorsDto;
}