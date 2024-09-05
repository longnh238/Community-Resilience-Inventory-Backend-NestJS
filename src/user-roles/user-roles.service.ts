import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { ObjectID } from 'mongodb';
import { UserRolesByCommunitiesDto } from './dto/read-user-role.dto';
import { UserRole } from './enum/user-role.enum';
import { UsersService } from '../users/users.service';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { ResilocServiceRole } from './enum/resiloc-service-role.enum';

@Injectable()
export class UserRolesService {
    constructor(
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
        private readonly helpersService: HelpersService
    ) { }

    async getDefinedRoles(): Promise<UserRole[]> {
        return Object.values(UserRole);
    }

    async getUserRolesByFlid(flid: string, authUser: any): Promise<UserRole[]> {
        if (await this.usersService.isAdmin(authUser.username)) {
            return [UserRole.Admin];
        } else {
            const myDecipher = await this.helpersService.decipher();
            const communityId = myDecipher(flid);
            if (ObjectID.isValid(communityId)) {
                return await this.usersService.getUserRolesByCommunity(authUser.username, communityId);
            } else {
                throw new BadRequestException(`Flid value is not valid`);
            }
        }
    }

    async getUserRoles(username: string, authUser: any): Promise<UserRolesByCommunitiesDto[] | [UserRole]> {
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            if (await this.usersService.isAdmin(username)) {
                return [UserRole.Admin];
            } else {
                const userRoles = (await this.usersService.findOne(username))?.userRoles;
                let res = [];
                for (let [key, value] of userRoles) {
                    const community = await this.communitiesService.findOne(key);

                    let userRolesByCommunitiesDto = new UserRolesByCommunitiesDto();
                    userRolesByCommunitiesDto._id = community._id;
                    userRolesByCommunitiesDto.name = community.name;
                    userRolesByCommunitiesDto.userRoles = value;

                    res.push(userRolesByCommunitiesDto);
                }
                return res;
            }
        }
    }

    async getUserRolesByCommunity(username: string, communityId: ObjectId, authUser: any): Promise<UserRole[]> {
        let allowed = false;
        if (await this.usersService.isAdmin(authUser.username)) {
            allowed = true;
        } else if (await this.usersService.isMatchingToken(username, authUser)) {
            allowed = true;
        } else {
            throw new ForbiddenException('Forbidden resource');
        }

        if (allowed) {
            const user = await this.usersService.findOne(username);
            const userRolesByCommunities = user.userRoles;
            for (let [key, value] of userRolesByCommunities) {
                if (key == communityId) {
                    return value;
                }
            }
        }
    }

    async getResilocServiceRole(username: string): Promise<ResilocServiceRole> {
        const user = await this.usersService.findOne(username);
        if (user) {
            return user.resilocServiceRole;
        }
    }
}
