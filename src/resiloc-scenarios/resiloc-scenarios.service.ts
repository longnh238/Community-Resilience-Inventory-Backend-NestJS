import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { arrSubtraction } from '../common/utilities/array-utilities';
import { HelpersService } from '../helpers/helpers.service';
import { ResilocIndicatorStatus } from '../resiloc-indicators/enum/resiloc-indicator-status.enum';
import { ResilocIndicatorVisibility } from '../resiloc-indicators/enum/resiloc-indicator-visibility.enum';
import { ResilocIndicatorsService } from '../resiloc-indicators/resiloc-indicators.service';
import { UsersService } from '../users/users.service';
import { CreateResilocIndicatorsOfResilocProxyDto as CreateResilocIndicatorsOfResilocScenarioDto, CreateResilocScenarioDto, CreateResilocScenarioIndicatorDto } from './dto/create-resiloc-scenario.dto';
import { PaginationMetaDataResilocScenariosDto, PaginationResilocScenariosDto } from './dto/read-resiloc-scenario.dto';
import { UpdateResilocScenarioDto, UpdateResilocScenarioIndicatorProxyDto } from './dto/update-resiloc-scenario.dto';
import { ResilocScenarioIndicatorProxy } from './entities/resiloc-scenario-indicator-proxy.entity';
import { ResilocScenario, ResilocScenarioMetaData } from './entities/resiloc-scenario.entity';
import { ResilocScenarioMetadataType } from './enum/resiloc-scenario-metadata.enum';
import { ResilocScenarioStatus } from './enum/resiloc-scenario-status.enum';
import { ResilocScenarioVisibility } from './enum/resiloc-scenario-visibility.enum';

@Injectable()
export class ResilocScenariosService {
     constructor(
          @InjectRepository(ResilocScenario) private readonly resilocScenarioRepository: Repository<ResilocScenario>,
          @InjectRepository(ResilocScenarioIndicatorProxy) private readonly resilocScenarioIndicatorProxyRepository: Repository<ResilocScenarioIndicatorProxy>,
          @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
          @Inject(forwardRef(() => ResilocIndicatorsService)) private readonly resilocIndicatorsService: ResilocIndicatorsService,
          private readonly configService: ConfigService,
          private readonly helpersService: HelpersService
     ) { }

     async create(createResilocScenarioDto: CreateResilocScenarioDto): Promise<ResilocScenario> {
          await this.checkResilocScenarioMetadata(createResilocScenarioDto.metadata);
          return await this.resilocScenarioRepository.save(
               this.resilocScenarioRepository.create(createResilocScenarioDto)
          );
     }

     async findAll(page: number, limit: number): Promise<PaginationResilocScenariosDto> {
          const totalItems = await this.resilocScenarioRepository.count();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocScenarioRepository.createQueryBuilder('resiloc_scenario')
               .leftJoinAndSelect('resiloc_scenario.resilocIndicators', 'resiloc_indicator')
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_scenario.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocScenariosDto = new PaginationResilocScenariosDto();
          paginationResilocScenariosDto.metadata = new PaginationMetaDataResilocScenariosDto();

          for (let item of items) {
               await this.getCompletedPopulatedResilocScenario(item);
          }

          paginationResilocScenariosDto.items = items;
          paginationResilocScenariosDto.metadata.currentPage = page;
          paginationResilocScenariosDto.metadata.totalPages = totalPage;
          paginationResilocScenariosDto.metadata.itemsPerPage = limit;
          paginationResilocScenariosDto.metadata.totalItems = totalItems;

          return paginationResilocScenariosDto;
     }

