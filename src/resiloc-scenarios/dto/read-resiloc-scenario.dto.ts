import { ApiProperty } from '@nestjs/swagger';
import { ResilocScenario } from '../entities/resiloc-scenario.entity';


export class PaginationMetaDataResilocScenariosDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationResilocScenariosDto {
  @ApiProperty({
    type: ResilocScenario,
    isArray: true
  }) items: ResilocScenario[];
  @ApiProperty({
    type: PaginationMetaDataResilocScenariosDto
  }) metadata: PaginationMetaDataResilocScenariosDto;
}