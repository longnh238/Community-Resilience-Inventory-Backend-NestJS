import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongoose';
import { Repository } from 'typeorm';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { UsersService } from '../users/users.service';
import { CreateResilocProxyDto } from './dto/create-resiloc-proxy.dto';
import { PaginationMetaDataResilocProxiesDto, PaginationResilocProxiesDto, PaginationResilocProxiyTagsDto } from './dto/read-resiloc-proxy.dto';
import { UpdateResilocProxyDto, UpdateResilocProxyStatusDto } from './dto/update-resiloc-proxy.dto';
import { ResilocProxyMetadata } from './entities/resiloc-proxy-metadata.entity';
import { ResilocProxy } from './entities/resiloc-proxy.entity';
import { ResilocProxyTagOrderingOption } from './enum/resiloc-proxy-ordering-options.enum';
import { ResilocProxyStatus } from './enum/resiloc-proxy-status.enum';
import { ResilocProxyVisibility } from './enum/resiloc-proxy-visibility.enum';

@Injectable()
export class ResilocProxiesService {
    constructor(
        @InjectRepository(ResilocProxy) private readonly resilocProxyRepository: Repository<ResilocProxy>,
        @InjectRepository(ResilocProxyMetadata) private readonly resilocProxyMetadata: Repository<ResilocProxyMetadata>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
        @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
        private readonly configService: ConfigService,
        private readonly helpersService: HelpersService
    ) { }


    async create(createResilocProxyDto: CreateResilocProxyDto, flid: string, authUser: any): Promise<ResilocProxy> {
        if (await this.helpersService.hasDuplicates(createResilocProxyDto.tags)) {
            throw new BadRequestException(`Array of tags contains duplicate values`);
        }
        let createdResilocProxy;
        if (createResilocProxyDto.metadata) {
            if (await this.staticProxiesService.isMissingValueOfStaticAndDefaultType(createResilocProxyDto.metadata)) {
                throw new BadRequestException(`Value field is required for static and default type`);
            }
            if (await this.staticProxiesService.isHavingValueOfRequiredType(createResilocProxyDto.metadata)) {
                throw new BadRequestException(`Required type does not need value`);
            }
            if (createResilocProxyDto.metadata.periodOfReference) {
                const from = createResilocProxyDto.metadata.periodOfReference.from;
                const to = createResilocProxyDto.metadata.periodOfReference.to;
                if (new Date(from).getTime() > new Date(to).getTime()) {
                    throw new BadRequestException(`'From' value must be smaller or equal to 'to' value`);
                }
            }
        }

        if (await this.usersService.isAdmin(authUser.username)) {
            const resilocProxy: any = { ...createResilocProxyDto };
            resilocProxy.status = ResilocProxyStatus.Verified;
            createdResilocProxy = await this.resilocProxyRepository.save(
                this.resilocProxyRepository.create(resilocProxy)
            );
        } else {
            // For trigger checking functions
            createdResilocProxy = await this.resilocProxyRepository.save(
                this.resilocProxyRepository.create(createResilocProxyDto)
            );
            if (createdResilocProxy) {
                const communityId = await this.helpersService.decipherText(flid);
                await this.communitiesService.assignRequestedResilocProxyToCommunity(communityId, createdResilocProxy._id);
            }
        }
        return createdResilocProxy;
    }

