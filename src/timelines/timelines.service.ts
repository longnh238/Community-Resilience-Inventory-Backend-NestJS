import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { SnapshotVisibility } from '../snapshots/enum/snapshot-visibility.enum';
import { Snapshot } from '../snapshots/schemas/snapshot.schema';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UsersService } from '../users/users.service';
import { PaginationDefaultTimelineDto, PaginationMetaDataTimelinesDto } from './dto/read-timeline.dto';
import { Timeline } from './schemas/timeline.schema';

@Injectable()
export class TimelinesService {
    constructor(
        @InjectModel(Timeline.name) private timelineModel: Model<Timeline>,
        @InjectModel(Snapshot.name) private snapshotModel: Model<Snapshot>,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
        @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
        private readonly configService: ConfigService,
        private readonly helpersService: HelpersService
    ) { }

    async getDefaultTimelineOfCommunity(communityId: ObjectId | any, page: number, limit: number, flid: string, authUser: any): Promise<PaginationDefaultTimelineDto> {
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

            const snapshots = await this.communitiesService.getSubmittedAndNotDraftSnapshotsOfCommunity(communityId);
            const snapshotIds = snapshots.map(snapshot => {
                let flag = false;
                if (isCommunityLevel) {
                    if (snapshot.visibility == SnapshotVisibility.Public
                        || snapshot.visibility == SnapshotVisibility.Community) {
                        flag = true;
                    }
                } else {
                    flag = true;
                }
                if (flag) {
                    return snapshot._id;
                }
            });

            const query1 = this.snapshotModel.find({ _id: { $in: snapshotIds } })
            const totalItems = await query1.countDocuments();

            limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

            const query2 = this.snapshotModel.find({ _id: { $in: snapshotIds } }).select('_id name type dateSubmitted visibility').sort({ _id: 1 })
            const items = await query2.skip((page - 1) * limit).limit(limit).exec();

            let totalPage = Math.ceil(totalItems / limit);
            if (isNaN(totalPage)) totalPage = 0;

            let paginationDefaultTimelineDto = new PaginationDefaultTimelineDto();
            paginationDefaultTimelineDto.metadata = new PaginationMetaDataTimelinesDto();

            paginationDefaultTimelineDto.items = items;
            paginationDefaultTimelineDto.metadata.currentPage = page;
            paginationDefaultTimelineDto.metadata.totalPages = totalPage;
            paginationDefaultTimelineDto.metadata.itemsPerPage = limit;
            paginationDefaultTimelineDto.metadata.totalItems = totalItems;

            return paginationDefaultTimelineDto;
        }
    }
}
