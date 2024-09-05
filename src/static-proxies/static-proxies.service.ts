import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongoose';
import { In, Repository } from 'typeorm';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { ResilocProxyMetadataDto } from '../resiloc-proxies/dto/create-resiloc-proxy.dto';
import { ResilocProxyMetadataType } from '../resiloc-proxies/enum/resiloc-proxy-metadata-type.enum';
import { ResilocProxiesService } from '../resiloc-proxies/resiloc-proxies.service';
import { StaticProxyOfSnapshotMetadataValueDto } from '../snapshots/dto/create-snapshot.dto';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UsersService } from '../users/users.service';
import { PaginationMetaDataStaticProxiesDto, PaginationStaticProxiesDto, ReadStaticProxiesOfUserByCommunitiesDto, ReadStaticProxyIdsOfUserByCommunitiesDto } from './dto/read-static-proxy.dto';
import { UpdateStaticProxyOfCommunityDto, UpdateStaticProxyOfSnapshotDto } from './dto/update-static-proxy.dto';
import { StaticProxyMetadata } from './entities/static-proxy-metadata.entity';
import { StaticProxy } from './entities/static-proxy.entity';
import { ProxyMetaDataField } from './enum/static-proxy-metadata-field.enum';
import { StaticProxyType } from './enum/static-proxy-type.enum';
import { StaticProxyVisibility } from './enum/static-proxy-visibility.enum';

@Injectable()
export class StaticProxiesService {
    constructor(
        @InjectRepository(StaticProxy) private readonly staticProxyRepository: Repository<StaticProxy>,
        @InjectRepository(StaticProxyMetadata) private readonly staticProxyMetadataRepository: Repository<StaticProxyMetadata>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
        @Inject(forwardRef(() => SnapshotsService)) private readonly snapshotsService: SnapshotsService,
        @Inject(forwardRef(() => ResilocProxiesService)) private readonly resilocProxiesService: ResilocProxiesService,
        private readonly configService: ConfigService,
        private readonly helpersService: HelpersService
    ) { }

    async create(resilocProxyId: string, type: StaticProxyType, visibility: StaticProxyVisibility): Promise<StaticProxy> {
        const resilocProxy = await this.resilocProxiesService.findOne(resilocProxyId);
        if (resilocProxy) {
            const metaDataFields: string[] = Object.values(ProxyMetaDataField);

            let staticProxyMetadata = new StaticProxyMetadata();
            metaDataFields.forEach(field => {
                staticProxyMetadata[field] = resilocProxy.metadata[field];
            });

            const staticProxy = new StaticProxy();
            staticProxy.resilocProxy = resilocProxy;
            staticProxy.metadata = staticProxyMetadata;
            staticProxy.type = type;
            staticProxy.visibility = visibility;

            return await this.staticProxyRepository.save(
                this.staticProxyRepository.create(staticProxy)
            );
        } else {
            throw new BadRequestException(`Resiloc proxy ${resilocProxyId} does not exist`);
        }
    }

    async findAll(page: number, limit: number): Promise<PaginationStaticProxiesDto> {
        const totalItems = await this.staticProxyRepository.count();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.staticProxyRepository.createQueryBuilder('static_proxy')
            .leftJoinAndSelect('static_proxy.resilocProxy', 'resiloc_proxy')
            .orderBy('static_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationStaticProxiesDto = new PaginationStaticProxiesDto();
        paginationStaticProxiesDto.metadata = new PaginationMetaDataStaticProxiesDto();

        paginationStaticProxiesDto.items = items;
        paginationStaticProxiesDto.metadata.currentPage = page;
        paginationStaticProxiesDto.metadata.totalPages = totalPage;
        paginationStaticProxiesDto.metadata.itemsPerPage = limit;
        paginationStaticProxiesDto.metadata.totalItems = totalItems;

        return paginationStaticProxiesDto;
    }

    async getStaticProxy(id: string, flid: string, authUser: any): Promise<StaticProxy> {
        const communityId = await this.communitiesService.getCommunityIdOfStaticProxy(id);
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            return await this.staticProxyRepository.findOne(id, { relations: ["resilocProxy", "metadata"] });
        }
    }

