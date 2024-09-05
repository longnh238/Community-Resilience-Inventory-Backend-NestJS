import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { CommunitiesService } from '../communities/communities.service';
import { Community } from '../communities/schemas/community.schema';
import { HelpersService } from '../helpers/helpers.service';
import { StaticProxyType } from '../static-proxies/enum/static-proxy-type.enum';
import { StaticProxyVisibility } from '../static-proxies/enum/static-proxy-visibility.enum';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateSnapshotDto, CreateStaticProxyOfSnapshotDto } from './dto/create-snapshot.dto';
import { DeleteStaticProxiesFromSnapshotDto } from './dto/delete-snapshot.dto';
import { PaginationMetaDataSnapshotsDto, PaginationSnapshotsDto, ReadSnapshotIdsOfUserByCommunitiesDto, ReadSnapshotsOfUserByCommunitiesDto } from './dto/read-snapshot.dto';
import { UpdateSnapshotDto, UpdateStaticProxyOfSnapshotDto } from './dto/update-snapshot.dto';
import { SnapshotStatus } from './enum/snapshot-status.enum';
import { StaticProxyOfSnapshotBehaviour } from './enum/snapshot-type.enum';
import { SnapshotVisibility } from './enum/snapshot-visibility.enum';
import { Snapshot } from './schemas/snapshot.schema';

@Injectable()
export class SnapshotsService {
    constructor(
        @InjectModel(Snapshot.name) private snapshotModel: Model<Snapshot>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
        @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
        private readonly configService: ConfigService,
        private readonly helpersService: HelpersService
    ) { }

    async create(communityId: ObjectId | any, createSnapshotDto: CreateSnapshotDto, flid: string, authUser: any): Promise<Snapshot> {
        if (communityId == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                communityId = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        const community = await this.communitiesService.findOne(communityId);
        if (community) {
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                // Create empty snapshot
                const createdSnapshot = await new this.snapshotModel(createSnapshotDto).save();
                await this.communitiesService.assignSnapshotToCommunity(community._id, createdSnapshot._id);
                return createdSnapshot;
            }
        } else {
            throw new NotFoundException(`Community id ${communityId} does not exist`);
        }
    }

    async findAll(page: number, limit: number): Promise<PaginationSnapshotsDto> {
        const query1 = this.snapshotModel.find();
        const totalItems = await query1.countDocuments();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

        const query2 = this.snapshotModel.find().sort({ _id: 1 })
        const items = await query2.skip((page - 1) * limit).limit(limit).exec();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationSnapshotsDto = new PaginationSnapshotsDto();
        paginationSnapshotsDto.metadata = new PaginationMetaDataSnapshotsDto();

        paginationSnapshotsDto.items = items;
        paginationSnapshotsDto.metadata.currentPage = page;
        paginationSnapshotsDto.metadata.totalPages = totalPage;
        paginationSnapshotsDto.metadata.itemsPerPage = limit;
        paginationSnapshotsDto.metadata.totalItems = totalItems;

        return paginationSnapshotsDto;
    }

