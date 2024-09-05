import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model, ObjectId } from 'mongoose';
import { arrSubtraction } from '../common/utilities/array-utilities';
import { HelpersService } from '../helpers/helpers.service';
import { PaginationResilocProxiesDto } from '../resiloc-proxies/dto/read-resiloc-proxy.dto';
import { ResilocProxyStatus } from '../resiloc-proxies/enum/resiloc-proxy-status.enum';
import { ResilocProxyVisibility } from '../resiloc-proxies/enum/resiloc-proxy-visibility.enum';
import { ResilocProxiesService } from '../resiloc-proxies/resiloc-proxies.service';
import { ResilocScenarioStatus } from '../resiloc-scenarios/enum/resiloc-scenario-status.enum';
import { ResilocScenarioVisibility } from '../resiloc-scenarios/enum/resiloc-scenario-visibility.enum';
import { ResilocScenariosService } from '../resiloc-scenarios/resiloc-scenarios.service';
import { ScenariosService } from '../scenarios/scenarios.service';
import { SnapshotStatus } from '../snapshots/enum/snapshot-status.enum';
import { SnapshotVisibility } from '../snapshots/enum/snapshot-visibility.enum';
import { Snapshot } from '../snapshots/schemas/snapshot.schema';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { StaticProxyType } from '../static-proxies/enum/static-proxy-type.enum';
import { StaticProxyVisibility } from '../static-proxies/enum/static-proxy-visibility.enum';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { UsersService } from '../users/users.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { FollowedCommunityDto, PaginationCommunitiesDto, PaginationCommunitiesToFollowDto, PaginationFollowedCommunitiesDto, PaginationMetaDataCommunitiesDto, PaginationUsersOfCommunityDto } from './dto/read-community.dto';
import { CommunityScenariosDto, CommunityStaticProxiesDto, PointersToOtherCommunitiesDto, UpdateCommunityDto, UserOfCommunityDto } from './dto/update-community.dto';
import { CommunityVisibility } from './enum/community-visibility.enum';
import { Community } from './schemas/community.schema';

