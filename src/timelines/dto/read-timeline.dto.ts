import { ApiProperty } from '@nestjs/swagger';
import { Snapshot } from '../../snapshots/schemas/snapshot.schema';

export class PaginationMetaDataTimelinesDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationDefaultTimelineDto {
  @ApiProperty({
    type: Snapshot,
    isArray: true
  }) items: Snapshot[];
  @ApiProperty({
    type: PaginationMetaDataTimelinesDto
  }) metadata: PaginationMetaDataTimelinesDto;
}