    async findAll(page: number, limit: number): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.count();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getVisibleResilocProxies(page: number, limit: number, authUser: any): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified, ResilocProxyStatus.Accepted] })
            .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified, ResilocProxyStatus.Accepted] })
            .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getVisibleResilocProxiesByTag(tagName: string, page: number, limit: number, authUser: any): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where(':tag = ANY(resiloc_proxy.tags)', { tag: tagName })
            .andWhere('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified, ResilocProxyStatus.Accepted] })
            .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where(':tag = ANY(resiloc_proxy.tags)', { tag: tagName })
            .andWhere('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified, ResilocProxyStatus.Accepted] })
            .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getVerifiedResilocProxies(page: number, limit: number, authUser: any): Promise<PaginationResilocProxiesDto> {
        let totalItems, items;
        if (await this.usersService.isAdmin(authUser.username)) {
            totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified] })
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified] })
                .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
                .orderBy('resiloc_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();
        } else {
            totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified] })
                .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Verified] })
                .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
                .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
                .orderBy('resiloc_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();
        }


        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getAcceptedResilocProxies(page: number, limit: number, authUser: any): Promise<PaginationResilocProxiesDto> {
        let totalItems, items;
        if (await this.usersService.isAdmin(authUser.username)) {
            totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Accepted] })
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Accepted] })
                .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
                .orderBy('resiloc_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();
        } else {
            totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Accepted] })
                .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
                .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Accepted] })
                .andWhere('resiloc_proxy.visibility NOT IN (:...visibilities)', { visibilities: [ResilocProxyVisibility.Draft] })
                .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
                .orderBy('resiloc_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();
        }

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getRequestedResilocProxies(page: number, limit: number, flid: string, authUser: any): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Requested] })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy.status IN (:...statuses)', { statuses: [ResilocProxyStatus.Requested] })
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getRequestedResilocProxiesByCommunity(communityId: ObjectId | any, page: number, limit: number, status: ResilocProxyStatus[], flid: string, authUser: any): Promise<PaginationResilocProxiesDto> {
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
            if (String(status) == this.configService.get<string>('query.requested_proxy_status')) {
                status = Object.values(ResilocProxyStatus);
            }
            const community = await this.communitiesService.findOne(communityId);
            const requestedResilocProxyIds = community?.requestedProxies;
            const requestedResilocProxies = await this.findByIds(requestedResilocProxyIds);

            const filteredRequestedResilocProxyIds = [];
            requestedResilocProxies.forEach(requestedResilocProxy => {
                if (status.includes(requestedResilocProxy.status)) {
                    filteredRequestedResilocProxyIds.push(requestedResilocProxy._id);
                }
            });

            return await this.findByIdsWithPagination(filteredRequestedResilocProxyIds, page, limit);
        }
    }

    async getByTag(tagName: string, page: number, limit: number): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where(':tag = ANY(resiloc_proxy.tags)', { tag: tagName })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where(':tag = ANY(resiloc_proxy.tags)', { tag: tagName })
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async getAllTags(page: number, limit: number, orderBy: ResilocProxyTagOrderingOption, arrange: ArrangingOption, flid: string, authUser: any): Promise<PaginationResilocProxiyTagsDto> {
        if (!Object.values(ResilocProxyTagOrderingOption).includes(orderBy)) {
            orderBy = this.configService.get<ResilocProxyTagOrderingOption>('pagination.orderBy');
        }
        if (!Object.values(ArrangingOption).includes(arrange)) {
            arrange = this.configService.get<ArrangingOption>('pagination.arrange');
        }

        const resilocProxies = await this.resilocProxyRepository.find();
        let tags = new Set<String>();
        if (await this.usersService.isAdmin(authUser.username)) {
            for (let resilocProxy of resilocProxies) {
                for (let tag of resilocProxy.tags) {
                    tags.add(tag);
                }
            }
        } else {
            for (let resilocProxy of resilocProxies) {
                if (resilocProxy.visibility != ResilocProxyVisibility.Draft
                    && resilocProxy.status != ResilocProxyStatus.Requested
                    && resilocProxy.status != ResilocProxyStatus.Rejected) {
                    for (let tag of resilocProxy.tags) {
                        tags.add(tag);
                    }
                }
            }
        }

        const totalItems = tags.size;

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

        let paginationResilocProxiyTagsDto = new PaginationResilocProxiyTagsDto();
        paginationResilocProxiyTagsDto.metadata = new PaginationMetaDataResilocProxiesDto();

        let sortedTags = Array.from(tags).sort();
        if (arrange == ArrangingOption.Descending) {
            sortedTags = sortedTags.reverse();
        }

        const items = sortedTags.slice((page - 1) * limit, page * limit);

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        paginationResilocProxiyTagsDto.items = items;
        paginationResilocProxiyTagsDto.metadata.currentPage = page;
        paginationResilocProxiyTagsDto.metadata.totalPages = totalPage;
        paginationResilocProxiyTagsDto.metadata.itemsPerPage = limit;
        paginationResilocProxiyTagsDto.metadata.totalItems = totalItems;

        return paginationResilocProxiyTagsDto;
    }

    async getResilocProxy(id: string, flid: string, authUser: any): Promise<ResilocProxy> {
        const resilocProxy = await this.resilocProxyRepository.findOne(id);
        if (resilocProxy) {
            if (await this.usersService.isAdmin(authUser.username)) {
                return resilocProxy;
            } else {
                const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocProxy(id);
                if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                    return resilocProxy;
                } else {
                    if (resilocProxy.status == ResilocProxyStatus.Requested
                        || resilocProxy.status == ResilocProxyStatus.Rejected) {
                        throw new BadRequestException(`Only admin can see a ${resilocProxy.status} resiloc proxy`);
                    }
                    if (resilocProxy.visibility == ResilocProxyVisibility.Draft) {
                        throw new BadRequestException(`Only admin can see a ${resilocProxy.visibility} resiloc proxy`);
                    }
                    return resilocProxy;
                }
            }
        }
    }

    async update(id: string, updateResilocProxyDto: UpdateResilocProxyDto): Promise<ResilocProxy> {
        if (await this.helpersService.hasDuplicates(updateResilocProxyDto.tags)) {
            throw new BadRequestException(`Array of tags contains duplicate values`);
        }
        const resilocProxy = await this.findOne(id);
        if (resilocProxy) {
            const metadata = await this.staticProxiesService.removeValuesOfRequiredType(updateResilocProxyDto.metadata);
            if (metadata) {
                if (await this.staticProxiesService.isMissingValueOfStaticAndDefaultType(metadata)) {
                    throw new BadRequestException(`Value field is required for static and default type`);
                } else {
                    await this.resilocProxyMetadata.update(resilocProxy.metadata._id, metadata);
                }
                if (metadata.periodOfReference) {
                    const from = metadata.periodOfReference.from;
                    const to = metadata.periodOfReference.to;
                    if (new Date(from).getTime() > new Date(to).getTime()) {
                        throw new BadRequestException(`'From' value must be smaller or equal to 'to' value`);
                    }
                }
            }

            const updatedResilocProxy = this.resilocProxyRepository.merge(resilocProxy, updateResilocProxyDto);
            return await this.resilocProxyRepository.save(
                this.resilocProxyRepository.create(updatedResilocProxy)
            );
        } else {
            throw new NotFoundException(`Resiloc proxy ${id} does not exist`);
        }
    }

    async updateResilocProxyStatus(id: string, updateResilocProxyStatusDto: UpdateResilocProxyStatusDto): Promise<ResilocProxy> {
        const resilocProxy = await this.findOne(id);
        if (resilocProxy) {
            if ((resilocProxy.status == ResilocProxyStatus.Verified || resilocProxy.status == ResilocProxyStatus.Accepted)
                && (updateResilocProxyStatusDto.status == ResilocProxyStatus.Requested || updateResilocProxyStatusDto.status == ResilocProxyStatus.Rejected)) {
                const isBeingUsed = await this.communitiesService.isResilocProxyBeingUsedByCommunities(id);
                if (isBeingUsed) {
                    throw new BadRequestException(`Cannot update this ${resilocProxy.status} proxy to ${updateResilocProxyStatusDto.status} status because it is being used by at least one community`);
                }
            }
            const updatedProxy = this.resilocProxyRepository.merge(resilocProxy, updateResilocProxyStatusDto);
            return await this.resilocProxyRepository.save(updatedProxy);
        } else {
            throw new NotFoundException(`Resiloc proxy ${id} does not exist`);
        }
    }

    async remove(id: string, flid: string, authUser: any): Promise<any> {
        const resilocProxy = await this.findOne(id);
        if (resilocProxy) {
            // Need to update here (check whether this proxy was linked to indicators/scenarios)
            const isBeingUsed = await this.communitiesService.isResilocProxyBeingUsedByCommunities(id);
            if (isBeingUsed) {
                throw new BadRequestException(`Resiloc proxy ${id} is being used by at least one community`);
            } else {
                let allowed = false;
                const isAdmin = await this.usersService.isAdmin(authUser.username);
                const communityId = await this.communitiesService.getCommunityIdOfRequestedResilocProxy(id);
                if (isAdmin) {
                    allowed = true;
                } else {
                    if ((resilocProxy.status == ResilocProxyStatus.Requested || resilocProxy.status == ResilocProxyStatus.Rejected)
                        && resilocProxy.visibility == ResilocProxyVisibility.Draft
                        && await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                        allowed = true;
                    } else {
                        throw new ForbiddenException('Forbidden resource');
                    }
                }

                if (allowed) {
                    if (isAdmin) {
                        return await this.resilocProxyRepository.delete(id);
                    } else {
                        const updatedCommunity = await this.communitiesService.removeRequestedResilocProxyFromCommunity(communityId, id);
                        if (updatedCommunity) {
                            return await this.resilocProxyRepository.delete(id);
                        }
                    }

                }
            }
        } else {
            throw new NotFoundException(`Resiloc proxy ${id} does not exist`);
        }
    }

    async findOne(id: string): Promise<ResilocProxy> {
        return await this.resilocProxyRepository.findOne(id, { relations: ["metadata"] });
    }

    async findByIds(ids: string[]): Promise<ResilocProxy[]> {
        return await this.resilocProxyRepository.findByIds(ids, { relations: ["metadata"] });
    }

    async findByIdsWithPagination(ids: string[], page: number, limit: number): Promise<PaginationResilocProxiesDto> {
        const totalItems = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy._id IN (:...ids)', { ids: [null, ...ids] })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.resilocProxyRepository.createQueryBuilder('resiloc_proxy')
            .where('resiloc_proxy._id IN (:...ids)', { ids: [null, ...ids] })
            .leftJoinAndSelect('resiloc_proxy.metadata', 'metadata')
            .orderBy('resiloc_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationResilocProxiesDto = new PaginationResilocProxiesDto();
        paginationResilocProxiesDto.metadata = new PaginationMetaDataResilocProxiesDto();

        paginationResilocProxiesDto.items = items;
        paginationResilocProxiesDto.metadata.currentPage = page;
        paginationResilocProxiesDto.metadata.totalPages = totalPage;
        paginationResilocProxiesDto.metadata.itemsPerPage = limit;
        paginationResilocProxiesDto.metadata.totalItems = totalItems;

        return paginationResilocProxiesDto;
    }

    async updateVisibility(id: string, visibility: ResilocProxyVisibility): Promise<any> {
        const updatedResilocProxy = await this.resilocProxyRepository.update(id, { "visibility": visibility });
        return updatedResilocProxy;
    }

    // --------------------------------------------------------------------------------------------------

    async createMetadataForExistingResilocProxies(): Promise<any> {
        throw new BadRequestException(`Locked`);

        const resilocProxies = await this.resilocProxyRepository.find();
        for (let resilocProxy of resilocProxies) {
            const resilocProxyMetadata = new ResilocProxyMetadata();
            resilocProxy.metadata = resilocProxyMetadata;

            await this.resilocProxyRepository.save(resilocProxy);
        }
        return { 'message:': 'Updated successfully' };
    }
}