@Injectable()
export class CommunitiesService {
    constructor(
        @InjectModel(Community.name) private communityModel: Model<Community>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => ResilocProxiesService)) private readonly resilocProxiesService: ResilocProxiesService,
        @Inject(forwardRef(() => ResilocScenariosService)) private readonly resilocScenariosService: ResilocScenariosService,
        @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
        @Inject(forwardRef(() => ScenariosService)) private readonly scenariosService: ScenariosService,
        @Inject(forwardRef(() => SnapshotsService)) private readonly snapshotsService: SnapshotsService,
        private readonly configService: ConfigService,
        private readonly helpersService: HelpersService
    ) { }

    async create(createCommunityDto: CreateCommunityDto): Promise<Community> {
        const createdCommunity = new this.communityModel(createCommunityDto);
        return createdCommunity.save();
    }

    async findAll(page: number, limit: number): Promise<PaginationCommunitiesDto> {
        const query1 = this.communityModel.find();
        const totalItems = await query1.countDocuments();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

        const query2 = this.communityModel.find().sort({ _id: 1 });
        const items = await query2.skip((page - 1) * limit).limit(limit).exec();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationCommunitiesDto = new PaginationCommunitiesDto();
        paginationCommunitiesDto.metadata = new PaginationMetaDataCommunitiesDto();

        paginationCommunitiesDto.items = items;
        paginationCommunitiesDto.metadata.currentPage = page;
        paginationCommunitiesDto.metadata.totalPages = totalPage;
        paginationCommunitiesDto.metadata.itemsPerPage = limit;
        paginationCommunitiesDto.metadata.totalItems = totalItems;

        return paginationCommunitiesDto;
    }

    async findAllWithDetail(page: number, limit: number): Promise<PaginationCommunitiesDto> {
        const query1 = this.communityModel.find();
        const totalItems = await query1.countDocuments();

        limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

        const query2 = this.communityModel.find().sort({ _id: 1 }).populate({
            path: 'users',
            model: 'User',
            select: this.configService.get<string>('userModel.excluded_information')
        }).populate({
            path: 'parents peers children',
            model: 'Community',
            select: '-parents -peers -children -users -__v'
        });
        const items = await query2.skip((page - 1) * limit).limit(limit).exec();

        let totalPage = Math.ceil(totalItems / limit);
        if (isNaN(totalPage)) totalPage = 0;

        let paginationCommunitiesDto = new PaginationCommunitiesDto();
        paginationCommunitiesDto.metadata = new PaginationMetaDataCommunitiesDto();

        paginationCommunitiesDto.items = items;
        paginationCommunitiesDto.metadata.currentPage = page;
        paginationCommunitiesDto.metadata.totalPages = totalPage;
        paginationCommunitiesDto.metadata.itemsPerPage = limit;
        paginationCommunitiesDto.metadata.totalItems = totalItems;

        return paginationCommunitiesDto;
    }

    async getCommunitiesToFollow(username: string, page: number, limit: number, authUser: any): Promise<PaginationCommunitiesToFollowDto> {
        if (await this.usersService.isAdmin(username)) {
            throw new ForbiddenException('Admin does not belong to any specific communities');
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        const user = await this.usersService.findOne(username);
        if (user) {
            const followedCommunities = await this.communityModel.find({ users: { $in: user._id } }).select('_id name').exec();
            const followedCommunityIds = followedCommunities.map(followedCommunity => {
                return followedCommunity._id;
            });

            const query1 = this.communityModel.find({ _id: { $nin: followedCommunityIds }, visibility: { $nin: [CommunityVisibility.Draft] } });
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.communityModel.find({ _id: { $nin: followedCommunityIds }, visibility: { $nin: [CommunityVisibility.Draft] } }).select('_id name').sort({ _id: 1 });
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationCommunitiesToFollowDto = new PaginationCommunitiesToFollowDto();
            paginationCommunitiesToFollowDto.metadata = new PaginationMetaDataCommunitiesDto();

            paginationCommunitiesToFollowDto.items = items;
            paginationCommunitiesToFollowDto.metadata.currentPage = page;
            paginationCommunitiesToFollowDto.metadata.totalPages = totalPage;
            paginationCommunitiesToFollowDto.metadata.itemsPerPage = limit;
            paginationCommunitiesToFollowDto.metadata.totalItems = totalItems;

            return paginationCommunitiesToFollowDto;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }
    }

    async getFollowedCommunities(username, page: number, limit: number, authUser: any): Promise<PaginationFollowedCommunitiesDto> {
        if (await this.usersService.isAdmin(username)) {
            throw new ForbiddenException('Admin does not belong to any specific communities');
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        const user = await this.usersService.findOne(username);
        if (user) {
            const query1 = this.communityModel.find({ users: { $in: user._id } });
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.communityModel.find({ users: { $in: user._id } }).select('_id name').sort({ _id: 1 });
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationFollowedCommunitiesDto = new PaginationFollowedCommunitiesDto();
            paginationFollowedCommunitiesDto.metadata = new PaginationMetaDataCommunitiesDto();

            let populatedItems = [];
            for (let item of items) {
                const communityId = item._id;
                const userRoles = await this.usersService.getUserRolesByCommunity(username, communityId);

                let followedCommunityDto = new FollowedCommunityDto();
                followedCommunityDto._id = communityId;
                followedCommunityDto.name = item.name;
                followedCommunityDto.userRoles = userRoles;

                populatedItems.push(followedCommunityDto);
            }

            paginationFollowedCommunitiesDto.items = populatedItems;
            paginationFollowedCommunitiesDto.metadata.currentPage = page;
            paginationFollowedCommunitiesDto.metadata.totalPages = totalPage;
            paginationFollowedCommunitiesDto.metadata.itemsPerPage = limit;
            paginationFollowedCommunitiesDto.metadata.totalItems = totalItems;

            return paginationFollowedCommunitiesDto;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }
    }

    async getCommunity(id: ObjectId | any, flid: string, authUser: any): Promise<Community> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            if (await this.usersService.isCitizen(authUser.username, id)) {
                return await this.communityModel.findOne({ _id: id }).select(this.configService.get<string>('communityModel.community_information')).exec();
            } else {
                return await this.communityModel.findOne({ _id: id }).exec();
            }
        }
    }

    async getCommunityInfoWithDetail(id: ObjectId | any, flid: string, authUser: any): Promise<Community> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            return await this.communityModel.findOne({ _id: id }).populate({
                path: 'users',
                model: 'User',
                select: '-password -isAdmin -__v'
            }).populate({
                path: 'parents peers children',
                model: 'Community',
                select: '-parents -peers -children -users -__v'
            }).exec();
        }
    }

    async getUsersOfCommunity(id: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationUsersOfCommunityDto> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const query1 = await this.communityModel.findOne({ _id: id }).exec();
            const totalItems = query1.users.length;

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const items = await this.communityModel.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(String(id)) } },
                { $unwind: '$users' },
                // { $lookup: { from: 'users', localField: 'users', foreignField: '_id', as: "users" } }, // Also OK
                {
                    $lookup: {
                        from: 'users',
                        let: { 'users': '$users' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$users'] } } },
                            { $project: { 'password': 0, 'isAdmin': 0 } }],
                        as: 'users'
                    }
                },
                { $sort: { 'users.username': 1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                { $unwind: '$users' },
                {
                    $project: {
                        _id: '$users._id',
                        username: '$users.username',
                        firstName: '$users.firstName',
                        lastName: '$users.lastName',
                        phone: '$users.phone',
                        email: '$users.email',
                        userRoles: '$users.userRoles.' + id,
                    }
                },
            ]).exec();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationUsersOfCommunityDto = new PaginationUsersOfCommunityDto();
            paginationUsersOfCommunityDto.metadata = new PaginationMetaDataCommunitiesDto();

            paginationUsersOfCommunityDto.items = items;
            paginationUsersOfCommunityDto.metadata.currentPage = page;
            paginationUsersOfCommunityDto.metadata.totalPages = totalPage;
            paginationUsersOfCommunityDto.metadata.itemsPerPage = limit;
            paginationUsersOfCommunityDto.metadata.totalItems = totalItems;

            return paginationUsersOfCommunityDto;
        }
    }

    async getSelectedResilocProxiesOfCommunity(id: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationResilocProxiesDto> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const community = await this.communityModel.findOne({ _id: id }).exec();
            const resilocProxyIds = [...community.staticProxies.keys()];
            return await this.resilocProxiesService.findByIdsWithPagination(resilocProxyIds, page, limit);
        }
    }

    async assignUserForCommunity(id: ObjectId, userOfCommunityDto: UserOfCommunityDto, authUser: any): Promise<Community> {
        if (await this.usersService.isAdmin(userOfCommunityDto.username)) {
            throw new ForbiddenException('Admin does not belong to any specific communities');
        } else if (await this.usersService.isResilocService(userOfCommunityDto.username)) {
            throw new ForbiddenException('Resiloc service does not belong to any specific communities');
        }

        if (await this.isExist(id)) {
            let allowed = false;
            if (await this.usersService.isAdmin(authUser.username)) {
                allowed = true;
            } else if (await this.usersService.isLocalManager(authUser.username, id)) {
                allowed = true;
            } else if (await this.usersService.isMatchingToken(userOfCommunityDto.username, authUser)) {
                allowed = true;
            } else {
                throw new ForbiddenException('Forbidden resource');
            }

            if (allowed) {
                const community = await this.findOne(id);
                if (community.visibility == CommunityVisibility.Draft) {
                    throw new BadRequestException(`Cannot follow a draft community`);
                }

                if (await this.isUserBelongToCommunity(id, userOfCommunityDto.username)) {
                    throw new ForbiddenException(`User ${userOfCommunityDto.username} followed community ${id}`);
                }

                const username = userOfCommunityDto.username;
                const userId = await this.usersService.getUserIdOfUsername(username);
                if (!userId) {
                    throw new NotFoundException(`Username ${username} does not exist`);
                } else {
                    await this.usersService.setDefaultUserRoleAsCitizen(username, id);
                    const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: id }, { $addToSet: { users: userId } }).exec();
                    return updatedCommunity;
                }
            }
        } else {
            throw new NotFoundException(`Community ${id} does not exist`);
        }
    }

    async update(id: ObjectId | any, updateCommunityDto: UpdateCommunityDto, flid: string, authUser: any): Promise<Community> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            if (updateCommunityDto.visibility && updateCommunityDto.visibility == CommunityVisibility.Draft) {
                const community = await this.findOne(id);
                if (community.users.length > 0) {
                    throw new BadRequestException(`Cannot change the visibility of a community with followed users to draft`);
                }
            }

            const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: id }, updateCommunityDto).exec();
            return updatedCommunity;
        }
    }

    async selectStaticProxiesForCommunity(id: ObjectId | any, communityStaticProxyDto: CommunityStaticProxiesDto, flid: string, authUser: any): Promise<Community> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            for (let resilocProxyId of communityStaticProxyDto.resilocProxyIds) {
                const resilocProxy = await this.resilocProxiesService.findOne(resilocProxyId);
                if (resilocProxy) {
                    if (resilocProxy.status == ResilocProxyStatus.Requested
                        || resilocProxy.status == ResilocProxyStatus.Rejected) {
                        throw new BadRequestException(`Resiloc proxy ${resilocProxy} is being in the ${resilocProxy.status} status`);
                    }
                    if (resilocProxy.visibility == ResilocProxyVisibility.Draft) {
                        throw new BadRequestException(`Resiloc proxy ${resilocProxy} is being in the ${resilocProxy.visibility} visibility`);
                    }
                } else {
                    throw new NotFoundException(`Resiloc proxy id ${resilocProxyId} does not exist`);
                }
            }

            if (await this.helpersService.hasDuplicates(communityStaticProxyDto.resilocProxyIds)) {
                throw new BadRequestException(`Array of resiloc proxy ids contains duplicate values`);
            }

            const community = await this.findOne(id);
            if (community) {
                const selectedStaticProxyIds = Array.from(community.staticProxies.keys());
                let staticProxies = community.staticProxies;

                const addedStaticProxyIds = arrSubtraction(communityStaticProxyDto.resilocProxyIds, selectedStaticProxyIds);
                if (Object.keys(addedStaticProxyIds).length != 0) {
                    for (let addedStaticProxyId of addedStaticProxyIds) {
                        const createdStaticProxy = await this.staticProxiesService.create(addedStaticProxyId, StaticProxyType.ProxyOfCommunity, StaticProxyVisibility.Draft);
                        if (createdStaticProxy._id) {
                            staticProxies.set(addedStaticProxyId, createdStaticProxy._id);
                        }
                    }
                }

                const removedStaticProxyIds = arrSubtraction(selectedStaticProxyIds, communityStaticProxyDto.resilocProxyIds);
                if (Object.keys(removedStaticProxyIds).length != 0) {
                    for (let removedStaticProxyId of removedStaticProxyIds) {
                        const isSuccessed = await this.staticProxiesService.remove(staticProxies.get(removedStaticProxyId));
                        if (isSuccessed) {
                            staticProxies.delete(removedStaticProxyId);
                        }
                    }
                }

                const updatedCommunity = await this.updateStaticProxiesOfCommunity(id, staticProxies);
                return updatedCommunity;
            } else {
                throw new NotFoundException(`Community ${id} does not exist`);
            }
        }
    }

    async selectScenariosForCommunity(id: ObjectId | any, communityScenariosDto: CommunityScenariosDto, flid: string, authUser: any): Promise<Community> {
        if (id == this.configService.get<string>('selectedCommunityTag')) {
            if (flid) {
                id = await this.helpersService.decipherText(flid);
            } else {
                throw new BadRequestException(`flid is required`);
            }
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.isCommunityIdMatchingWithFlid(id, flid)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            for (let resilocScenarioId of communityScenariosDto.resilocScenarioIds) {
                const resilocScenario = await this.resilocScenariosService.findOne(resilocScenarioId);
                if (resilocScenario) {
                    if (resilocScenario.status != ResilocScenarioStatus.Verified) {
                        throw new BadRequestException(`Resiloc scenario ${resilocScenarioId} is not being in the ${resilocScenario.status} status`);
                    }
                    if (resilocScenario.visibility == ResilocScenarioVisibility.Draft) {
                        throw new BadRequestException(`Resiloc scenario ${resilocScenarioId} is being in the ${resilocScenario.visibility} visibility`);
                    }
                } else {
                    throw new NotFoundException(`Resiloc scenario id ${resilocScenarioId} does not exist`);
                }
            }

            if (await this.helpersService.hasDuplicates(communityScenariosDto.resilocScenarioIds)) {
                throw new BadRequestException(`Array of resiloc scenario ids contains duplicate values`);
            }

            const community = await this.findOne(id);
            if (community) {
                const selectedScenarioIds = Array.from(community.scenarios.keys());
                let scenarios = community.scenarios;

                const addedStaticScenarioIds = arrSubtraction(communityScenariosDto.resilocScenarioIds, selectedScenarioIds);
                if (Object.keys(addedStaticScenarioIds).length != 0) {
                    for (let addedStaticScenarioId of addedStaticScenarioIds) {
                        const createdStaticScenario = await this.scenariosService.create(addedStaticScenarioId);
                        if (createdStaticScenario._id) {
                            scenarios.set(addedStaticScenarioId, createdStaticScenario._id);
                        }
                    }
                }

                const removedStaticScenarioIds = arrSubtraction(selectedScenarioIds, communityScenariosDto.resilocScenarioIds);
                if (Object.keys(removedStaticScenarioIds).length != 0) {
                    for (let removedStaticScenarioId of removedStaticScenarioIds) {
                        const isSuccessed = await this.scenariosService.remove(scenarios.get(removedStaticScenarioId));
                        if (isSuccessed) {
                            scenarios.delete(removedStaticScenarioId);
                        }
                    }
                }

                const updatedCommunity = await this.updateScenariosOfCommunity(id, scenarios);
                return updatedCommunity;
            } else {
                throw new NotFoundException(`Community ${id} does not exist`);
            }
        }
    }

    async assignPointersToOtherCommunities(id: ObjectId, pointersToOtherCommunitiesDto: PointersToOtherCommunitiesDto): Promise<Community> {
        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.parents)) {
            throw new BadRequestException(`Array of parents' community ids contains duplicate values`);
        }

        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.peers)) {
            throw new BadRequestException(`Array of peers' community ids contains duplicate values`);
        }

        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.children)) {
            throw new BadRequestException(`Array of children' community ids contains duplicate values`);
        }

        const parentIds = pointersToOtherCommunitiesDto.parents ? pointersToOtherCommunitiesDto.parents : [];
        const peerIds = pointersToOtherCommunitiesDto.peers ? pointersToOtherCommunitiesDto.peers : [];
        const childIds = pointersToOtherCommunitiesDto.children ? pointersToOtherCommunitiesDto.children : [];

        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: id },
            {
                $addToSet: {
                    parents: { $each: parentIds },
                    peers: { $each: peerIds },
                    children: { $each: childIds },
                }
            }).exec();

        if (parentIds && parentIds?.length) {
            parentIds.forEach(parentId => {
                this.communityModel.findOneAndUpdate({ _id: parentId }, { $addToSet: { children: id } }).exec();
            });
        }

        if (peerIds && peerIds?.length) {
            peerIds.forEach(peerId => {
                this.communityModel.findOneAndUpdate({ _id: peerId }, { $addToSet: { peers: id } }).exec();
            });
        }

        if (childIds && childIds?.length) {
            childIds.forEach(childId => {
                this.communityModel.findOneAndUpdate({ _id: childId }, { $addToSet: { parents: id } }).exec();
            });
        }

        return updatedCommunity;
    }

    async remove(id: ObjectId, authUser: any): Promise<any> {
        const community = await this.communityModel.findById(id).exec();
        if (community) {
            if (community.users.length > 0) {
                throw new BadRequestException(`Cannot remove a community that had user`);
            }

            if (community.parents && community.parents?.length) {
                community.parents.forEach(parentId => {
                    this.communityModel.findOneAndUpdate({ _id: parentId }, { $pull: { children: id } }).exec();
                });
            }

            if (community.peers && community.peers?.length) {
                community.peers.forEach(peerId => {
                    this.communityModel.findOneAndUpdate({ _id: peerId }, { $pull: { peers: id } }).exec();
                });
            }

            if (community.children && community.children?.length) {
                community.children.forEach(childId => {
                    this.communityModel.findOneAndUpdate({ _id: childId }, { $pull: { parents: id } }).exec();
                });
            }

            const userIds = community.users;
            for (let userId of userIds) {
                const user = await this.usersService.findOneById(userId);
                if (user) {
                    await this.usersService.removeUserRolesFromCommunity(user.username, id);
                }
            }

            const selectStaticProxies = community.staticProxies;
            for (let [key, value] of selectStaticProxies) {
                await this.staticProxiesService.remove(value);
            }

            const snapshotIds = community.snapshots;
            for (let snapshotId of snapshotIds) {
                await this.snapshotsService.remove(snapshotId, '', authUser);
            }
        }
        return await this.communityModel.deleteOne({ _id: id }).exec();
    }

    async removeUserOfCommunity(id: ObjectId, userOfCommunityDto: UserOfCommunityDto, authUser: any): Promise<Community> {
        if (await this.usersService.isAdmin(userOfCommunityDto.username)) {
            throw new ForbiddenException('Admin does not belong to any specific communities');
        } else if (await this.usersService.isResilocService(userOfCommunityDto.username)) {
            throw new ForbiddenException('Resiloc service does not belong to any specific communities');
        }

        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isLocalManager(authUser.username, id)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(userOfCommunityDto.username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            if (await this.isUserBelongToCommunity(id, userOfCommunityDto.username)) {
                const username = userOfCommunityDto.username;
                const userId = await this.usersService.getUserIdOfUsername(username);
                if (!userId) {
                    throw new NotFoundException(`Username ${username} does not exist`);
                } else {
                    await this.usersService.removeUserRolesFromCommunity(username, id);
                    const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: id }, { $pull: { users: userId } }).exec();
                    return updatedCommunity;
                }
            } else {
                throw new ForbiddenException(`User ${userOfCommunityDto.username} did not follow community ${id}`);
            }
        }
    }

    async removePointersToOtherCommunities(id: ObjectId, pointersToOtherCommunitiesDto: PointersToOtherCommunitiesDto): Promise<Community> {
        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.parents)) {
            throw new BadRequestException(`Array of parents' community ids contains duplicate values`);
        }

        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.peers)) {
            throw new BadRequestException(`Array of peers' community ids contains duplicate values`);
        }

        if (await this.helpersService.hasDuplicates(pointersToOtherCommunitiesDto.children)) {
            throw new BadRequestException(`Array of children' community ids contains duplicate values`);
        }

        const parentIds = pointersToOtherCommunitiesDto.parents ? pointersToOtherCommunitiesDto.parents : [];
        const peerIds = pointersToOtherCommunitiesDto.peers ? pointersToOtherCommunitiesDto.peers : [];
        const childIds = pointersToOtherCommunitiesDto.children ? pointersToOtherCommunitiesDto.children : [];

        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: id },
            {
                $pull: {
                    parents: { $in: parentIds },
                    peers: { $in: peerIds },
                    children: { $in: childIds },
                }
            }).exec();

        if (parentIds && parentIds?.length) {
            parentIds.forEach(parentId => {
                this.communityModel.findOneAndUpdate({ _id: parentId }, { $pull: { children: id } }).exec();
            });
        }

        if (peerIds && peerIds?.length) {
            peerIds.forEach(peerId => {
                this.communityModel.findOneAndUpdate({ _id: peerId }, { $pull: { peers: id } }).exec();
            });
        }

        if (childIds && childIds?.length) {
            childIds.forEach(childId => {
                this.communityModel.findOneAndUpdate({ _id: childId }, { $pull: { parents: id } }).exec();
            });
        }

        return updatedCommunity;
    }

    async updateStaticProxiesOfCommunity(communityId: ObjectId, staticProxies: Map<string, string>): Promise<Community> {
        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: communityId }, { staticProxies: staticProxies }).exec();
        return updatedCommunity;
    }

    async updateScenariosOfCommunity(communityId: ObjectId, scenarios: Map<string, string>): Promise<Community> {
        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: communityId }, { scenarios: scenarios }).exec();
        return updatedCommunity;
    }

    async assignSnapshotToCommunity(communityId: ObjectId, snapshotId: ObjectId): Promise<Community> {
        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: communityId }, { $addToSet: { snapshots: snapshotId } }).exec();
        return updatedCommunity;
    }

    async assignRequestedResilocProxyToCommunity(communityId: ObjectId, requestedResilocProxyId: string): Promise<Community> {
        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: communityId }, { $addToSet: { requestedProxies: requestedResilocProxyId } }).exec();
        return updatedCommunity;
    }

    async assignRequestedIndicatorToCommunity(communityId: ObjectId, requestedIndicatorId: string): Promise<Community> {
        const updatedCommunity = await this.communityModel.findOneAndUpdate({ _id: communityId }, { $addToSet: { requestedIndicators: requestedIndicatorId } }).exec();
        return updatedCommunity;
    }

    async findOne(id: ObjectId): Promise<Community> {
        return await this.communityModel.findOne({ _id: id }).exec();
    }

    async isExist(id: ObjectId): Promise<boolean> {
        return await this.communityModel.exists({ _id: id });
    }

    async getStaticProxyIdsOfCommunity(id: ObjectId): Promise<String[]> {
        const community = await this.communityModel.findOne({ _id: id }).exec();
        return [...community?.staticProxies?.values()];
    }

    async getSnapshotIdsOfCommunity(id: ObjectId): Promise<ObjectId[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot'
        }).exec();
        return community?.snapshots.map(snapshot => {
            return snapshot._id;
        });
    }

    async getScenarioIdsOfCommunity(id: ObjectId): Promise<String[]> {
        const community = await this.communityModel.findOne({ _id: id }).exec();
        return [...community?.scenarios?.values()];
    }

    async getStaticProxyIdsOfUserByCommunities(username: string): Promise<Community[]> {
        const user = await this.usersService.findOne(username);
        return await this.communityModel.find({ users: { $in: user._id } }).select('_id name staticProxies').exec();
    }

    async getSnapshotIdsOfUserByCommunities(username: string): Promise<Community[]> {
        const user = await this.usersService.findOne(username);
        return await this.communityModel.find({ users: { $in: user._id } }).select('_id name snapshots').exec();
    }

    async getScenarioIdsOfUserByCommunities(username: string): Promise<Community[]> {
        const user = await this.usersService.findOne(username);
        return await this.communityModel.find({ users: { $in: user._id } }).select('_id name scenarios').exec();
    }

    async getSnapshotsOfUserByCommunities(username: string): Promise<Community[]> {
        const user = await this.usersService.findOne(username);
        return await this.communityModel.find({ users: { $in: user._id } }).select('_id name snapshots').populate({
            path: 'snapshots',
            model: 'Snapshot'
        }).exec();
    }

    async getStaticProxyIdsOfCommunityAtCommunityLevel(id: ObjectId): Promise<String[]> {
        const community = await this.communityModel.findOne({ _id: id }).exec();
        const staticProxyIds = [...community?.staticProxies?.values()];
        if (staticProxyIds) {
            const communityStaticProxies = await this.staticProxiesService.getStaticProxiesByIdsAtCommunityLevel(staticProxyIds);
            return communityStaticProxies.map(communityStaticProxy => {
                return communityStaticProxy._id;
            });
        }
    }

    async getSnapshotIdsOfCommunityAtCommunityLevel(id: ObjectId): Promise<ObjectId[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot'
        }).exec();
        return community?.snapshots.map(snapshot => {
            if (snapshot.visibility == SnapshotVisibility.Public
                || snapshot.visibility == SnapshotVisibility.Community) {
                return snapshot._id;
            }
        });
    }

    async getScenarioIdsOfCommunityAtCommunityLevel(id: ObjectId): Promise<String[]> {
        const community = await this.communityModel.findOne({ _id: id }).exec();
        const scenarioIds = [...community?.scenarios?.values()];
        if (scenarioIds) {
            const scenarios = await this.scenariosService.getScenariosByIdsAtCommunityLevel(scenarioIds);
            return scenarios.map(scenario => {
                return scenario._id;
            });
        }
    }

    async getCommunityIdOfStaticProxy(staticProxyId: string): Promise<ObjectId> {
        const resilocProxy = await this.staticProxiesService.findOne(staticProxyId);
        if (resilocProxy) {
            const resilocProxyId = resilocProxy.resilocProxy._id;
            const community = await this.communityModel.findOne({ [`staticProxies.${resilocProxyId}`]: staticProxyId }).select('_id').exec();
            // There are two static proxy types: i) proxy of community and ii) proxy of snapshot
            if (community) {
                return community._id;
            } else {
                const snapshotId = await this.snapshotsService.getSnapshotIdOfStaticProxyId(staticProxyId);
                return await this.getCommunityIdOfSnapshot(snapshotId);
            }
        } else {
            throw new NotFoundException(`Static proxy id ${staticProxyId} does not exist`);
        }
    }

    async getCommunityIdOfSnapshot(snapshotId: ObjectId): Promise<ObjectId> {
        const communitiy = await this.communityModel.findOne({ snapshots: { $in: snapshotId } }).select('_id').exec();
        return communitiy._id;
    }

    async getCommunityIdOfScenario(scenarioId: string): Promise<ObjectId> {
        const scenario = await this.scenariosService.findOne(scenarioId);
        if (scenario) {
            const resilocScenarioId = scenario.resilocScenario._id;
            const community = await this.communityModel.findOne({ [`scenarios.${resilocScenarioId}`]: scenarioId }).select('_id').exec();
            if (community) {
                return community._id;
            } else {
                return undefined;
            }
        } else {
            throw new NotFoundException(`Static proxy id ${scenarioId} does not exist`);
        }
    }

    async getCommunityIdOfRequestedResilocProxy(resilocProxyId: string): Promise<ObjectId> {
        const community = await this.communityModel.findOne({ requestedProxies: { $in: [resilocProxyId] } }).select('_id').exec();
        return community?._id;
    }

    async getCommunityIdOfRequestedResilocIndicator(resilocIndicatorId: string): Promise<ObjectId> {
        const community = await this.communityModel.findOne({ requestedIndicators: { $in: [resilocIndicatorId] } }).select('_id').exec();
        return community?._id;
    }

    async getSnapshotsOfCommunity(id: ObjectId): Promise<Snapshot[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot'
        }).exec();
        return community?.snapshots;
    }

    async getRequestedResilocProxyIdsOfCommunity(id: ObjectId): Promise<String[]> {
        const community = await this.communityModel.findOne({ _id: id }).exec();
        return community?.requestedProxies;
    }

    async getOnHoldSnapshotsOfCommunity(id: ObjectId): Promise<Snapshot[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot',
            match: { status: SnapshotStatus.OnHold }
        }).exec();
        return community?.snapshots;
    }

    async getSubmittedSnapshotsOfCommunity(id: ObjectId): Promise<Snapshot[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot',
            match: { status: SnapshotStatus.Submitted }
        }).exec();
        return community?.snapshots;
    }

    async getSubmittedAndNotDraftSnapshotsOfCommunity(id: ObjectId): Promise<Snapshot[]> {
        const community = await this.communityModel.findOne({ _id: id }).populate({
            path: 'snapshots',
            model: 'Snapshot',
            match: {
                status: SnapshotStatus.Submitted,
                visibility: { $ne: SnapshotVisibility.Draft }
            }
        }).exec();
        return community?.snapshots;
    }

    async removeUserFromCommunities(username: string) {
        const user = await this.usersService.findOne(username);
        const communities = await this.communityModel.find({ users: { $in: user._id } }).exec();
        for (let community of communities) {
            await this.communityModel.findOneAndUpdate({ _id: community.id }, { $pull: { users: user._id } }).exec();
        }
    }

    async removeSnapshotFromCommunity(communityId: ObjectId, snapshotId: ObjectId) {
        await this.communityModel.findOneAndUpdate({ _id: communityId }, { $pull: { snapshots: snapshotId } }).exec();
    }

    async removeRequestedResilocProxyFromCommunity(communityId: ObjectId, resilocProxyId: string): Promise<Community> {
        return await this.communityModel.findOneAndUpdate({ _id: communityId }, { $pull: { requestedProxies: resilocProxyId } }).exec();
    }

    async removeRequestedResilocIndicatorFromCommunity(communityId: ObjectId, resilocIndicatorId: string): Promise<Community> {
        return await this.communityModel.findOneAndUpdate({ _id: communityId }, { $pull: { requestedIndicators: resilocIndicatorId } }).exec();
    }

    async isUserBelongToCommunity(communityId: ObjectId, username: string): Promise<boolean> {
        const community = await this.communityModel.findOne({ _id: communityId }).select('users').exec();
        if (community) {
            const userId = await this.usersService.getUserIdOfUsername(username);
            const isUserBelongToCommunity = community.users.includes(userId);
            return isUserBelongToCommunity;
        } else {
            throw new NotFoundException('Community does not exist');
        }
    }

    async isAllowedForAdminAndAll(communityId: ObjectId, authUser: any): Promise<boolean> {
        let isAllowed = false;
        if (await this.isUserBelongToCommunity(communityId, authUser.username)) {
            isAllowed = true;
        } else if (await this.usersService.isAdmin(authUser.username)) {
            isAllowed = true;
        }
        return isAllowed;
    }

    async isAllowedForAdminAndLocalManager(communityId: ObjectId, authUser: any): Promise<boolean> {
        let isAllowed = false;
        if (await this.isUserBelongToCommunity(communityId, authUser.username) && await this.usersService.isLocalManager(authUser.username, communityId)) {
            isAllowed = true;
        } else if (await this.usersService.isAdmin(authUser.username)) {
            isAllowed = true;
        }
        return isAllowed;
    }

    async isCommunityIdMatchingWithFlid(communityId: ObjectId, flid: string): Promise<boolean> {
        const decodedCommunityId = await this.helpersService.decipherText(flid);
        if (communityId == decodedCommunityId) {
            return true;
        } else {
            return false;
        }
    }

    async isResilocProxyBeingUsedByCommunities(id: string): Promise<boolean> {
        let isBeingUsed = false;
        const community = await this.communityModel.find({ [`staticProxies.${id}`]: { $exists: true } }).exec();
        if (community != undefined && community.length != 0) {
            isBeingUsed = true;
        }
        return isBeingUsed;
    }
}