import { ApiProperty } from '@nestjs/swagger';
import { Snapshot } from '../schemas/snapshot.schema';

export class ReadSnapshotsOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty({
    type: Snapshot,
    isArray: true
  }) snapshots: Snapshot[];
}

export class ReadSnapshotIdsOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty() snapshotIds: string[];
}


export class PaginationMetaDataSnapshotsDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationSnapshotsDto {
  @ApiProperty({
    type: Snapshot,
    isArray: true
  }) items: Snapshot[];
  @ApiProperty({
    type: PaginationMetaDataSnapshotsDto
  }) metadata: PaginationMetaDataSnapshotsDto;
}