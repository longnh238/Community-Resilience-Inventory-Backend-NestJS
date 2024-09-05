import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enum/user-role.enum';
import { USER_ROLES_KEY } from '../decorator/user-roles.decorator';
import { UsersService } from '../../users/users.service';
import { ObjectID } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { HelpersService } from 'src/helpers/helpers.service';
import { UserRolesService } from '../user-roles.service';
import { ResilocServiceRole } from 'src/user-roles/enum/resiloc-service-role.enum';
import { RESILOC_SERVICE_ROLES_KEY } from '../decorator/resiloc-service-roles.decorator';

@Injectable()
export class UserRolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly usersService: UsersService,
        private readonly userRolesService: UserRolesService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly helpersService: HelpersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            return false;
        }

        // Public does not require flid
        const isPublic = this.reflector.get<boolean>(
            'isPublic',
            context.getHandler()
        );
        if (isPublic) {
            return true;
        }

        const requiredResilocServiceRoles = this.reflector.getAllAndOverride<ResilocServiceRole[]>(RESILOC_SERVICE_ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (requiredResilocServiceRoles) {
            const resilocServiceRole = await this.userRolesService.getResilocServiceRole(user.username);
            if (requiredResilocServiceRoles.includes(resilocServiceRole)) {
                return true;
            }
        }

        let requiredUserRoles;
        const isPublicWithFlid = this.reflector.get<boolean>(
            'isPublicWithFlid',
            context.getHandler()
        );
        if (isPublicWithFlid) {
            requiredUserRoles = Object.values(UserRole);
        } else {
            requiredUserRoles = this.reflector.getAllAndOverride<UserRole[]>(USER_ROLES_KEY, [
                context.getHandler(),
                context.getClass()
            ]);
            if (!requiredUserRoles) {
                return false;
            }
        }

        const jwtToken = request.headers['authorization'].split(" ")[1];
        if (await this.redisService.get(jwtToken)) {
            throw new UnauthorizedException();
        }

        let userRoles = [];
        if (await this.usersService.isAdmin(user.username)) {
            userRoles = [UserRole.Admin];
        } else {
            // For a controller that allows admin only 
            if (requiredUserRoles.length == 1 && requiredUserRoles[0] == UserRole.Admin) {
                return false;
            }

            // Put selected community id in header
            const flid = request.headers[this.configService.get<string>('communityHeaderId')];
            if (!flid) {
                throw new UnauthorizedException('Missing flid value');
            }

            else {
                const communityId = await this.helpersService.decipherText(flid);
                if (ObjectID.isValid(communityId)) {
                    userRoles = <UserRole[]>await this.usersService.getUserRolesByCommunity(user.username, communityId);
                } else {
                    throw new BadRequestException(`flid value is not valid`);
                }
            }
        }

        return requiredUserRoles.some((userRole) => userRoles?.includes(userRole));
    }
}
