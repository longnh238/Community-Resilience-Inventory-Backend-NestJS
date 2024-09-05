import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongoose';
import { In, Repository } from 'typeorm';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { ResilocScenariosService } from '../resiloc-scenarios/resiloc-scenarios.service';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UsersService } from '../users/users.service';
import { PaginationMetaDataScenariosDto, PaginationScenariosDto, ReadScenarioIdsOfUserByCommunitiesDto, ReadScenariosOfUserByCommunitiesDto } from './dto/read-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { Scenario } from './entities/scenario.entity';
import { ScenarioIndicatorProxy } from './enum/scenario-indicator-proxy.entity';
import { ScenarioStatus } from './enum/scenario-status.enum';
import { ScenarioVisibility } from './enum/scenario-visibility.enum';

@Injectable()
export class ScenariosService {
     constructor(
          @InjectRepository(Scenario) private readonly scenarioRepository: Repository<Scenario>,
          @Inject(forwardRef(() => ResilocScenariosService)) private readonly resilocScenariosService: ResilocScenariosService,
          @Inject(forwardRef(() => IndicatorsService)) private readonly indicatorsService: IndicatorsService,
          @InjectRepository(ScenarioIndicatorProxy) private readonly scenarioIndicatorProxyRepository: Repository<ScenarioIndicatorProxy>,
          @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
          @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
          @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
          private readonly configService: ConfigService,
          private readonly helpersService: HelpersService
     ) { }

     async create(resilocScenarioId: string): Promise<Scenario> {
          const resilocScenario = await this.resilocScenariosService.findOneWithDetail(resilocScenarioId);
          if (resilocScenario) {

               const scenario = new Scenario();
               scenario.resilocScenario = resilocScenario;
               scenario.metadata = resilocScenario.metadata;

               let indicators = [];
               const resilocIndicators = resilocScenario.resilocIndicators;
               for (let resilocIndicator of resilocIndicators) {
                    const indicator = await this.indicatorsService.create(resilocIndicator._id);
                    indicators.push(indicator);
               }
               scenario.indicators = indicators;

               const createdScenario = await this.scenarioRepository.save(
                    this.scenarioRepository.create(scenario)
               );

               await this.createScenarioIndicatorProxy(createdScenario._id);

               return createdScenario;
          } else {
               throw new BadRequestException(`Resiloc scenario ${resilocScenarioId} does not exist`);
          }
     }

     async createScenarioIndicatorProxy(id: string): Promise<any> {
          const scenario = await this.findOneWithDetail(id);
          if (scenario) {
               for (let indicator of scenario.indicators) {
                    const indicatorId = indicator._id;
                    for (let staticProxy of indicator.staticProxies) {
                         const staticProxyId = staticProxy._id;

                         const scenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(id, indicatorId, staticProxyId);

                         const scenarioIndicatorProxy = new ScenarioIndicatorProxy();
                         scenarioIndicatorProxy._id = scenarioIndicatorProxyId;
                         scenarioIndicatorProxy.direction = staticProxy[this.configService.get<string>('scenarioAssociatedAttributes')].direction;
                         scenarioIndicatorProxy.relevance = staticProxy[this.configService.get<string>('scenarioAssociatedAttributes')].relevance;

                         await this.scenarioIndicatorProxyRepository.save(
                              this.scenarioIndicatorProxyRepository.create(scenarioIndicatorProxy)
                         );
                    }
               }
          } else {
               throw new BadRequestException(`Scenario ${id} does not exist`);
          }
     }

     async findAll(page: number, limit: number): Promise<PaginationScenariosDto> {
          const totalItems = await this.scenarioRepository.count();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.scenarioRepository.createQueryBuilder('scenario')
               .leftJoinAndSelect('scenario.resilocScenario', 'resiloc_scenario')
               .leftJoinAndSelect('scenario.indicators', 'indicator')
               .leftJoinAndSelect('indicator.staticProxies', 'static_proxy')
               .leftJoinAndSelect('static_proxy.metadata', 'static_proxy_metadata')
               .orderBy('scenario.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          for (let item of items) {
               await this.getCompletedPopulatedScenario(item);
          }

          let paginationScenariosDto = new PaginationScenariosDto();
          paginationScenariosDto.metadata = new PaginationMetaDataScenariosDto();

          paginationScenariosDto.items = items;
          paginationScenariosDto.metadata.currentPage = page;
          paginationScenariosDto.metadata.totalPages = totalPage;
          paginationScenariosDto.metadata.itemsPerPage = limit;
          paginationScenariosDto.metadata.totalItems = totalItems;

          return paginationScenariosDto;
     }

