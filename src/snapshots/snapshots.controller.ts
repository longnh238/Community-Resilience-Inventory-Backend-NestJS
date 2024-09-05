import { Body, Controller, HttpException, Post, UseGuards, UsePipes, ValidationPipe, Get, Param, Headers, Put, Delete, BadRequestException, Query, HttpStatus } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, PublicWithFlid } from '../common/decorator/public.decorator';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { CreateSnapshotDto, CreateStaticProxyOfSnapshotDto } from './dto/create-snapshot.dto';
import { DeleteStaticProxiesFromSnapshotDto } from './dto/delete-snapshot.dto';
import { PaginationSnapshotsDto, ReadSnapshotIdsOfUserByCommunitiesDto, ReadSnapshotsOfUserByCommunitiesDto } from './dto/read-snapshot.dto';
import { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import { Snapshot } from './schemas/snapshot.schema';
import { SnapshotsService } from './snapshots.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('snapshots')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('snapshots')
export class SnapshotsController {
    constructor(private readonly snapshotsService: SnapshotsService) { }

    @ApiCreatedResponse({ description: '{ "message": "Snapshot {name} created successfully" }' })
    @ApiNotFoundResponse({ description: 'Community {id} does not exist' })
    @ApiOperation({
        summary: 'Create a snapshot for a community',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be created its snapshot [OR] "selected" for retrieving selected community', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Post('community/:communityId')
    async create(@Param('communityId') communityId: ObjectId | any, @Body() createSnapshotDto: CreateSnapshotDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const snapshot = await this.snapshotsService.create(communityId, createSnapshotDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (snapshot) {
            return {
                message: `Snapshot ${snapshot.name} created successfully`,
                snapshotId: snapshot._id
            };
        } else {
            throw new BadRequestException(`Snapshot created failed`);
        }
    }

    @ApiOkResponse({ description: 'OK', type: PaginationSnapshotsDto })
    @ApiOperation({
        summary: 'Get all snapshots in the inventory',
        description: 'For admin only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @UserRoles(UserRole.Admin)
    @Get()
    async findAll(@Query() { page, limit }) {
        return this.snapshotsService.findAll(page, limit).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: Snapshot })
    @ApiOperation({
        summary: 'Get information of a snapshot',
        description: 'For admin, local manager, and resilience expert only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be retrieved', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
    @Get(':id')
    async getSnapshot(@Param('id') id: ObjectId, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getSnapshot(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: [ReadSnapshotIdsOfUserByCommunitiesDto] })
    @ApiOperation({
        summary: 'Get snapshot ids that are visible to a user by his/her communities'
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
    @Public()
    @Get('user/:username')
    async getSnapshotIdsOfUserByCommunity(@Param('username') username: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getSnapshotIdsOfUserByCommunities(username, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: [ReadSnapshotsOfUserByCommunitiesDto] })
    @ApiOperation({
        summary: 'Get snapshots that are visible to a user by his/her communities with populated referenced information'
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
    @Public()
    @Get('user/detail/:username')
    async getSnapshotsOfUserByCommunities(@Param('username') username: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getSnapshotsOfUserByCommunities(username, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationSnapshotsDto })
    @ApiOperation({
        summary: 'Get snapshots of a community',
        description: 'For all users'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its snapshots [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @PublicWithFlid()
    @Get('community/:communityId')
    async getSnapshotsOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getSnapshotsOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationSnapshotsDto })
    @ApiOperation({
        summary: 'Get on-hold snapshots of a community',
        description: 'For admin, local manager, and resilience expert only'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its on-hold snapshots [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
    @Get('onhold/community/:communityId')
    async getOnHoldSnapshotsOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getOnHoldSnapshotsOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationSnapshotsDto })
    @ApiOperation({
        summary: 'Get submitted snapshots of a community',
        description: 'For admin, local manager, and resilience expert only'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its submitted snapshots [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
    @Get('submitted/community/:communityId')
    async getSubmittedSnapshotsOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.snapshotsService.getSubmittedSnapshotsOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: '{ "message": "Snapshot {name} updated successfully" }' })
    @ApiNotFoundResponse({ description: 'Snapshot id {id} does not exist' })
    @ApiOperation({
        summary: 'Update snapshot information',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be updated', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Put(':id')
    async update(@Param('id') id: ObjectId, @Body() updateSnapshotDto: UpdateSnapshotDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const snapshot = await this.snapshotsService.update(id, updateSnapshotDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (snapshot) {
            return { message: `Snapshot ${snapshot.name} updated successfully` };
        } else {
            throw new BadRequestException(`Snapshot ${id} updated failed`);
        }
    }

    @ApiOkResponse({ description: '{ "message": "Snapshot {name} updated successfully" }' })
    @ApiNotFoundResponse({ description: 'Snapshot id {id} does not exist' })
    @ApiOperation({
        summary: 'Add new community static proxies to a created snapshot',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be assigned its static proxies', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @ApiBody({ type: [CreateStaticProxyOfSnapshotDto] })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Put('static-proxies/:id')
    async assignStaticProxiesForSnapshot(@Param('id') id: ObjectId, @Body() createStaticProxyValueDto: CreateStaticProxyOfSnapshotDto[], @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const snapshot = await this.snapshotsService.assignStaticProxiesForSnapshot(id, createStaticProxyValueDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (snapshot) {
            return { message: `Snapshot ${snapshot.name} updated successfully` };
        } else {
            throw new BadRequestException(`Snapshot ${id} updated failed`);
        }
    }

    @ApiOkResponse({ description: '{ "message": "Snapshot {name} submitted successfully" }' })
    @ApiNotFoundResponse({ description: 'Snapshot id {id} does not exist' })
    @ApiOperation({
        summary: 'Submit a snapshot',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be submitted', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Put('submit/:id')
    async submitSnapshot(@Param('id') id: ObjectId, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const snapshot = await this.snapshotsService.submitSnapshot(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (snapshot) {
            return { message: `Snapshot ${snapshot.name} submitted successfully` };
        } else {
            throw new BadRequestException(`Snapshot ${id} submitted failed`);
        }
    }

    @ApiOkResponse({ description: 'Snapshot {id} removed successfully' })
    @ApiNotFoundResponse({ description: 'Snapshot id {id} does not exist' })
    @ApiOperation({
        summary: 'Delete a snapshot',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be removed', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Delete(':id')
    async remove(@Param('id') id: ObjectId, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const res = await this.snapshotsService.remove(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (res && res.deletedCount > 0) {
            return { message: `Snapshot ${id} removed successfully` };
        } else {
            throw new BadRequestException(`Snapshot ${id} removed failed`);
        }
    }

    @ApiOkResponse({ description: '{ "message": "Snapshot {id} updated successfully" }' })
    @ApiNotFoundResponse({ description: 'Snapshot id {id} does not exist' })
    @ApiOperation({
        summary: 'Remove community static proxies from a created snapshot',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be removed its static proxies', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Put('delete/static-proxies/:id')
    async removeStaticProxiesFromSnapshot(@Param('id') id: ObjectId, @Body() deleteStaticProxiesFromSnapshotDto: DeleteStaticProxiesFromSnapshotDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        await this.snapshotsService.removeStaticProxiesFromSnapshot(id, deleteStaticProxiesFromSnapshotDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        return { message: `Snapshot ${id} updated successfully` };
    }
}