     async getVisibleResilocScenarios(page: number, limit: number, authUser: any): Promise<PaginationResilocScenariosDto> {
          let totalItems, items;
          if (await this.usersService.isAdmin(authUser.username)) {
               totalItems = await this.resilocScenarioRepository.createQueryBuilder('resiloc_scenario')
                    .where('resiloc_scenario.status IN (:...statuses)', { statuses: [ResilocScenarioStatus.Verified] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocScenarioRepository.createQueryBuilder('resiloc_scenario')
                    .where('resiloc_scenario.status IN (:...statuses)', { statuses: [ResilocScenarioStatus.Verified] })
                    .leftJoinAndSelect('resiloc_scenario.resilocIndicators', 'resiloc_indicator')
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_scenario.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          } else {
               totalItems = await this.resilocScenarioRepository.createQueryBuilder('resiloc_scenario')
                    .where('resiloc_scenario.status IN (:...statuses)', { statuses: [ResilocScenarioStatus.Verified] })
                    .andWhere('resiloc_scenario.visibility NOT IN (:...visibilities)', { visibilities: [ResilocScenarioVisibility.Draft] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocScenarioRepository.createQueryBuilder('resiloc_scenario')
                    .where('resiloc_scenario.status IN (:...statuses)', { statuses: [ResilocScenarioStatus.Verified] })
                    .andWhere('resiloc_scenario.visibility NOT IN (:...visibilities)', { visibilities: [ResilocScenarioVisibility.Draft] })
                    .leftJoinAndSelect('resiloc_scenario.resilocIndicators', 'resiloc_indicator')
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_scenario.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          }

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          for (let item of items) {
               await this.getCompletedPopulatedResilocScenario(item);
          }

          let paginationResilocScenariosDto = new PaginationResilocScenariosDto();
          paginationResilocScenariosDto.metadata = new PaginationMetaDataResilocScenariosDto();

          paginationResilocScenariosDto.items = items;
          paginationResilocScenariosDto.metadata.currentPage = page;
          paginationResilocScenariosDto.metadata.totalPages = totalPage;
          paginationResilocScenariosDto.metadata.itemsPerPage = limit;
          paginationResilocScenariosDto.metadata.totalItems = totalItems;

          return paginationResilocScenariosDto;
     }

     async getResilocScenario(id: string, flid: string, authUser: any): Promise<ResilocScenario> {
          const resilocScenario = await this.findOneWithDetail(id);
          if (resilocScenario) {
               if (await this.usersService.isAdmin(authUser.username)) {
                    return resilocScenario;
               } else {
                    if (resilocScenario.visibility == ResilocScenarioVisibility.Draft) {
                         throw new BadRequestException(`Only admin can see a ${resilocScenario.visibility} resiloc scenario`);
                    }
                    return resilocScenario;
               }
          }
     }

     async assignResilocIndicatorsForResilocScenario(id: string, createResilocIndicatorsOfResilocScenarioDto: CreateResilocIndicatorsOfResilocScenarioDto): Promise<ResilocScenario> {
          const resilocScenario = await this.findOneWithDetail(id);
          if (resilocScenario) {
               let resilocIndicatorIds = [];
               for (let resilocIndicatorId of createResilocIndicatorsOfResilocScenarioDto.resilocIndicatorIds) {
                    await this.checkResilocIndicatorOfResilocScenario(resilocIndicatorId);
                    resilocIndicatorIds.push(resilocIndicatorId);
               }

               if (await this.helpersService.hasDuplicates(resilocIndicatorIds)) {
                    throw new BadRequestException(`Array of resiloc indicators contains duplicate resiloc indicator id values`);
               }

               const assignedResilocIndicatorIdsOfResilocScenario = await this.getAssignedResilocIndicatorIdsOfResilocScenario(id);

               const addedResilocIndicatorIds = arrSubtraction(createResilocIndicatorsOfResilocScenarioDto.resilocIndicatorIds, assignedResilocIndicatorIdsOfResilocScenario);
               if (Object.keys(addedResilocIndicatorIds).length != 0) {
                    for (let addedResilocIndicatorId of addedResilocIndicatorIds) {
                         const resilocIndicator = await this.resilocIndicatorsService.findOne(addedResilocIndicatorId);
                         if (resilocIndicator) {
                              resilocScenario.resilocIndicators.push(resilocIndicator);

                              const resilocProxes = resilocIndicator.resilocProxies;
                              for (let resilocProxy of resilocProxes) {
                                   const resilocScenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(id, resilocIndicator._id, resilocProxy._id);
                                   const createResilocScenarioIndicatorDto = new CreateResilocScenarioIndicatorDto();
                                   createResilocScenarioIndicatorDto._id = resilocScenarioIndicatorProxyId;
                                   await this.resilocScenarioIndicatorProxyRepository.save(
                                        this.resilocScenarioIndicatorProxyRepository.create(createResilocScenarioIndicatorDto)
                                   );
                              }
                         }
                    }
               }

               const removedResilocIndicatorIds = arrSubtraction(assignedResilocIndicatorIdsOfResilocScenario, createResilocIndicatorsOfResilocScenarioDto.resilocIndicatorIds);
               if (Object.keys(removedResilocIndicatorIds).length != 0) {
                    for (let removedResilocIndicatorId of removedResilocIndicatorIds) {
                         const resilocIndicator = await this.resilocIndicatorsService.findOne(removedResilocIndicatorId);
                         if (resilocIndicator) {
                              var removeIndex = resilocScenario.resilocIndicators.map(resilocProxy => resilocProxy._id).indexOf(removedResilocIndicatorId);
                              ~removeIndex && resilocScenario.resilocIndicators.splice(removeIndex, 1);

                              const resilocProxes = resilocIndicator.resilocProxies;
                              for (let resilocProxy of resilocProxes) {
                                   const resilocScenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(id, resilocIndicator._id, resilocProxy._id);
                                   await this.resilocScenarioIndicatorProxyRepository.delete(resilocScenarioIndicatorProxyId);
                              }
                         }
                    }
               }

               resilocScenario.formula = createResilocIndicatorsOfResilocScenarioDto.formula;

               return await this.resilocScenarioRepository.save(resilocScenario);
          } else {
               throw new NotFoundException(`Resiloc scenario ${id} does not exist`);
          }
     }

     async update(id: string, updateResilocScenarioDto: UpdateResilocScenarioDto): Promise<ResilocScenario> {
          const resilocScenario = await this.findOne(id);
          if (resilocScenario) {
               await this.checkResilocScenarioMetadata(updateResilocScenarioDto.metadata);
               const updatedResilocScenario = this.resilocScenarioRepository.merge(resilocScenario, updateResilocScenarioDto);
               return await this.resilocScenarioRepository.save(
                    this.resilocScenarioRepository.create(updatedResilocScenario)
               );
          } else {
               throw new NotFoundException(`Resiloc scenario ${id} does not exist`);
          }
     }

     async updateResilocScenarioIndicatorProxy(resilocScenarioIndicatorProxyId: string, updateResilocScenarioIndicatorProxyDto: UpdateResilocScenarioIndicatorProxyDto) {
          const resilocScenarioIndicatorProxy = await this.resilocScenarioIndicatorProxyRepository.findOne(resilocScenarioIndicatorProxyId);
          if (resilocScenarioIndicatorProxy) {
               await this.checkResilocScenarioIndicatorProxy(updateResilocScenarioIndicatorProxyDto);
               return await this.resilocScenarioIndicatorProxyRepository.save(
                    await this.resilocScenarioIndicatorProxyRepository.merge(resilocScenarioIndicatorProxy, updateResilocScenarioIndicatorProxyDto)
               );
          } else {
               throw new NotFoundException(`This id ${resilocScenarioIndicatorProxyId} does not exist`);
          }
     }

     async remove(id: string): Promise<any> {
          const resilocScenario = await this.findOneWithDetail(id);
          if (resilocScenario) {
               // Check being used here ....
               const resilocIndicators = resilocScenario.resilocIndicators;
               if (resilocIndicators) {
                    for (let resilocIndicator of resilocIndicators) {
                         const resilocProxies = resilocIndicator.resilocProxies;
                         if (resilocProxies) {
                              for (let resilocProxy of resilocProxies) {
                                   const resilocScenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(id, resilocIndicator._id, resilocProxy._id);
                                   await this.resilocScenarioIndicatorProxyRepository.delete(resilocScenarioIndicatorProxyId);
                              }
                         }
                    }
               }
               return await this.resilocScenarioRepository.delete(id);
          } else {
               throw new NotFoundException(`Resiloc scenario ${id} does not exist`);
          }
     }

     async findOne(id: string): Promise<ResilocScenario> {
          return await this.resilocScenarioRepository.findOne(id, {
               join: {
                    alias: "resiloc_scenario",
                    leftJoinAndSelect: {
                         "resiloc_indicator": "resiloc_scenario.resilocIndicators",
                         "resiloc_proxy": "resiloc_indicator.resilocProxies",
                         "resiloc_proxy_metadata": "resiloc_proxy.metadata",
                    }
               }
          });
     }

     async findOneWithDetail(id: string): Promise<ResilocScenario> {
          const resilocScenario = await this.resilocScenarioRepository.findOne(id, {
               join: {
                    alias: "resiloc_scenario",
                    leftJoinAndSelect: {
                         "resiloc_indicator": "resiloc_scenario.resilocIndicators",
                         "resiloc_proxy": "resiloc_indicator.resilocProxies",
                         "resiloc_proxy_metadata": "resiloc_proxy.metadata",
                    }
               }
          });
          if (resilocScenario) {
               return await this.getCompletedPopulatedResilocScenario(resilocScenario);
          } else {
               return resilocScenario;
          }
     }

     async findByIds(ids: string[]): Promise<ResilocScenario[]> {
          return await this.resilocScenarioRepository.findByIds(ids, {
               join: {
                    alias: "resiloc_scenario",
                    leftJoinAndSelect: {
                         "resiloc_indicator": "resiloc_scenario.resilocIndicators",
                         "resiloc_proxy": "resiloc_indicator.resilocProxies",
                         "resiloc_proxy_metadata": "resiloc_proxy.metadata",
                    }
               }
          });
     }

     async getAssignedResilocIndicatorIdsOfResilocScenario(id: string): Promise<string[]> {
          const resilocScenario = await this.findOneWithDetail(id);
          if (resilocScenario) {
               return resilocScenario.resilocIndicators.map(e => {
                    return e._id;
               });
          } else {
               throw new NotFoundException(`Resiloc scenario ${id} does not exist`);
          }
     }

     async checkResilocScenarioMetadata(resilocScenarioMetaData: ResilocScenarioMetaData[]) {
          if (resilocScenarioMetaData) {
               let names = [];
               for (let i = 0; i < resilocScenarioMetaData.length; i++) {
                    if (resilocScenarioMetaData[i].type == ResilocScenarioMetadataType.Text) {
                         if (typeof resilocScenarioMetaData[i].value != 'string') {
                              throw new BadRequestException(`metadata.${i}.value must be a string`);
                         }
                    } else if (resilocScenarioMetaData[i].type == ResilocScenarioMetadataType.Number) {
                         if (typeof resilocScenarioMetaData[i].value != 'number') {
                              throw new BadRequestException(`metadata.${i}.value must be a number`);
                         }
                    }
                    const name = await this.normaliseText(resilocScenarioMetaData[i].name);
                    names.push(name);
               }
               if (await this.helpersService.hasDuplicates(names)) {
                    throw new BadRequestException(`Duplicate metadata names`);
               }
          }
     }

     async checkResilocIndicatorOfResilocScenario(resilocIndicatorId: string) {
          const resilocIndicator = await this.resilocIndicatorsService.findOne(resilocIndicatorId);
          if (resilocIndicator) {
               if (resilocIndicator.visibility == ResilocIndicatorVisibility.Draft) {
                    throw new BadRequestException(`Cannot assign resiloc indicator ${resilocIndicator._id} because it is being in draft visibility`);
               }
               if (resilocIndicator.status == ResilocIndicatorStatus.Requested
                    || resilocIndicator.status == ResilocIndicatorStatus.Rejected) {
                    throw new BadRequestException(`Cannot assign resiloc indicator ${resilocIndicator._id} because it is being in ${resilocIndicator.status} status`);
               }
          } else {
               throw new NotFoundException(`Resiloc indicator ${resilocIndicatorId} does not exist`);
          }
     }

     async checkResilocScenarioIndicatorProxy(updateResilocScenarioIndicatorProxyDto: UpdateResilocScenarioIndicatorProxyDto) {
          if (updateResilocScenarioIndicatorProxyDto.relevance < 0 || updateResilocScenarioIndicatorProxyDto.relevance > 1) {
               throw new BadRequestException(`Relevance value is not in [0,1]`);
          }

          if (updateResilocScenarioIndicatorProxyDto.direction < -1 || updateResilocScenarioIndicatorProxyDto.direction > 1) {
               throw new BadRequestException(`Direction value is not in [-1,1]`);
          }
     }

     async getCompletedPopulatedResilocScenario(resilocScenario: ResilocScenario): Promise<ResilocScenario> {
          const resilocScenarioId = resilocScenario._id;
          for (let resilocIndicator of resilocScenario.resilocIndicators) {
               const resilocIndicatorId = resilocIndicator._id;
               for (let resilocProxy of resilocIndicator.resilocProxies) {
                    const resilocProxyId = resilocProxy._id;
                    const resilocScenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(resilocScenarioId, resilocIndicatorId, resilocProxyId);
                    const resilocScenarioIndicatorProxy = await this.resilocScenarioIndicatorProxyRepository.findOne(resilocScenarioIndicatorProxyId);
                    if (resilocScenarioIndicatorProxy) {
                         resilocProxy[this.configService.get<string>('scenarioAssociatedAttributes')] = resilocScenarioIndicatorProxy;
                    } else {
                         resilocProxy[this.configService.get<string>('scenarioAssociatedAttributes')] = [];
                    }
               }
          }
          return resilocScenario;
     }

     async normaliseText(text: string): Promise<string> {
          return text.replace(/\s\s+/g, ' ').trim().toLowerCase();
     }
}
