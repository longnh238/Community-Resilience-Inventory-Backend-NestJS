import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongoose';
import { Repository } from 'typeorm';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { arrSubtraction } from '../common/utilities/array-utilities';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { ResilocProxyStatus } from '../resiloc-proxies/enum/resiloc-proxy-status.enum';
import { ResilocProxyVisibility } from '../resiloc-proxies/enum/resiloc-proxy-visibility.enum';
import { ResilocProxiesService } from '../resiloc-proxies/resiloc-proxies.service';
import { UsersService } from '../users/users.service';
import { CreateResilocIndicatorDto, CreateResilocProxiesOfResilocIndicatorDto } from './dto/create-resiloc-indicator.dto';
import { PaginationMetaDataResilocIndicatorsDto, PaginationResilocIndicatorsDto, PaginationResilocIndicatorTagsDto } from './dto/read-resiloc-indicator.dto';
import { UpdateResilocIndicatorDto, UpdateResilocIndicatorStatusDto } from './dto/update-resiloc-indicator.dto';
import { ResilocIndicator } from './entities/resiloc-indicator.entity';
import { ResilocIndicatorTagOrderingOption } from './enum/resiloc-Indicator-ordering-options.enum';
import { ResilocIndicatorStatus } from './enum/resiloc-indicator-status.enum';
import { ResilocIndicatorContextType, ResilocIndicatorCriteriaType } from './enum/resiloc-indicator-type.enum';
import { ResilocIndicatorVisibility } from './enum/resiloc-indicator-visibility.enum';

@Injectable()
export class ResilocIndicatorsService {
     constructor(
          @InjectRepository(ResilocIndicator) private readonly resilocIndicatorRepository: Repository<ResilocIndicator>,
          @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
          @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
          @Inject(forwardRef(() => IndicatorsService)) private readonly indicatorsService: IndicatorsService,
          @Inject(forwardRef(() => ResilocProxiesService)) private readonly resilocProxiesService: ResilocProxiesService,
          private readonly configService: ConfigService,
          private readonly helpersService: HelpersService
     ) { }

     async create(createResilocIndicatorDto: CreateResilocIndicatorDto, flid: string, authUser: any): Promise<ResilocIndicator> {
          let createdResilocIndicator;

          const criteria = createResilocIndicatorDto.criteria;
          const context = createResilocIndicatorDto.context;
          if (await this.satisfiedContextCriteriaRelation(criteria, context)) {
               if (await this.usersService.isAdmin(authUser.username)) {
                    const resilocIndicator: any = { ...createResilocIndicatorDto };
                    resilocIndicator.status = ResilocIndicatorStatus.Verified;
                    // Saving in this way to trigger checking functions
                    createdResilocIndicator = await this.resilocIndicatorRepository.save(
                         this.resilocIndicatorRepository.create(resilocIndicator)
                    );
               } else {
                    createdResilocIndicator = await this.resilocIndicatorRepository.save(
                         this.resilocIndicatorRepository.create(createResilocIndicatorDto)
                    );
                    if (createdResilocIndicator) {
                         const communityId = await this.helpersService.decipherText(flid);
                         await this.communitiesService.assignRequestedIndicatorToCommunity(communityId, createdResilocIndicator._id);
                    }
               }
               return createdResilocIndicator;
          } else {
               throw new BadRequestException(`Criteria ${criteria} does not belong to context ${context}`);
          }
     }