    async getStaticProxyIdsOfUserByCommunities(username: string, authUser: any): Promise<ReadStaticProxyIdsOfUserByCommunitiesDto[]> {
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const communities = await this.communitiesService.getStaticProxyIdsOfUserByCommunities(username);
            let res = [];
            for (let community of communities) {
                const communityId = community._id;
                const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                const readStaticProxyIdsOfUserByCommunitiesDto = new ReadStaticProxyIdsOfUserByCommunitiesDto();
                readStaticProxyIdsOfUserByCommunitiesDto._id = String(community._id);
                readStaticProxyIdsOfUserByCommunitiesDto.name = community.name;

                const staticProxies = await this.findByIds([...community.staticProxies.values()]);
                let staticProxyIds = [];
                for (let staticProxy of staticProxies) {
                    if (staticProxy.visibility == StaticProxyVisibility.Internal || staticProxy.visibility == StaticProxyVisibility.Draft) {
                        if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                            staticProxyIds.push(staticProxy._id);
                        }
                        continue;
                    }
                    staticProxyIds.push(staticProxy._id);
                }
                readStaticProxyIdsOfUserByCommunitiesDto.staticProxyIds = staticProxyIds;
                res.push(readStaticProxyIdsOfUserByCommunitiesDto);
            }
            return res;
        }
    }

    async getStaticProxiesOfUserByCommunities(username: string, authUser: any): Promise<ReadStaticProxiesOfUserByCommunitiesDto[]> {
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
            const communities = await this.communitiesService.getStaticProxyIdsOfUserByCommunities(username);
            for (let community of communities) {
                const communityId = community._id;
                const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                let readStaticProxiesOfUserByCommunitiesDto = new ReadStaticProxiesOfUserByCommunitiesDto();
                readStaticProxiesOfUserByCommunitiesDto._id = String(community._id);
                readStaticProxiesOfUserByCommunitiesDto.name = community.name;
                readStaticProxiesOfUserByCommunitiesDto.staticProxies = [];

                const staticProxies = await this.findByIds([...community.staticProxies.values()]);
                for (let staticProxy of staticProxies) {
                    let isVisible = false;
                    if (staticProxy.visibility == StaticProxyVisibility.Internal || staticProxy.visibility == StaticProxyVisibility.Draft) {
                        if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                            isVisible = true;
                        }
                    } else {
                        isVisible = true;
                    }

                    if (isVisible) {
                        readStaticProxiesOfUserByCommunitiesDto.staticProxies.push(staticProxy);
                    }
                }
                res.push(readStaticProxiesOfUserByCommunitiesDto);
            }
            return res;
        }
    }

    async getStaticProxiesOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationStaticProxiesDto> {
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
                ids = await this.communitiesService.getStaticProxyIdsOfCommunityAtCommunityLevel(communityId);
            } else {
                ids = await this.communitiesService.getStaticProxyIdsOfCommunity(communityId);
            }

            const totalItems = await this.staticProxyRepository.createQueryBuilder('static_proxy')
                .where('static_proxy._id IN (:...ids)', { ids: [null, ...ids] }) // avoiding empty array
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            const items = await this.staticProxyRepository.createQueryBuilder('static_proxy')
                .where('static_proxy._id IN (:...ids)', { ids: [null, ...ids] })
                .leftJoinAndSelect('static_proxy.resilocProxy', 'resiloc-_roxy')
                .leftJoinAndSelect('static_proxy.metadata', 'metadata')
                .orderBy('static_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationStaticProxiesDto = new PaginationStaticProxiesDto();
            paginationStaticProxiesDto.metadata = new PaginationMetaDataStaticProxiesDto();

            paginationStaticProxiesDto.items = items;
            paginationStaticProxiesDto.metadata.currentPage = page;
            paginationStaticProxiesDto.metadata.totalPages = totalPage;
            paginationStaticProxiesDto.metadata.itemsPerPage = limit;
            paginationStaticProxiesDto.metadata.totalItems = totalItems;

            return paginationStaticProxiesDto;
        }
    }

    async getStaticProxiesOfSnapshot(snapshotId: ObjectId, page: number, limit: number, flid: string, authUser: any): Promise<PaginationStaticProxiesDto> {
        const communityId = await this.communitiesService.getCommunityIdOfSnapshot(snapshotId);
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }


        if (allowed) {
            const ids = await this.snapshotsService.getStaticProxyIdsOfSnapshot(snapshotId);

            const totalItems = await this.staticProxyRepository.createQueryBuilder('static_proxy')
                .where('static_proxy._id IN (:...ids)', { ids: [null, ...ids] })
                .getCount();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
            const skippedItems = (page - 1) * limit;

            const items = await this.staticProxyRepository.createQueryBuilder('static_proxy')
                .where('static_proxy._id IN (:...ids)', { ids: [null, ...ids] })
                .leftJoinAndSelect('static_proxy.resilocProxy', 'resiloc_proxy')
                .leftJoinAndSelect('static_proxy.metadata', 'metadata')
                .orderBy('static_proxy.dateCreated', 'ASC')
                .skip(skippedItems)
                .take(limit)
                .getMany();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationStaticProxiesDto = new PaginationStaticProxiesDto();
            paginationStaticProxiesDto.metadata = new PaginationMetaDataStaticProxiesDto();

            paginationStaticProxiesDto.items = items;
            paginationStaticProxiesDto.metadata.currentPage = page;
            paginationStaticProxiesDto.metadata.totalPages = totalPage;
            paginationStaticProxiesDto.metadata.itemsPerPage = limit;
            paginationStaticProxiesDto.metadata.totalItems = totalItems;

            return paginationStaticProxiesDto;
        }
    }

    async updateStaticProxyOfSnapshot(id: string, updateStaticProxyOfSnapshotDto: UpdateStaticProxyOfSnapshotDto, flid: string, authUser: any): Promise<StaticProxy> {
        const staticProxy = await this.findOne(id);
        if (await this.isExist(id)) {
            if (staticProxy.type == StaticProxyType.ProxyOfCommunity) {
                throw new BadRequestException(`This endpoint is used for updating static proxies of snapshots only`);
            }

            const communityId = await this.communitiesService.getCommunityIdOfStaticProxy(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const metadata = updateStaticProxyOfSnapshotDto.metadata;
                if (metadata) {
                    if (await this.isMissingValueOfStaticAndDefaultType(metadata)) {
                        throw new BadRequestException(`Value field is required for static and default type`);
                    } else {
                        await this.staticProxyMetadataRepository.update(staticProxy.metadata._id, metadata);
                    }
                }
                const updatedStaticProxy = await this.staticProxyRepository.merge(staticProxy, updateStaticProxyOfSnapshotDto);
                return await this.staticProxyRepository.save(updatedStaticProxy);
            }
        } else {
            throw new BadRequestException(`Static proxy ${id} does not exist`);
        }
    }

    async updateStaticProxyOfCommunity(id: string, updateStaticProxyOfCommunityDto: UpdateStaticProxyOfCommunityDto, flid: string, authUser: any): Promise<StaticProxy> {
        const staticProxy = await this.findOne(id);
        if (await this.isExist(id)) {
            if (staticProxy.type == StaticProxyType.ProxyOfSnapshot) {
                throw new BadRequestException(`This endpoint is used for updating community configuration only`);
            }

            const communityId = await this.communitiesService.getCommunityIdOfStaticProxy(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const metadata = await this.removeValuesOfRequiredType(updateStaticProxyOfCommunityDto.metadata);
                if (metadata) {
                    if (await this.isMissingValueOfStaticAndDefaultType(metadata)) {
                        throw new BadRequestException(`Value field is required for static and default type`);
                    } else {
                        await this.staticProxyMetadataRepository.update(staticProxy.metadata._id, metadata);
                    }
                }
                const updatedStaticProxy = this.staticProxyRepository.merge(staticProxy, updateStaticProxyOfCommunityDto);
                return await this.staticProxyRepository.save(updatedStaticProxy);
            }
        } else {
            throw new BadRequestException(`Static proxy ${id} does not exist`);
        }
    }

    async remove(id: string): Promise<boolean> {
        const staticProxy = await this.findOne(id);
        if (staticProxy) {
            await this.staticProxyRepository.delete(id);
            await this.staticProxyMetadataRepository.delete(staticProxy.metadata._id);
            return true;
        } else {
            throw new BadRequestException(`Static proxy ${id} does not exist`);
        }
    }

    async save(staticProxy: StaticProxy): Promise<StaticProxy> {
        const savedStaticProxy = await this.staticProxyRepository.save(staticProxy);
        return savedStaticProxy;
    }

    async cloneStaticProxyForSnapshot(staticProxy: StaticProxy, value: number, visibility: StaticProxyVisibility, staticProxyOfSnapshotMetadataValueDto: StaticProxyOfSnapshotMetadataValueDto): Promise<StaticProxy> {
        const clonedStaticProxy = JSON.parse(JSON.stringify(staticProxy));
        delete clonedStaticProxy._id;
        delete clonedStaticProxy.dateCreated;
        delete clonedStaticProxy.dateModified;
        delete clonedStaticProxy.metadata._id;
        delete clonedStaticProxy.metadata.dateCreated;
        delete clonedStaticProxy.metadata.dateModified;

        clonedStaticProxy.value = value;
        clonedStaticProxy.type = StaticProxyType.ProxyOfSnapshot;
        clonedStaticProxy.visibility = visibility;

        const metaDataFields: string[] = Object.values(ProxyMetaDataField);

        metaDataFields.forEach(field => {
            if (clonedStaticProxy.metadata[field]?.type != ResilocProxyMetadataType.Static) {
                if (staticProxyOfSnapshotMetadataValueDto && staticProxyOfSnapshotMetadataValueDto[field]) {
                    if (field == ProxyMetaDataField.PeriodOfReference) {
                        if (String(staticProxyOfSnapshotMetadataValueDto[field]?.from).trim() == ""
                            || String(staticProxyOfSnapshotMetadataValueDto[field]?.to).trim() == "") {
                            delete staticProxyOfSnapshotMetadataValueDto[field]?.from;
                            delete staticProxyOfSnapshotMetadataValueDto[field]?.to;
                        }
                    } else {
                        if (String(staticProxyOfSnapshotMetadataValueDto[field]?.value).trim() == "") {
                            delete staticProxyOfSnapshotMetadataValueDto[field]?.value;
                        }
                    }
                    const tempType = clonedStaticProxy.metadata[field].type;
                    clonedStaticProxy.metadata[field] = { ...clonedStaticProxy.metadata[field], ...staticProxyOfSnapshotMetadataValueDto[field] };
                    clonedStaticProxy.metadata[field].type = tempType; // Keep original setting of metadata type
                }
            }
        });

        return clonedStaticProxy;
    }

    async findOne(id: string): Promise<StaticProxy> {
        return await this.staticProxyRepository.findOne(id, { relations: ['resilocProxy', 'metadata'] });
    }

    async findByIds(ids: string[]): Promise<StaticProxy[]> {
        return await this.staticProxyRepository.findByIds(ids, { relations: ['resilocProxy', 'metadata'] });
    }

    async findPublic(page: number, limit: number): Promise<PaginationStaticProxiesDto> {
        const totalItems = await this.staticProxyRepository.createQueryBuilder('static_proxy')
            .where('static_proxy.visibility IN (:...visibilities)', { visibilities: [StaticProxyVisibility.Public] })
            .getCount();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;
        const skippedItems = (page - 1) * limit;

        const items = await this.staticProxyRepository.createQueryBuilder('static_proxy')
            .where('static_proxy.visibility IN (:...visibilities)', { visibilities: [StaticProxyVisibility.Public] })
            .leftJoinAndSelect('static_proxy.resilocProxy', 'resiloc_proxy')
            .orderBy('static_proxy.dateCreated', 'ASC')
            .skip(skippedItems)
            .take(limit)
            .getMany();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationStaticProxiesDto = new PaginationStaticProxiesDto();
        paginationStaticProxiesDto.metadata = new PaginationMetaDataStaticProxiesDto();

        paginationStaticProxiesDto.items = items;
        paginationStaticProxiesDto.metadata.currentPage = page;
        paginationStaticProxiesDto.metadata.totalPages = totalPage;
        paginationStaticProxiesDto.metadata.itemsPerPage = limit;
        paginationStaticProxiesDto.metadata.totalItems = totalItems;

        return paginationStaticProxiesDto;
    }

    async getStaticProxiesByIdsAtCommunityLevel(ids: string[]): Promise<StaticProxy[]> {
        return await this.staticProxyRepository.findByIds(ids, {
            where: {
                visibility: In([StaticProxyVisibility.Public, StaticProxyVisibility.Community])
            },
            relations: ['resilocProxy', 'metadata']
        });
    }

    async getResilocProxyIdsByStaticProxyIds(ids: string[]): Promise<String[]> {
        if (ids.length != 0) {
            const staticProxies = await this.staticProxyRepository.createQueryBuilder('static_proxy')
                .leftJoinAndSelect('static_proxy.resilocProxy', 'resiloc_proxy')
                .leftJoinAndSelect('static_proxy.metadata', 'metadata')
                .select(['static_proxy._id', 'resiloc_proxy._id'])
                .where('static_proxy._id IN (:...ids)', { ids: [null, ...ids] }) // avoid null array
                .getMany();
            return staticProxies.map(staticProxy => {
                return staticProxy.resilocProxy._id;
            });
        } else {
            return [];
        }
    }

    async isStaticProxyManageableByUser(id: string, authUser: any): Promise<boolean> {
        const communityId = await this.communitiesService.getCommunityIdOfStaticProxy(id);
        if (await this.communitiesService.isUserBelongToCommunity(communityId, authUser.username)) {
            return true;
        } else {
            return false;
        }
    }

    async isExist(id: string): Promise<boolean> {
        if (await this.findOne(id)) {
            return true;
        } else {
            return false;
        }
    }

    async isMissingMinMaxOrMetadataValue(staticProxy: StaticProxy): Promise<void> {
        if (staticProxy.minTarget == null) {
            throw new BadRequestException(`Min target of static proxy ${staticProxy._id} is not filled in`);
        }
        if (staticProxy.maxTarget == null) {
            throw new BadRequestException(`Max target of static proxy ${staticProxy._id} is not filled in`);
        }

        const metaDataFields = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (Object.keys(staticProxy.metadata[field])?.length == 0) {
                throw new BadRequestException(`Descriptive metadata of static proxy ${staticProxy._id} is not filled in completely`);
            }
            if (typeof staticProxy.metadata[field]?.type == 'undefined') {
                throw new BadRequestException(`Missing type value of field ${field} of static proxy ${staticProxy._id}`);
            }
            if (staticProxy.metadata[field].type != ResilocProxyMetadataType.Required) {
                if (field == ProxyMetaDataField.PeriodOfReference) {
                    if (typeof staticProxy.metadata[field]?.from == 'undefined'
                        || typeof staticProxy.metadata[field]?.to == 'undefined') {
                        throw new BadRequestException(`Missing from/to of field ${field} of static proxy ${staticProxy._id} (${staticProxy.metadata[field].type} type)`);
                    }
                } else {
                    if (typeof staticProxy.metadata[field]?.value == 'undefined') {
                        throw new BadRequestException(`Missing value of field ${field} of static proxy ${staticProxy._id} (${staticProxy.metadata[field].type} type)`);
                    }
                }
            }
        });
    }

    async isMissingValueOfStaticAndDefaultType(resilocProxyMetadataDto: ResilocProxyMetadataDto): Promise<boolean> {
        let isMissing = false;
        const metaDataFields: string[] = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (resilocProxyMetadataDto
                && (resilocProxyMetadataDto[field]?.type == ResilocProxyMetadataType.Static
                    || resilocProxyMetadataDto[field]?.type == ResilocProxyMetadataType.Default)) {
                if (field == ProxyMetaDataField.PeriodOfReference) {
                    if (typeof resilocProxyMetadataDto[field]?.from == 'undefined'
                        || typeof resilocProxyMetadataDto[field]?.to == 'undefined') {
                        isMissing = true;
                    }
                } else {
                    if (typeof resilocProxyMetadataDto[field]?.value == 'undefined') {
                        isMissing = true;
                    }
                }
            }
        });
        return isMissing;
    }

    async isHavingValueOfRequiredType(resilocProxyMetadataDto: ResilocProxyMetadataDto): Promise<boolean> {
        let isHaving = false;
        const metaDataFields: string[] = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (resilocProxyMetadataDto
                && (resilocProxyMetadataDto[field]?.type == ResilocProxyMetadataType.Required)) {
                if (field == ProxyMetaDataField.PeriodOfReference) {
                    if (typeof resilocProxyMetadataDto[field]?.from != 'undefined'
                        && typeof resilocProxyMetadataDto[field]?.to != 'undefined') {
                        isHaving = true;
                    }
                } else {
                    if (typeof resilocProxyMetadataDto[field]?.value != 'undefined') {
                        isHaving = true;
                    }
                }
            }
        });
        return isHaving;
    }

    async checkReadyForSubmittingSnapshot(staticProxyOfSnapshotId: string): Promise<void> {
        const staticProxyOfSnapshot = await this.findOne(staticProxyOfSnapshotId);
        if (staticProxyOfSnapshot.value == null) {
            throw new BadRequestException(`Value of static proxy ${staticProxyOfSnapshot._id} is empty`);
        } else {
            if (+staticProxyOfSnapshot.value < +staticProxyOfSnapshot.minTarget) {
                throw new BadRequestException(`Value of static proxy ${staticProxyOfSnapshot._id} is smaller than min target`);
            }
            if (+staticProxyOfSnapshot.value > +staticProxyOfSnapshot.maxTarget) {
                throw new BadRequestException(`Value of static proxy ${staticProxyOfSnapshot._id} is larger than max target`);
            }
        }
        if (staticProxyOfSnapshot.visibility == StaticProxyVisibility.Draft) {
            throw new BadRequestException(`Static proxy ${staticProxyOfSnapshot._id} is still in the draft visibility`);
        }

        const metaDataFields: string[] = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (staticProxyOfSnapshot.metadata[field]?.type == ResilocProxyMetadataType.Required) {
                if (field == ProxyMetaDataField.PeriodOfReference) {
                    if (typeof staticProxyOfSnapshot.metadata[field]?.from == 'undefined') {
                        throw new BadRequestException(`Missing 'from' value of ${field} (required field) of static proxy ${staticProxyOfSnapshot._id} to submit`);
                    }
                    if (typeof staticProxyOfSnapshot.metadata[field]?.to == 'undefined') {
                        throw new BadRequestException(`Missing 'to' value of ${field} (required field) of static proxy ${staticProxyOfSnapshot._id} to submit`);
                    }
                } else {
                    if (typeof staticProxyOfSnapshot.metadata[field]?.value == 'undefined') {
                        throw new BadRequestException(`Missing value of ${field} (required field) of static proxy ${staticProxyOfSnapshot._id} to submit`);
                    }
                }
            }
        });
    }

    async isContainingStaticType(staticProxyMetadata: StaticProxyMetadata): Promise<boolean> {
        let isContaining = false;
        const metaDataFields = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (staticProxyMetadata
                && staticProxyMetadata[field]?.type == ResilocProxyMetadataType.Static) {
                isContaining = true;
            }
        });
        return isContaining;
    }

    async isContainingStaticValue(id: string, staticProxyMetadata: StaticProxyMetadata, staticProxyOfSnapshotMetadataValueDto: StaticProxyOfSnapshotMetadataValueDto): Promise<void> {
        const metaDataFields = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (staticProxyMetadata && staticProxyMetadata[field]?.type == ResilocProxyMetadataType.Static) {
                if (staticProxyOfSnapshotMetadataValueDto && staticProxyOfSnapshotMetadataValueDto[field]) {
                    throw new BadRequestException(`Unable to update value for a static field of static proxy ${id}: ${field}`);
                }
            }
        });
    }

    async updateValue(id: string, value: number): Promise<any> {
        const updatedStaticProxy = await this.staticProxyRepository.update(id, { "value": value });
        return updatedStaticProxy;
    }

    async updateVisibility(id: string, visibility: StaticProxyVisibility): Promise<any> {
        const updatedStaticProxy = await this.staticProxyRepository.update(id, { "visibility": visibility });
        return updatedStaticProxy;
    }

    async updateMetadataValueForStaticProxyOfSnapshot(staticProxyOfSnapshotId: string, staticProxyOfSnapshotMetadataValueDto: StaticProxyOfSnapshotMetadataValueDto): Promise<any> {
        const currentStaticProxyOfSnapshot = await this.findOne(staticProxyOfSnapshotId);
        const currentStaticProxyOfSnapshotMetadata = { ...currentStaticProxyOfSnapshot.metadata };
        const metaDataFields: string[] = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (typeof staticProxyOfSnapshotMetadataValueDto[field] != 'undefined') {
                if (currentStaticProxyOfSnapshotMetadata[field]?.type == ResilocProxyMetadataType.Required
                    || currentStaticProxyOfSnapshotMetadata[field]?.type == ResilocProxyMetadataType.Default) {
                    if (field == ProxyMetaDataField.PeriodOfReference) {
                        if (staticProxyOfSnapshotMetadataValueDto[field]?.from
                            && String(staticProxyOfSnapshotMetadataValueDto[field]?.from).trim() != "") {
                            currentStaticProxyOfSnapshotMetadata[field].from = staticProxyOfSnapshotMetadataValueDto[field].from;
                        }
                        if (staticProxyOfSnapshotMetadataValueDto[field]?.to
                            && String(staticProxyOfSnapshotMetadataValueDto[field]?.to).trim() != "") {
                            currentStaticProxyOfSnapshotMetadata[field].to = staticProxyOfSnapshotMetadataValueDto[field].to;
                        }
                    } else {
                        if (staticProxyOfSnapshotMetadataValueDto[field]?.value
                            && String(staticProxyOfSnapshotMetadataValueDto[field]?.value).trim() != "") {
                            currentStaticProxyOfSnapshotMetadata[field].value = staticProxyOfSnapshotMetadataValueDto[field].value;
                        }
                    }
                } else if (currentStaticProxyOfSnapshotMetadata[field]?.type == ResilocProxyMetadataType.Static) {
                    throw new BadRequestException(`Unable to update value for a static field`);
                }
            }
        });
        await this.staticProxyMetadataRepository.update(currentStaticProxyOfSnapshot.metadata._id, currentStaticProxyOfSnapshotMetadata);
    }

    async getStaticProxyIdsOfSnapshot(snapshotId: ObjectId): Promise<StaticProxy[]> {
        const communityId = await this.communitiesService.getCommunityIdOfSnapshot(snapshotId);
        const ids = await this.communitiesService.getStaticProxyIdsOfCommunity(communityId);
        return await this.staticProxyRepository.findByIds(ids, { relations: ["resilocProxy", "metadata"] });
    }

    async removeValuesOfRequiredType(resilocProxyMetadataDto: ResilocProxyMetadataDto): Promise<ResilocProxyMetadataDto> {
        const metaDataFields: string[] = Object.values(ProxyMetaDataField);
        metaDataFields.forEach(field => {
            if (field == ProxyMetaDataField.PeriodOfReference) {
                if (resilocProxyMetadataDto
                    && resilocProxyMetadataDto[field]?.type == ResilocProxyMetadataType.Required) {
                    delete resilocProxyMetadataDto[field].from;
                    delete resilocProxyMetadataDto[field].to;
                }
            } else {
                if (resilocProxyMetadataDto
                    && resilocProxyMetadataDto[field]?.type == ResilocProxyMetadataType.Required) {
                    delete resilocProxyMetadataDto[field].value;
                }
            }
        });
        return resilocProxyMetadataDto;
    }

    // --------------------------------------------------------------------------------------------------

    async cloneFromPeriodOfReferencyToPeriodOfReference(): Promise<any> {
        throw new BadRequestException(`Locked`);

        const staticProxies = await this.staticProxyRepository.find();
        for (let staticProxy of staticProxies) {
            const metadata = staticProxy.metadata;
            // const periodOfReferency = metadata.periodOfReferency;
            // const type = periodOfReferency.type;
            // if(type) {
            //     metadata.periodOfReference.type = type;
            //     await this.staticProxyMetadataRepository.update(metadata._id, metadata);
            // }
        }
        return { 'message:': 'Updated successfully' };
    }
}