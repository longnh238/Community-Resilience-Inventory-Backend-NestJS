import { ApiProperty } from '@nestjs/swagger';
import { Scenario } from '../entities/scenario.entity';

export class ReadScenariosOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty({
    type: Scenario,
    isArray: true
  }) scenarios: Scenario[];
}

export class ReadScenarioIdsOfUserByCommunitiesDto {
  @ApiProperty() _id: string;
  @ApiProperty() name: string;
  @ApiProperty() scenarioIds: string[];
}

export class PaginationMetaDataScenariosDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() currentPage: number;
  @ApiProperty() totalPages: number;
}

export class PaginationScenariosDto {
  @ApiProperty({
    type: Scenario,
    isArray: true
  }) items: Scenario[];
  @ApiProperty({
    type: PaginationMetaDataScenariosDto
  }) metadata: PaginationMetaDataScenariosDto;
}