    async getSnapshot(id: ObjectId, flid: string, authUser: any): Promise<Snapshot> {
        const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const snapshot = await this.snapshotModel.findOne({ _id: id }).exec();
            const staticProxies = await this.staticProxiesService.findByIds(snapshot.staticProxies);

            staticProxies.forEach(staticProxy => {
                delete staticProxy.type;
            });

            let res = { ...snapshot['_doc'] };
            res.staticProxies = staticProxies;

            return res;
        }
    }

    async getSnapshotIdsOfUserByCommunities(username: string, authUser: any): Promise<ReadSnapshotIdsOfUserByCommunitiesDto[]> {
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const communities = await this.communitiesService.getSnapshotIdsOfUserByCommunities(username);
            let res = [];
            for (let community of communities) {
                const communityId = community._id;
                const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                const readSnapshotIdsOfUserByCommunitiesDto = new ReadSnapshotIdsOfUserByCommunitiesDto();
                readSnapshotIdsOfUserByCommunitiesDto._id = String(community._id);
                readSnapshotIdsOfUserByCommunitiesDto.name = community.name;

                const snapshots = await this.findByIds(community.snapshots);
                let snapshotIds = [];
                for (let snapshot of snapshots) {
                    if (snapshot.visibility == SnapshotVisibility.Internal || snapshot.visibility == SnapshotVisibility.Draft) {
                        if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                            snapshotIds.push(snapshot._id);
                        }
                        continue;
                    }
                    snapshotIds.push(snapshot._id);
                }
                readSnapshotIdsOfUserByCommunitiesDto.snapshotIds = snapshotIds;
                res.push(readSnapshotIdsOfUserByCommunitiesDto);
            }
            return res;
        }
    }

    async getSnapshotsOfUserByCommunities(username: string, authUser: any): Promise<ReadSnapshotsOfUserByCommunitiesDto[]> {
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Token mismatch');
        }

        if (allowed) {
            let res = [];
            const communities = await this.communitiesService.getSnapshotsOfUserByCommunities(username);
            for (let community of communities) {
                const communityId = community._id;
                const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                let readSnapshotsOfUserByCommunitiesDto = new ReadSnapshotsOfUserByCommunitiesDto();
                readSnapshotsOfUserByCommunitiesDto._id = String(community._id);
                readSnapshotsOfUserByCommunitiesDto.name = community.name;
                readSnapshotsOfUserByCommunitiesDto.snapshots = [];

                for (let snapshot of community.snapshots) {
                    let isVisible = false;
                    if (snapshot['visibility'] == SnapshotVisibility.Internal || snapshot['visibility'] == SnapshotVisibility.Draft) {
                        if (userRoles.includes(UserRole.LocalManager) || userRoles.includes(UserRole.ResilienceExpert)) {
                            isVisible = true;
                        }
                    } else {
                        isVisible = true;
                    }

                    if (isVisible) {
                        const staticProxies = await this.staticProxiesService.findByIds(snapshot['staticProxies']);
                        let tempSnapshot = { ...snapshot['_doc'] };
                        tempSnapshot.staticProxies = staticProxies;
                        readSnapshotsOfUserByCommunitiesDto.snapshots.push(tempSnapshot);
                    }
                }
                res.push(readSnapshotsOfUserByCommunitiesDto);
            }
            return res;
        }
    }

    async getSnapshotsOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationSnapshotsDto> {
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

            let snapshotIds;
            if (isCommunityLevel) {
                snapshotIds = await this.communitiesService.getSnapshotIdsOfCommunityAtCommunityLevel(communityId);
            } else {
                snapshotIds = await this.communitiesService.getSnapshotIdsOfCommunity(communityId);
            }

            const query1 = this.snapshotModel.find({ _id: { $in: snapshotIds } })
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.snapshotModel.find({ _id: { $in: snapshotIds } }).sort({ _id: 1 })
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let populatedItems = [];
            if (items) {
                for (let item of items) {
                    let staticProxies;
                    if (isCommunityLevel) {
                        staticProxies = await this.staticProxiesService.getStaticProxiesByIdsAtCommunityLevel(item.staticProxies);
                    } else {
                        staticProxies = await this.staticProxiesService.findByIds(item.staticProxies);
                    }

                    staticProxies.forEach(staticProxy => {
                        delete staticProxy.type;
                    });

                    let tempSnapshot = { ...item['_doc'] };
                    tempSnapshot.staticProxies = staticProxies;

                    populatedItems.push(tempSnapshot);
                }
            }

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationSnapshotsDto = new PaginationSnapshotsDto();
            paginationSnapshotsDto.metadata = new PaginationMetaDataSnapshotsDto();

            paginationSnapshotsDto.items = populatedItems;
            paginationSnapshotsDto.metadata.currentPage = page;
            paginationSnapshotsDto.metadata.totalPages = totalPage;
            paginationSnapshotsDto.metadata.itemsPerPage = limit;
            paginationSnapshotsDto.metadata.totalItems = totalItems;

            return paginationSnapshotsDto;
        }
    }

    async getOnHoldSnapshotsOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationSnapshotsDto> {
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
            const snapshots = await this.communitiesService.getOnHoldSnapshotsOfCommunity(communityId);
            const snapshotIds = snapshots.map(snapshot => {
                return snapshot._id;
            });

            const query1 = this.snapshotModel.find({ _id: { $in: snapshotIds } })
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.snapshotModel.find({ _id: { $in: snapshotIds } }).sort({ _id: 1 })
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let populatedItems = [];
            if (items) {
                for (let item of items) {
                    const staticProxies = await this.staticProxiesService.findByIds(item.staticProxies);

                    staticProxies.forEach(staticProxy => {
                        delete staticProxy.type;
                    });

                    let tempSnapshot = { ...item['_doc'] };
                    tempSnapshot.staticProxies = staticProxies;

                    populatedItems.push(tempSnapshot);
                }
            }

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationSnapshotsDto = new PaginationSnapshotsDto();
            paginationSnapshotsDto.metadata = new PaginationMetaDataSnapshotsDto();

            paginationSnapshotsDto.items = populatedItems;
            paginationSnapshotsDto.metadata.currentPage = page;
            paginationSnapshotsDto.metadata.totalPages = totalPage;
            paginationSnapshotsDto.metadata.itemsPerPage = limit;
            paginationSnapshotsDto.metadata.totalItems = totalItems;

            return paginationSnapshotsDto;
        }
    }

    async getSubmittedSnapshotsOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationSnapshotsDto> {
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
            const snapshots = await this.communitiesService.getSubmittedSnapshotsOfCommunity(communityId);
            const snapshotIds = snapshots.map(snapshot => {
                return snapshot._id;
            });

            const query1 = this.snapshotModel.find({ _id: { $in: snapshotIds } })
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.snapshotModel.find({ _id: { $in: snapshotIds } }).sort({ _id: 1 })
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let populatedItems = [];
            if (items) {
                for (let item of items) {
                    const staticProxies = await this.staticProxiesService.findByIds(item.staticProxies);

                    staticProxies.forEach(staticProxy => {
                        delete staticProxy.type;
                    });

                    let tempSnapshot = { ...item['_doc'] };
                    tempSnapshot.staticProxies = staticProxies;

                    populatedItems.push(tempSnapshot);
                }
            }

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationSnapshotsDto = new PaginationSnapshotsDto();
            paginationSnapshotsDto.metadata = new PaginationMetaDataSnapshotsDto();

            paginationSnapshotsDto.items = populatedItems;
            paginationSnapshotsDto.metadata.currentPage = page;
            paginationSnapshotsDto.metadata.totalPages = totalPage;
            paginationSnapshotsDto.metadata.itemsPerPage = limit;
            paginationSnapshotsDto.metadata.totalItems = totalItems;

            return paginationSnapshotsDto;
        }
    }

    async update(id: ObjectId, updateSnapshotDto: UpdateSnapshotDto, flid: string, authUser: any): Promise<Snapshot> {
        if (await this.isExist(id)) {
            const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const snapshot = await this.findOne(id);
                if (snapshot.status == SnapshotStatus.Submitted) {
                    throw new BadRequestException('Can not update a submitted snapshot');
                }

                if (updateSnapshotDto.staticProxies) {
                    const assignedStaticProxyIdsOfSnapshot = snapshot.staticProxies;
                    for (let staticProxyOfSnapshotDto of updateSnapshotDto.staticProxies) {
                        const staticProxyId = staticProxyOfSnapshotDto.staticProxyId;
                        if (!assignedStaticProxyIdsOfSnapshot.includes(staticProxyId)) {
                            throw new NotFoundException(`Statoc proxy id ${staticProxyId} does not exist in this snapshot`);
                        }
                    }
                }

                let updatedSnapshot;
                let generalAttributesOfSnapshotDto = (({ staticProxies, ...o }) => o)(updateSnapshotDto);
                if (generalAttributesOfSnapshotDto && Object.keys(generalAttributesOfSnapshotDto).length != 0) {
                    // if (generalAttributesOfSnapshotDto.visibility && generalAttributesOfSnapshotDto.visibility != snapshot.visibility) {
                    //     const visibility = generalAttributesOfSnapshotDto.visibility as String;
                    //     for (let staticProxyId of snapshot.staticProxies) {
                    //         const staticProxy = await this.staticProxiesService.findOne(staticProxyId);
                    //         if (staticProxy) {
                    //             await this.staticProxiesService.updateVisibility(staticProxyId, visibility as StaticProxyVisibility);
                    //         }
                    //     }
                    // }
                    updatedSnapshot = await this.snapshotModel.findOneAndUpdate({ _id: id }, generalAttributesOfSnapshotDto).exec();
                }

                if (updateSnapshotDto.staticProxies && Object.keys(updateSnapshotDto.staticProxies).length != 0) {
                    let staticProxyIds = [];
                    for (let staticProxyOfSnapshotDto of updateSnapshotDto.staticProxies) {
                        const staticProxyOfSnapshotId = staticProxyOfSnapshotDto.staticProxyId;
                        await this.checkStaticProxyOfSnapshot(staticProxyOfSnapshotId, communityId, staticProxyOfSnapshotDto, StaticProxyOfSnapshotBehaviour.Updating);
                        staticProxyIds.push(staticProxyOfSnapshotDto.staticProxyId);
                    }

                    if (await this.helpersService.hasDuplicates(staticProxyIds)) {
                        throw new BadRequestException(`Array of static proxies contains duplicate static proxy id values`);
                    }

                    for (let staticProxyOfSnapshotDto of updateSnapshotDto.staticProxies) {
                        if (typeof staticProxyOfSnapshotDto.value != 'undefined') {
                            await this.staticProxiesService.updateValue(staticProxyOfSnapshotDto.staticProxyId, staticProxyOfSnapshotDto.value);
                        }
                        if (typeof staticProxyOfSnapshotDto.metadataValue != 'undefined') {
                            await this.staticProxiesService.updateMetadataValueForStaticProxyOfSnapshot(staticProxyOfSnapshotDto.staticProxyId, staticProxyOfSnapshotDto.metadataValue);
                        }
                    }
                }
                return updatedSnapshot;
            }
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async assignStaticProxiesForSnapshot(id: ObjectId, createStaticProxiesOfSnapshotDto: CreateStaticProxyOfSnapshotDto[], flid: string, authUser: any): Promise<Snapshot> {
        const snapshot = await this.findOne(id);
        if (snapshot) {
            if (snapshot.status == SnapshotStatus.Submitted) {
                throw new BadRequestException('Can not add more static proxies to a submitted snapshot');
            }

            const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                if (Object.keys(createStaticProxiesOfSnapshotDto).length == 0) {
                    throw new BadRequestException('No static proxies were requested');
                } else {
                    let staticProxyIds = [];
                    for (let staticProxyOfSnapshotDto of createStaticProxiesOfSnapshotDto) {
                        const staticProxyOfCommunityId = staticProxyOfSnapshotDto.staticProxyId;
                        await this.checkStaticProxyOfSnapshot(staticProxyOfCommunityId, communityId, staticProxyOfSnapshotDto, StaticProxyOfSnapshotBehaviour.Assigning);
                        staticProxyIds.push(staticProxyOfCommunityId);
                    }

                    if (await this.helpersService.hasDuplicates(staticProxyIds)) {
                        throw new BadRequestException(`Array of static proxies contains duplicate static proxy id values`);
                    }

                    const assignedResilocProxyIdsOfSnapshot = await this.getAssignedResilocProxyIdsOfSnapshot(id);
                    const resilocProxyIdsOfNewStaticProxyIds = await this.staticProxiesService.getResilocProxyIdsByStaticProxyIds(staticProxyIds);
                    let i = 0;
                    resilocProxyIdsOfNewStaticProxyIds.forEach(resilocProxyId => {
                        if (assignedResilocProxyIdsOfSnapshot.includes(resilocProxyId)) {
                            throw new BadRequestException(`Static proxy ${staticProxyIds[i]} was added in this snapshot (type: resiloc proxy ${resilocProxyId})`);
                        }
                        i++;
                    });

                    let updatedSnapshot;
                    // const visibilityOfSnapshot = snapshot.visibility as String
                    for (let staticProxyOfSnapshotDto of createStaticProxiesOfSnapshotDto) {
                        const staticProxy = await this.staticProxiesService.findOne(staticProxyOfSnapshotDto.staticProxyId);
                        let staticProxyOfSnapshot = await this.staticProxiesService.cloneStaticProxyForSnapshot(
                            staticProxy,
                            staticProxyOfSnapshotDto.value,
                            // visibilityOfSnapshot as StaticProxyVisibility,
                            staticProxy.visibility,
                            staticProxyOfSnapshotDto.metadataValue);
                        const createdStaticProxyOfSnapshot = await this.staticProxiesService.save(staticProxyOfSnapshot);
                        if (createdStaticProxyOfSnapshot._id) {
                            updatedSnapshot = await this.snapshotModel.findOneAndUpdate({ _id: id }, { $addToSet: { staticProxies: createdStaticProxyOfSnapshot._id } }).exec();
                        }
                    }

                    return updatedSnapshot;
                }
            }
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async submitSnapshot(id: ObjectId, flid: string, authUser: any): Promise<Snapshot> {
        if (await this.isExist(id)) {
            const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const snapshot = await this.findOne(id);
                for (let staticProxyOfSnapshotId of snapshot.staticProxies) {
                    await this.staticProxiesService.checkReadyForSubmittingSnapshot(staticProxyOfSnapshotId);
                }
                return await this.snapshotModel.findOneAndUpdate({ _id: id }, { status: SnapshotStatus.Submitted, dateSubmitted: new Date() }).exec();
            }
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async remove(id: ObjectId, flid: string, authUser: any): Promise<any> {
        if (await this.isExist(id)) {
            const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
                await this.communitiesService.removeSnapshotFromCommunity(communityId, id);

                const snapshot = await this.findOne(id);
                for (let staticProxyId of snapshot.staticProxies) {
                    this.staticProxiesService.remove(staticProxyId);
                }

                return await this.snapshotModel.deleteOne({ _id: id }).exec();
            }
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async removeStaticProxiesFromSnapshot(id: ObjectId, deleteStaticProxiesFromSnapshotDto: DeleteStaticProxiesFromSnapshotDto, flid: string, authUser: any) {
        if (await this.isExist(id)) {
            const snapshot = await this.findOne(id);
            if (snapshot.status == SnapshotStatus.Submitted) {
                throw new BadRequestException('Can not remove static proxies from a submitted snapshot');
            }

            const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const staticProxyOfSnapshotIds = deleteStaticProxiesFromSnapshotDto.staticProxyIds;
                if (Object.keys(staticProxyOfSnapshotIds).length == 0) {
                    throw new BadRequestException('No static proxies were requested');
                } else {
                    for (let staticProxyOfSnapshotId of staticProxyOfSnapshotIds) {
                        if (!await this.staticProxiesService.isExist(staticProxyOfSnapshotId)) {
                            throw new NotFoundException(`Static proxy ${staticProxyOfSnapshotId} does not exist`);
                        }
                    }
                    for (let staticProxyOfSnapshotId of staticProxyOfSnapshotIds) {
                        if (await this.staticProxiesService.remove(staticProxyOfSnapshotId)) {
                            this.snapshotModel.findOneAndUpdate({ _id: id }, { $pull: { staticProxies: staticProxyOfSnapshotId } }).exec();
                        }
                    }
                }
            }
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async findOne(id: ObjectId): Promise<Snapshot> {
        return await this.snapshotModel.findOne({ _id: id }).exec();
    }

    async findByIds(ids: ObjectId[]): Promise<Snapshot[]> {
        return await this.snapshotModel.find({ '_id': { $in: ids } }).exec();
    }

    async getAssignedResilocProxyIdsOfSnapshot(id: ObjectId): Promise<String[]> {
        const snapshot = await this.snapshotModel.findOne({ _id: id }).select('staticProxies').exec();
        if (snapshot) {
            const staticProxyIds = snapshot.staticProxies;
            return await this.staticProxiesService.getResilocProxyIdsByStaticProxyIds(staticProxyIds);
        } else {
            throw new NotFoundException(`Snapshot ${id} does not exist`);
        }
    }

    async getStaticProxyIdsOfSnapshot(id: ObjectId): Promise<String[]> {
        return (await this.snapshotModel.findOne({ _id: id }).select('staticProxies').exec()).staticProxies;
    }

    async getSnapshotIdOfStaticProxyId(staticProxyId: string): Promise<ObjectId> {
        const snapshot = await this.snapshotModel.findOne({ staticProxies: { $in: [staticProxyId] } }).select('_id').exec();
        return snapshot?._id;
    }

    async isSnapshotManageableByUser(id: ObjectId, authUser: any): Promise<boolean> {
        const communityId = await this.communitiesService.getCommunityIdOfSnapshot(id);
        if (await this.communitiesService.isUserBelongToCommunity(communityId, authUser.username)) {
            return true;
        } else {
            return false;
        }
    }

    async isExist(id: ObjectId): Promise<boolean> {
        return await this.snapshotModel.exists({ _id: id });
    }

    async checkStaticProxyOfSnapshot(staticProxyId: string, communityId: ObjectId, staticProxyOfSnapshotDto: CreateStaticProxyOfSnapshotDto | UpdateStaticProxyOfSnapshotDto, staticProxyOfSnapshotBehaviour: StaticProxyOfSnapshotBehaviour): Promise<any> {
        const staticProxy = await this.staticProxiesService.findOne(staticProxyId);
        if (staticProxy) {
            if (staticProxy.visibility == StaticProxyVisibility.Draft) {
                throw new BadRequestException(`Static proxy ${staticProxyId} because it is being in draft visibility`);
            }

            if (!(await this.communitiesService.getStaticProxyIdsOfCommunity(communityId)).includes(staticProxyId)) {
                throw new BadRequestException(`Static proxy ${staticProxyId} does not exist in community ${communityId}`);
            }

            if (staticProxyOfSnapshotBehaviour == StaticProxyOfSnapshotBehaviour.Assigning) {
                if (staticProxy.type == StaticProxyType.ProxyOfSnapshot) {
                    throw new BadRequestException(`Static proxy ${staticProxyId} is not valid`);
                }
            } else if (staticProxyOfSnapshotBehaviour == StaticProxyOfSnapshotBehaviour.Updating) {
                if (staticProxy.type == StaticProxyType.ProxyOfCommunity) {
                    throw new BadRequestException(`Static proxy ${staticProxyId} is not valid`);
                }
            }

            await this.staticProxiesService.isContainingStaticValue(staticProxy._id, staticProxy.metadata, staticProxyOfSnapshotDto.metadataValue);
            await this.staticProxiesService.isMissingMinMaxOrMetadataValue(staticProxy);

            if (+staticProxyOfSnapshotDto?.value < +staticProxy.minTarget) {
                throw new BadRequestException(`Value of static proxy ${staticProxy._id} is smaller than min target`);
            } else if (+staticProxyOfSnapshotDto?.value > +staticProxy.maxTarget) {
                throw new BadRequestException(`Value of static proxy ${staticProxy._id} is larger than max target`);
            }
        } else {
            throw new NotFoundException(`Static proxy ${staticProxy} does not exist`);
        }
    }
}