     async findAll(page: number, limit: number): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.count();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getVisibleResilocIndicators(page: number, limit: number, authUser: any): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified, ResilocIndicatorStatus.Accepted] })
               .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
               .getCount();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified, ResilocIndicatorStatus.Accepted] })
               .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getVisibleResilocIndicatorsByTag(tagName: string, page: number, limit: number, authUser: any): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where(':tag = ANY(resiloc_indicator.tags)', { tag: tagName })
               .andWhere('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified, ResilocIndicatorStatus.Accepted] })
               .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
               .getCount();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where(':tag = ANY(resiloc_indicator.tags)', { tag: tagName })
               .andWhere('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified, ResilocIndicatorStatus.Accepted] })
               .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getVerifiedResilocIndicators(page: number, limit: number, authUser: any): Promise<PaginationResilocIndicatorsDto> {
          let totalItems, items;
          if (await this.usersService.isAdmin(authUser.username)) {
               totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified] })
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_indicator.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          } else {
               totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified] })
                    .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Verified] })
                    .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_indicator.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          }


          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getAcceptedResilocIndicators(page: number, limit: number, authUser: any): Promise<PaginationResilocIndicatorsDto> {
          let totalItems, items;
          if (await this.usersService.isAdmin(authUser.username)) {
               totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Accepted] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Accepted] })
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_indicator.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          } else {
               totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Accepted] })
                    .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
                    .getCount();

               limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
               const skippedItems = (page - 1) * limit;

               items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
                    .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Accepted] })
                    .andWhere('resiloc_indicator.visibility NOT IN (:...visibilities)', { visibilities: [ResilocIndicatorVisibility.Draft] })
                    .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
                    .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
                    .orderBy('resiloc_indicator.dateCreated', 'ASC')
                    .skip(skippedItems)
                    .take(limit)
                    .getMany();
          }

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getRequestedResilocIndicators(page: number, limit: number, flid: string, authUser: any): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Requested] })
               .getCount();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator.status IN (:...statuses)', { statuses: [ResilocIndicatorStatus.Requested] })
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getRequestedResilocIndicatorsByCommunity(communityId: ObjectId | any, page: number, limit: number, status: ResilocIndicatorStatus[], flid: string, authUser: any): Promise<PaginationResilocIndicatorsDto> {
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
               if (String(status) == this.configService.get<string>('query.requested_indicator_status')) {
                    status = Object.values(ResilocIndicatorStatus);
               }
               const community = await this.communitiesService.findOne(communityId);
               const requestedResilocIndicatorIds = community?.requestedIndicators;
               const requestedResilocIndicators = await this.findByIds(requestedResilocIndicatorIds);

               const filteredRequestedResilocIndicatorIds = [];
               requestedResilocIndicators.forEach(requestedResilocIndicator => {
                    if (status.includes(requestedResilocIndicator.status)) {
                         filteredRequestedResilocIndicatorIds.push(requestedResilocIndicator._id);
                    }
               });

               return await this.findByIdsWithPagination(filteredRequestedResilocIndicatorIds, page, limit);
          }
     }

     async getByTag(tagName: string, page: number, limit: number): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where(':tag = ANY(resiloc_indicator.tags)', { tag: tagName })
               .getCount();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where(':tag = ANY(resiloc_indicator.tags)', { tag: tagName })
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .leftJoinAndSelect('resiloc_proxy.metadata', 'resiloc_proxy_metadata')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getAllTags(page: number, limit: number, orderBy: ResilocIndicatorTagOrderingOption, arrange: ArrangingOption, flid: string, authUser: any): Promise<PaginationResilocIndicatorTagsDto> {
          if (!Object.values(ResilocIndicatorTagOrderingOption).includes(orderBy)) {
               orderBy = this.configService.get<ResilocIndicatorTagOrderingOption>('pagination.orderBy');
          }
          if (!Object.values(ArrangingOption).includes(arrange)) {
               arrange = this.configService.get<ArrangingOption>('pagination.arrange');
          }

          const resilocIndicators = await this.resilocIndicatorRepository.find();
          let tags = new Set<String>();
          if (await this.usersService.isAdmin(authUser.username)) {
               for (let resilocIndicator of resilocIndicators) {
                    for (let tag of resilocIndicator.tags) {
                         tags.add(tag);
                    }
               }
          } else {
               for (let resilocIndicator of resilocIndicators) {
                    if (resilocIndicator.visibility != ResilocIndicatorVisibility.Draft
                         && resilocIndicator.status != ResilocIndicatorStatus.Requested
                         && resilocIndicator.status != ResilocIndicatorStatus.Rejected) {
                         for (let tag of resilocIndicator.tags) {
                              tags.add(tag);
                         }
                    }
               }
          }

          const totalItems = tags.size;

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

          let paginationResilocIndicatorTagsDto = new PaginationResilocIndicatorTagsDto();
          paginationResilocIndicatorTagsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          let sortedTags = Array.from(tags).sort();
          if (arrange == ArrangingOption.Descending) {
               sortedTags = sortedTags.reverse();
          }

          const items = sortedTags.slice((page - 1) * limit, page * limit);

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          paginationResilocIndicatorTagsDto.items = items;
          paginationResilocIndicatorTagsDto.metadata.currentPage = page;
          paginationResilocIndicatorTagsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorTagsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorTagsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorTagsDto;
     }

     async getResilocIndicator(id: string, flid: string, authUser: any): Promise<ResilocIndicator> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               if (await this.usersService.isAdmin(authUser.username)) {
                    return resilocIndicator;
               } else {
                    const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocIndicator(id);
                    if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                         return resilocIndicator;
                    } else {
                         if (resilocIndicator.status == ResilocIndicatorStatus.Requested
                              || resilocIndicator.status == ResilocIndicatorStatus.Rejected) {
                              throw new BadRequestException(`Only admin can see a ${resilocIndicator.status} resiloc indicator`);
                         }
                         if (resilocIndicator.visibility == ResilocIndicatorVisibility.Draft) {
                              throw new BadRequestException(`Only admin can see a ${resilocIndicator.visibility} resiloc indicator`);
                         }
                         return resilocIndicator;
                    }
               }
          }
     }

     async updateResilocIndicatorStatus(id: string, updateResilocIndicatorStatusDto: UpdateResilocIndicatorStatusDto): Promise<ResilocIndicator> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               if ((resilocIndicator.status == ResilocIndicatorStatus.Verified || resilocIndicator.status == ResilocIndicatorStatus.Accepted)
                    && (updateResilocIndicatorStatusDto.status == ResilocIndicatorStatus.Requested || updateResilocIndicatorStatusDto.status == ResilocIndicatorStatus.Rejected)) {
                    const isBeingUsed = await this.indicatorsService.isResilocIndicatorBeingUsedByCommunities(id);
                    if (isBeingUsed) {
                         throw new BadRequestException(`Cannot update this ${resilocIndicator.status} proxy to ${updateResilocIndicatorStatusDto.status} status because it is being used by at least one community`);
                    }
               }
               const updatedIndicator = this.resilocIndicatorRepository.merge(resilocIndicator, updateResilocIndicatorStatusDto);
               return await this.resilocIndicatorRepository.save(updatedIndicator);
          } else {
               throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
          }
     }

     async update(id: string, updateResilocIndicatorDto: UpdateResilocIndicatorDto, flid: string, authUser: any): Promise<ResilocIndicator> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               let allowed = false;
               if (await this.usersService.isAdmin(authUser.username)) {
                    allowed = true;
               } else {
                    const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocIndicator(id);
                    if (resilocIndicator.status == ResilocIndicatorStatus.Requested
                         && resilocIndicator.visibility == ResilocIndicatorVisibility.Draft
                         && await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                         allowed = true;
                    } else {
                         throw new ForbiddenException('Forbidden resource');
                    }
               }

               if (allowed) {
                    if (Object.keys(updateResilocIndicatorDto).length != 0) {
                         // if (generalAttributesOfResilocIndicatorDto.visibility && generalAttributesOfResilocIndicatorDto.visibility != resilocIndicator.visibility) {
                         //      const visibility = generalAttributesOfResilocIndicatorDto.visibility as String;
                         //      for (let resilocProxyId of assignedResilocProxyIdsOfResilocIndicator) {
                         //           const resilocProxy = await this.resilocProxiesService.findOne(resilocProxyId);
                         //           if (resilocProxy) {
                         //                await this.resilocProxiesService.updateVisibility(resilocProxyId, visibility as ResilocProxyVisibility);
                         //           }
                         //      }
                         // }
                         return await this.resilocIndicatorRepository.save(
                              await this.resilocIndicatorRepository.merge(resilocIndicator, updateResilocIndicatorDto)
                         );
                    }
               }
          } else {
               throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
          }
     }

     async assignResilocProxiesForResilocIndicator(id: string, createResilocProxyOfResilocIndicatorDto: CreateResilocProxiesOfResilocIndicatorDto, flid: string, authUser: any): Promise<ResilocIndicator> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               let allowed = false;
               if (await this.usersService.isAdmin(authUser.username)) {
                    allowed = true;
               } else {
                    const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocIndicator(id);
                    if (resilocIndicator.status == ResilocIndicatorStatus.Requested
                         && resilocIndicator.visibility == ResilocIndicatorVisibility.Draft
                         && await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                         allowed = true;
                    } else {
                         throw new ForbiddenException('Forbidden resource');
                    }
               }

               if (allowed) {
                    let resilocProxyIds = [];
                    for (let resilocProxyId of createResilocProxyOfResilocIndicatorDto.resilocProxyIds) {
                         await this.checkResilocProxyOfResilocIndicator(resilocProxyId);
                         resilocProxyIds.push(resilocProxyId);
                    }

                    if (await this.helpersService.hasDuplicates(resilocProxyIds)) {
                         throw new BadRequestException(`Array of resiloc proxies contains duplicate resiloc proxy id values`);
                    }

                    const assignedResilocProxyIdsOfResilocIndicator = await this.getAssignedResilocProxyIdsOfResilocIndicator(id);

                    const addedResilocProxyIds = arrSubtraction(createResilocProxyOfResilocIndicatorDto.resilocProxyIds, assignedResilocProxyIdsOfResilocIndicator);
                    if (Object.keys(addedResilocProxyIds).length != 0) {
                         for (let addedResilocProxyId of addedResilocProxyIds) {
                              const resilocProxy = await this.resilocProxiesService.findOne(addedResilocProxyId);
                              if (resilocProxy) {
                                   resilocIndicator.resilocProxies.push(resilocProxy);
                              }
                         }
                    }

                    const removedResilocProxyIds = arrSubtraction(assignedResilocProxyIdsOfResilocIndicator, createResilocProxyOfResilocIndicatorDto.resilocProxyIds);
                    if (Object.keys(removedResilocProxyIds).length != 0) {
                         for (let removedResilocProxyId of removedResilocProxyIds) {
                              const resilocProxy = await this.resilocProxiesService.findOne(removedResilocProxyId);
                              if (resilocProxy) {
                                   var removeIndex = resilocIndicator.resilocProxies.map(resilocProxy => resilocProxy._id).indexOf(removedResilocProxyId);
                                   ~removeIndex && resilocIndicator.resilocProxies.splice(removeIndex, 1);
                              }
                         }
                    }

                    return await this.resilocIndicatorRepository.save(resilocIndicator);
               }
          } else {
               throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
          }
     }

     // async assignResilocProxiesForResilocIndicator(id: string, createResilocProxyOfResilocIndicatorDto: CreateResilocProxyOfResilocIndicatorDto[], flid: string, authUser: any): Promise<any> {
     //      const resilocIndicator = await this.findOne(id);
     //      if (resilocIndicator) {
     //           let allowed = false;
     //           if (await this.usersService.isAdmin(authUser.username)) {
     //                allowed = true;
     //           } else {
     //                const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocIndicator(id);
     //                if (resilocIndicator.status == ResilocIndicatorStatus.Requested
     //                     && resilocIndicator.visibility == ResilocIndicatorVisibility.Draft
     //                     && await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
     //                     allowed = true;
     //                } else {
     //                     throw new ForbiddenException('Forbidden resource');
     //                }
     //           }

     //           if (allowed) {
     //                if (Object.keys(createResilocProxyOfResilocIndicatorDto).length == 0) {
     //                     throw new BadRequestException('No resiloc proxies were requested');
     //                } else {
     //                     let resilocProxyIds = [];
     //                     for (let resilocProxyOfResilocIndicatorDto of createResilocProxyOfResilocIndicatorDto) {
     //                          const resilocProxyId = resilocProxyOfResilocIndicatorDto.resilocProxyId;
     //                          await this.checkResilocProxyOfResilocIndicatorAssociation(resilocProxyId, resilocProxyOfResilocIndicatorDto);
     //                          resilocProxyIds.push(resilocProxyId);
     //                     }

     //                     if (await this.helpersService.hasDuplicates(resilocProxyIds)) {
     //                          throw new BadRequestException(`Array of resiloc proxies contains duplicate resiloc proxy id values`);
     //                     }

     //                     const assignedResilocProxyIdsOfResilocIndicator = await this.getAssignedResilocProxyIdsOfResilocIndicator(id);
     //                     resilocProxyIds.forEach(resilocProxyId => {
     //                          if (assignedResilocProxyIdsOfResilocIndicator.includes(resilocProxyId)) {
     //                               throw new BadRequestException(`Resiloc proxy ${resilocProxyId} was added in this indicator`);
     //                          }
     //                     });

     //                     for (let resilocProxyOfResilocIndicatorDto of createResilocProxyOfResilocIndicatorDto) {
     //                          let associatedValuesBetweenProxyIndicator = (({ resilocProxyId, ...o }) => o)(resilocProxyOfResilocIndicatorDto);

     //                          let resilocIndicatorToResilocProxy = new ResilocIndicatorToResilocProxy();
     //                          for (const [key, value] of Object.entries(associatedValuesBetweenProxyIndicator)) {
     //                               resilocIndicatorToResilocProxy[key] = value;
     //                          }
     //                          resilocIndicatorToResilocProxy.resilocIndicator = resilocIndicator;

     //                          const resilocProxyId = resilocProxyOfResilocIndicatorDto.resilocProxyId;
     //                          const resilocProxy = await this.resilocProxiesService.findOne(resilocProxyId);
     //                          resilocIndicatorToResilocProxy.resilocProxy = resilocProxy;

     //                          await this.resilocIndicatorToResilocProxyRepository.save(
     //                               this.resilocIndicatorToResilocProxyRepository.create(resilocIndicatorToResilocProxy)
     //                          );
     //                     }

     //                     return await this.findOne(id);
     //                }
     //           }
     //      } else {
     //           throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
     //      }

     // }

     async remove(id: string, flid: string, authUser: any): Promise<any> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               // Need to update here
               const isBeingUsed = false;
               if (isBeingUsed) {
                    throw new BadRequestException(`Resiloc indicator ${id} is being used by at least one community`);
               } else {
                    let allowed = false;
                    const isAdmin = await this.usersService.isAdmin(authUser.username);
                    const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocIndicator(id);
                    if (isAdmin) {
                         allowed = true;
                    } else {
                         if ((resilocIndicator.status == ResilocIndicatorStatus.Requested || resilocIndicator.status == ResilocIndicatorStatus.Rejected)
                              && resilocIndicator.visibility == ResilocIndicatorVisibility.Draft
                              && await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                              allowed = true;
                         } else {
                              throw new ForbiddenException('Forbidden resource');
                         }
                    }

                    if (allowed) {
                         if (isAdmin) {
                              return await this.resilocIndicatorRepository.delete(id);
                         } else {
                              const updatedCommunity = await this.communitiesService.removeRequestedResilocIndicatorFromCommunity(communityId, id);
                              if (updatedCommunity) {
                                   return await this.resilocIndicatorRepository.delete(id);
                              }
                         }

                    }
               }
          } else {
               throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
          }
     }

     async findOne(id: string): Promise<ResilocIndicator> {
          return await this.resilocIndicatorRepository.findOne(id, {
               join: {
                    alias: "resiloc_indicator",
                    leftJoinAndSelect: {
                         "resiloc_proxy": "resiloc_indicator.resilocProxies",
                         "resiloc_proxy_metadata": "resiloc_proxy.metadata",
                    }
               }
          });
     }

     async findByIds(ids: string[]): Promise<ResilocIndicator[]> {
          return await this.resilocIndicatorRepository.findByIds(ids, {
               join: {
                    alias: "resiloc_indicator",
                    leftJoinAndSelect: {
                         "resiloc_proxy": "resiloc_indicator.resilocProxies",
                         "resiloc_proxy_metadata": "resiloc_proxy.metadata",
                    }
               }
          });
     }

     async findByIdsWithPagination(ids: string[], page: number, limit: number): Promise<PaginationResilocIndicatorsDto> {
          const totalItems = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator._id IN (:...ids)', { ids: [null, ...ids] })
               .getCount();

          limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
          const skippedItems = (page - 1) * limit;

          const items = await this.resilocIndicatorRepository.createQueryBuilder('resiloc_indicator')
               .where('resiloc_indicator._id IN (:...ids)', { ids: [null, ...ids] })
               .leftJoinAndSelect('resiloc_indicator.resilocProxies', 'resiloc_proxy')
               .orderBy('resiloc_indicator.dateCreated', 'ASC')
               .skip(skippedItems)
               .take(limit)
               .getMany();

          let totalPage = Math.ceil(totalItems / limit);
          if (isNaN(totalPage)) totalPage = 0;

          let paginationResilocIndicatorsDto = new PaginationResilocIndicatorsDto();
          paginationResilocIndicatorsDto.metadata = new PaginationMetaDataResilocIndicatorsDto();

          paginationResilocIndicatorsDto.items = items;
          paginationResilocIndicatorsDto.metadata.currentPage = page;
          paginationResilocIndicatorsDto.metadata.totalPages = totalPage;
          paginationResilocIndicatorsDto.metadata.itemsPerPage = limit;
          paginationResilocIndicatorsDto.metadata.totalItems = totalItems;

          return paginationResilocIndicatorsDto;
     }

     async getAssignedResilocProxyIdsOfResilocIndicator(id: string): Promise<string[]> {
          const resilocIndicator = await this.findOne(id);
          if (resilocIndicator) {
               return resilocIndicator.resilocProxies.map(e => {
                    return e._id;
               });
          } else {
               throw new NotFoundException(`Resiloc indicator ${id} does not exist`);
          }
     }

     async satisfiedContextCriteriaRelation(criteria: ResilocIndicatorCriteriaType, context: ResilocIndicatorContextType): Promise<boolean> {
          if (criteria == ResilocIndicatorCriteriaType.Coherence
               || criteria == ResilocIndicatorCriteriaType.Compliance
               || criteria == ResilocIndicatorCriteriaType.Adequacy) {
               if (context == ResilocIndicatorContextType.Framework) {
                    return true;
               }
          } else if (criteria == ResilocIndicatorCriteriaType.Sustainability
               || criteria == ResilocIndicatorCriteriaType.Innovation
               || criteria == ResilocIndicatorCriteriaType.Inclusiveness) {
               if (context == ResilocIndicatorContextType.Process) {
                    return true;
               }
          } else if (criteria == ResilocIndicatorCriteriaType.Diversity
               || criteria == ResilocIndicatorCriteriaType.Redundancy
               || criteria == ResilocIndicatorCriteriaType.Modularity) {
               if (context == ResilocIndicatorContextType.Resource) {
                    return true;
               }
          }
          return false;
     }

     async checkResilocProxyOfResilocIndicator(resilocProxyId: string) {
          const resilocProxy = await this.resilocProxiesService.findOne(resilocProxyId);
          if (resilocProxy) {
               if (resilocProxy.visibility == ResilocProxyVisibility.Draft) {
                    throw new BadRequestException(`Cannot assign resiloc proxy ${resilocProxy._id} because it is being in draft visibility`);
               }
               if (resilocProxy.status == ResilocProxyStatus.Requested
                    || resilocProxy.status == ResilocProxyStatus.Rejected) {
                    throw new BadRequestException(`Cannot assign resiloc proxy ${resilocProxy._id} because it is being in ${resilocProxy.status} status`);
               }
          } else {
               throw new NotFoundException(`Resiloc proxy ${resilocProxyId} does not exist`);
          }
     }
}