     async getScenario(id: string, flid: string, authUser: any): Promise<Scenario> {
          const scenario = await this.findOneWithDetail(id);
          if (scenario) {
               if (await this.usersService.isAdmin(authUser.username)) {
                    return scenario;
               } else {
                    if (scenario.visibility == ScenarioVisibility.Draft) {
                         throw new BadRequestException(`Only admin can see a ${scenario.visibility} scenario`);
                    }
                    return scenario;
               }
          }
     }

     async getScenarioIdsOfUserByCommunities(username: string, authUser: any): Promise<ReadScenarioIdsOfUserByCommunitiesDto[]> {
          let allowed = false;
          if (await this.usersService.isAdmin(authUser.username)) {
               allowed = true;
          } else if (await this.usersService.isMatchingToken(username, authUser)) {
               allowed = true;
          } else {
               throw new ForbiddenException('Forbidden resource');
          }

          if (allowed) {
               const communities = await this.communitiesService.getScenarioIdsOfUserByCommunities(username);
               let res = [];
               for (let community of communities) {
                    const communityId = community._id;
                    const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                    const readScenarioIdsOfUserByCommunitiesDto = new ReadScenarioIdsOfUserByCommunitiesDto();
                    readScenarioIdsOfUserByCommunitiesDto._id = String(community._id); // For avoiding error of @UseInterceptors(ClassSerializerInterceptor)
                    readScenarioIdsOfUserByCommunitiesDto.name = community.name;

                    const scenarios = await this.findByIds([...community.scenarios.values()]);
                    let scenarioIds = [];
                    for (let scenario of scenarios) {
                         if (scenario.visibility == ScenarioVisibility.Internal || scenario.visibility == ScenarioVisibility.Draft) {
                              if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                                   scenarioIds.push(scenario._id);
                              }
                              continue;
                         }
                         scenarioIds.push(scenario._id);
                    }
                    readScenarioIdsOfUserByCommunitiesDto.scenarioIds = scenarioIds;
                    res.push(readScenarioIdsOfUserByCommunitiesDto);
               }
               return res;
          }
     }

     async getScenariosOfUserByCommunities(username: string, authUser: any): Promise<ReadScenariosOfUserByCommunitiesDto[]> {
          let allowed = false;
          if (await this.usersService.isAdmin(authUser.username)) {
               allowed = true;
          } else if (await this.usersService.isMatchingToken(username, authUser)) {
               allowed = true;
          } else {
               throw new ForbiddenException('Forbidden resource');
          }

          if (allowed) {
               let res = [];
               const communities = await this.communitiesService.getScenarioIdsOfUserByCommunities(username);
               for (let community of communities) {
                    const communityId = community._id;
                    const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                    let readScenariosOfUserByCommunitiesDto = new ReadScenariosOfUserByCommunitiesDto();
                    readScenariosOfUserByCommunitiesDto._id = String(community._id);
                    readScenariosOfUserByCommunitiesDto.name = community.name;
                    readScenariosOfUserByCommunitiesDto.scenarios = [];

                    const scenarios = await this.findByIds([...community.scenarios.values()]);
                    for (let scenario of scenarios) {
                         let isVisible = false;
                         if (scenario.visibility == ScenarioVisibility.Internal || scenario.visibility == ScenarioVisibility.Draft) {
                              if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                                   isVisible = true;
                              }
                         } else {
                              isVisible = true;
                         }

                         if (isVisible) {
                              readScenariosOfUserByCommunitiesDto.scenarios.push(await this.findOneWithDetail(scenario._id));
                         }
                    }
                    res.push(readScenariosOfUserByCommunitiesDto);
               }
               return res;
          }
     }

     async getScenariosOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationScenariosDto> {
          if (communityId == this.configService.get<string>('selectedCommunityTag')) {
               if (flid) {
                    communityId = await this.helpersService.decipherText(flid);
               } else {
                    throw new BadRequestException(`flid is required`);
               }
          }

          let allowed = false;
          if (await this.usersService.isAdmin(authUser.username)) {
               allowed = true;
          } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
               allowed = true;
          } else {
               throw new ForbiddenException('Forbidden resource');
          }

          if (allowed) {
               let isCommunityLevel = true;
               if (await this.usersService.isAdmin(authUser.username)) {
                    isCommunityLevel = false;
               } else {
                    const userRoles = await this.usersService.getUserRolesByCommunity(authUser.username, communityId);
                    if (userRoles.includes(UserRole.LocalManager)
                         || userRoles.includes(UserRole.ResilienceExpert)) {
                         isCommunityLevel = false;
                    }
               }

               let ids;
               if (isCommunityLevel) {
                    ids = await this.communitiesService.getScenarioIdsOfCommunityAtCommunityLevel(communityId);
               } else {
                    ids = await this.communitiesService.getScenarioIdsOfCommunity(communityId);
               }

               const totalItems = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...ids] }) // avoiding empty array
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               const items = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...ids] })
                    .leftJoinAndSelect('scenario.resilocScenario', 'resiloc_scenario')
                    .leftJoinAndSelect('scenario.indicators', 'indicator')
                    .leftJoinAndSelect('indicator.staticProxies', 'static_proxy')
                    .leftJoinAndSelect('static_proxy.metadata', 'static_proxy_metadata')
                    .orderBy('scenario.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();

               let totalPage = Math.ceil(totalItems / limit);
               if (isNaN(totalPage)) totalPage = 0;

               for (let item of items) {
                    await this.getCompletedPopulatedScenario(item);
               }

               let paginationScenariosDto = new PaginationScenariosDto();
               paginationScenariosDto.metadata = new PaginationMetaDataScenariosDto();

               paginationScenariosDto.items = items;
               paginationScenariosDto.metadata.currentPage = page;
               paginationScenariosDto.metadata.totalPages = totalPage;
               paginationScenariosDto.metadata.itemsPerPage = limit;
               paginationScenariosDto.metadata.totalItems = totalItems;

               return paginationScenariosDto;
          }
     }

     async getOnHoldScenariosOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationScenariosDto> {
          if (communityId == this.configService.get<string>('selectedCommunityTag')) {
               if (flid) {
                    communityId = await this.helpersService.decipherText(flid);
               } else {
                    throw new BadRequestException(`flid is required`);
               }
          }

          let allowed = false;
          if (await this.usersService.isAdmin(authUser.username)) {
               allowed = true;
          } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
               allowed = true;
          } else {
               throw new ForbiddenException('Forbidden resource');
          }

          if (allowed) {
               const scenarioIds = await this.communitiesService.getScenarioIdsOfCommunity(communityId);

               const totalItems = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...scenarioIds] }) // avoiding empty array
                    .andWhere('scenario.status IN (:...statuses)', { statuses: [ScenarioStatus.OnHold] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               const items = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...scenarioIds] }) // avoiding empty array
                    .andWhere('scenario.status IN (:...statuses)', { statuses: [ScenarioStatus.OnHold] })
                    .leftJoinAndSelect('scenario.resilocScenario', 'resiloc_scenario')
                    .leftJoinAndSelect('scenario.indicators', 'indicator')
                    .leftJoinAndSelect('indicator.staticProxies', 'static_proxy')
                    .leftJoinAndSelect('static_proxy.metadata', 'static_proxy_metadata')
                    .orderBy('scenario.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();

               let totalPage = Math.ceil(totalItems / limit);
               if (isNaN(totalPage)) totalPage = 0;

               for (let item of items) {
                    await this.getCompletedPopulatedScenario(item);
               }

               let paginationScenariosDto = new PaginationScenariosDto();
               paginationScenariosDto.metadata = new PaginationMetaDataScenariosDto();

               paginationScenariosDto.items = items;
               paginationScenariosDto.metadata.currentPage = page;
               paginationScenariosDto.metadata.totalPages = totalPage;
               paginationScenariosDto.metadata.itemsPerPage = limit;
               paginationScenariosDto.metadata.totalItems = totalItems;

               return paginationScenariosDto;
          }
     }

     async getSubmittedScenariosOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationScenariosDto> {
          if (communityId == this.configService.get<string>('selectedCommunityTag')) {
               if (flid) {
                    communityId = await this.helpersService.decipherText(flid);
               } else {
                    throw new BadRequestException(`flid is required`);
               }
          }

          let allowed = false;
          if (await this.usersService.isAdmin(authUser.username)) {
               allowed = true;
          } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
               allowed = true;
          } else {
               throw new ForbiddenException('Forbidden resource');
          }

          if (allowed) {
               const scenarioIds = await this.communitiesService.getScenarioIdsOfCommunity(communityId);

               const totalItems = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...scenarioIds] }) // avoiding empty array
                    .andWhere('scenario.status IN (:...statuses)', { statuses: [ScenarioStatus.Submitted] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               const items = await this.scenarioRepository.createQueryBuilder('scenario')
                    .where('scenario._id IN (:...ids)', { ids: [null, ...scenarioIds] }) // avoiding empty array
                    .andWhere('scenario.status IN (:...statuses)', { statuses: [ScenarioStatus.Submitted] })
                    .leftJoinAndSelect('scenario.resilocScenario', 'resiloc_scenario')
                    .leftJoinAndSelect('scenario.indicators', 'indicator')
                    .leftJoinAndSelect('indicator.staticProxies', 'static_proxy')
                    .leftJoinAndSelect('static_proxy.metadata', 'static_proxy_metadata')
                    .orderBy('scenario.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();

               let totalPage = Math.ceil(totalItems / limit);
               if (isNaN(totalPage)) totalPage = 0;

               for (let item of items) {
                    await this.getCompletedPopulatedScenario(item);
               }

               let paginationScenariosDto = new PaginationScenariosDto();
               paginationScenariosDto.metadata = new PaginationMetaDataScenariosDto();

               paginationScenariosDto.items = items;
               paginationScenariosDto.metadata.currentPage = page;
               paginationScenariosDto.metadata.totalPages = totalPage;
               paginationScenariosDto.metadata.itemsPerPage = limit;
               paginationScenariosDto.metadata.totalItems = totalItems;

               return paginationScenariosDto;
          }
     }

     async update(id: string, updateScenarioDto: UpdateScenarioDto, flid: string, authUser: any): Promise<Scenario> {
          const scenario = await this.findOne(id);
          if (scenario) {
               const communityId = await this.communitiesService.getCommunityIdOfScenario(id);
               let allowed = false;
               if (await this.usersService.isAdmin(authUser.username)) {
                    allowed = true;
               } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                    allowed = true;
               } else {
                    throw new ForbiddenException('Forbidden resource');
               }

               if (allowed) {
                    await this.resilocScenariosService.checkResilocScenarioMetadata(updateScenarioDto.metadata);
                    const updatedScenario = this.scenarioRepository.merge(scenario, updateScenarioDto);
                    return await this.scenarioRepository.save(
                         this.scenarioRepository.create(updateScenarioDto)
                    );
               }
          } else {
               throw new NotFoundException(`Scenario ${id} does not exist`);
          }
     }

     async remove(id: string): Promise<boolean> {
          const scenario = await this.findOneWithDetail(id);
          if (scenario) {
               for (let indicator of scenario.indicators) {
                    for (let staticProxy of indicator.staticProxies) {
                         const scenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(id, indicator._id, staticProxy._id);
                         await this.scenarioIndicatorProxyRepository.delete(scenarioIndicatorProxyId);

                         await this.staticProxiesService.remove(staticProxy._id);
                    }
                    await this.indicatorsService.remove(indicator._id);
               }
               await this.scenarioRepository.delete(id);
               return true;
          } else {
               throw new BadRequestException(`Scenario ${id} does not exist`);
          }
     }

     async findOne(id: string): Promise<Scenario> {
          return await this.scenarioRepository.findOne(id, {
               join: {
                    alias: "scenario",
                    leftJoinAndSelect: {
                         "indicator": "scenario.indicators",
                         "static_proxy": "indicator.staticProxies",
                         "resiloc_indicator": "indicator.resilocIndicator",
                         "static_proxy_metadata": "static_proxy.metadata",
                         "resiloc_proxy": "static_proxy.resilocProxy"
                    }
               }
          });
     }

     async findOneWithDetail(id: string): Promise<Scenario> {
          const scenario = await this.scenarioRepository.findOne(id, {
               join: {
                    alias: "scenario",
                    leftJoinAndSelect: {
                         "indicator": "scenario.indicators",
                         "static_proxy": "indicator.staticProxies",
                         "resiloc_indicator": "indicator.resilocIndicator",
                         "static_proxy_metadata": "static_proxy.metadata",
                         "resiloc_proxy": "static_proxy.resilocProxy"
                    }
               }
          });
          if (scenario) {
               return await this.getCompletedPopulatedScenario(scenario);
          } else {
               return scenario;
          }
     }

     async findByIds(ids: string[]): Promise<Scenario[]> {
          return await this.scenarioRepository.findByIds(ids, {
               join: {
                    alias: "scenario",
                    leftJoinAndSelect: {
                         "indicator": "scenario.indicators",
                         "static_proxy": "indicator.staticProxies",
                         "resiloc_indicator": "indicator.resilocIndicator",
                         "static_proxy_metadata": "static_proxy.metadata",
                         "resiloc_proxy": "static_proxy.resilocProxy"
                    }
               }
          });
     }

     async findByIdsWithDetail(ids: string[]): Promise<Scenario[]> {
          const scenarios = await this.scenarioRepository.findByIds(ids, {
               join: {
                    alias: "scenario",
                    leftJoinAndSelect: {
                         "indicator": "scenario.indicators",
                         "static_proxy": "indicator.staticProxies",
                         "resiloc_indicator": "indicator.resilocIndicator",
                         "static_proxy_metadata": "static_proxy.metadata",
                         "resiloc_proxy": "static_proxy.resilocProxy"
                    }
               }
          });
          for (let scenario of scenarios) {
               if (scenario) {
                    await this.getCompletedPopulatedScenario(scenario);
               }
          }
          return scenarios;
     }

     async getCompletedPopulatedScenario(scenario: Scenario): Promise<Scenario> {
          const scenarioId = scenario._id;
          for (let indicator of scenario.indicators) {
               const indicatorId = indicator._id;
               for (let staticProxy of indicator.staticProxies) {
                    const staticProxyId = staticProxy._id;
                    const scenarioIndicatorProxyId = await this.helpersService.buildScenarioIndicatorProxyId(scenarioId, indicatorId, staticProxyId);
                    const scenarioIndicatorProxy = await this.scenarioIndicatorProxyRepository.findOne(scenarioIndicatorProxyId);
                    if (scenarioIndicatorProxy) {
                         staticProxy[this.configService.get<string>('scenarioAssociatedAttributes')] = scenarioIndicatorProxy;
                    } else {
                         staticProxy[this.configService.get<string>('scenarioAssociatedAttributes')] = [];
                    }
               }
          }
          return scenario;
     }

     async getScenariosByIdsAtCommunityLevel(ids: string[]): Promise<Scenario[]> {
          return await this.scenarioRepository.findByIds(ids, {
               where: { visibility: In([ScenarioVisibility.Public, ScenarioVisibility.Community]) }, join: {
                    alias: "scenario",
                    leftJoinAndSelect: {
                         "indicator": "scenario.indicators",
                         "static_proxy": "indicator.staticProxies",
                         "resiloc_indicator": "indicator.resilocIndicator",
                         "static_proxy_metadata": "static_proxy.metadata",
                         "resiloc_proxy": "static_proxy.resilocProxy"
                    }
               }
          });
     }
}
