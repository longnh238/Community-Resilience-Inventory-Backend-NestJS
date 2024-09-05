import { Controller, Get, Headers, HttpException, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorator/public.decorator';
import { AuthUser } from '../users/users.decorator';
import { UserRoles } from './decorator/user-roles.decorator';
import { UserRole } from './enum/user-role.enum';
import { UserRolesGuard } from './guards/user-roles.guard';
import { UserRolesService } from './user-roles.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiTags('user-roles')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('user-roles')
export class UserRolesController {
    constructor(private readonly userRolesService: UserRolesService) { }

    @ApiOkResponse({ description: 'OK' })
    @ApiOperation({
        summary: 'Get defined user roles in the inventory',
        description: 'For admin and community admin only'
    })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.CommunityAdmin)
    @Get()
    async findAll() {
        return this.userRolesService.getDefinedRoles().catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK' })
    @ApiOperation({
        summary: 'Get roles of a user by token and flid',
    })
    @ApiHeader({ name: 'flid', description: 'The community id decoded', required: true })
    @Public()
    @Get('myself')
    async getUserRoleByFlid(@Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.userRolesService.getUserRolesByFlid(flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK' })
    @ApiOperation({
        summary: 'Get roles of a user by communities',
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved his roles by communities', required: true })
    @Public()
    @Get(':username')
    async getUserRoles(@Param('username') username: string, @AuthUser() authUser: any) {
        return this.userRolesService.getUserRoles(username, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK' })
    @ApiOperation({
        summary: 'Get roles of a user by a communitiy',
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved his roles by a community', required: true })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01', description: 'The community id of this user', required: true })
    @Public()
    @Get(':username/community/:communityId')
    async getUserRolesByCommunity(@Param('username') username: string, @Param('communityId') communityId: ObjectId, @AuthUser() authUser: any) {
        return this.userRolesService.getUserRolesByCommunity(username, communityId, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }
}