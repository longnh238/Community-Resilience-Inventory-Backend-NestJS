import { BadRequestException, Body, Controller, Get, Headers, HttpException, HttpStatus, Param, Put, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, PublicWithFlid } from '../common/decorator/public.decorator';
import { ValidationPipe } from '../common/pipe/validation.pipe';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { PaginationStaticProxiesDto, ReadStaticProxiesOfUserByCommunitiesDto, ReadStaticProxyIdsOfUserByCommunitiesDto } from './dto/read-static-proxy.dto';
import { UpdateStaticProxyOfCommunityDto } from './dto/update-static-proxy.dto';
import { StaticProxy } from './entities/static-proxy.entity';
import { StaticProxiesService } from './static-proxies.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('static-proxies')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('static-proxies')
export class StaticProxiesController {
    constructor(
        private readonly staticProxiesService: StaticProxiesService
    ) { };

    @ApiOkResponse({ description: 'OK', type: PaginationStaticProxiesDto })
    @ApiOperation({
        summary: 'Get all community static proxies in the inventory',
        description: 'For admin only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @UserRoles(UserRole.Admin)
    @Get()
    async findAll(@Query() { page, limit }) {
        return this.staticProxiesService.findAll(page, limit).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: StaticProxy })
    @ApiOperation({
        summary: 'Get information of a community static proxy',
        description: 'For admin, local manager, and resilience expert only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a community static proxy to be retrieved', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
    @Get(':id')
    async getStaticProxy(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.staticProxiesService.getStaticProxy(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: [ReadStaticProxyIdsOfUserByCommunitiesDto] })
    @ApiOperation({
        summary: 'Get community static proxies that are visible to a user by his/her communities'
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
    @Public()
    @Get('user/:username')
    async getStaticProxyIdsOfUserByCommunities(@Param('username') username: string, @AuthUser() authUser: any) {
        return this.staticProxiesService.getStaticProxyIdsOfUserByCommunities(username, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: [ReadStaticProxiesOfUserByCommunitiesDto] })
    @ApiOperation({
        summary: 'Get community static proxies that are visible to a user by his/her communities with populated referenced information'
    })
    @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
    @Public()
    @Get('user/detail/:username')
    async getStaticProxiesOfUserByCommunities(@Param('username') username: string, @AuthUser() authUser: any) {
        return this.staticProxiesService.getStaticProxiesOfUserByCommunities(username, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationStaticProxiesDto })
    @ApiOperation({
        summary: 'Get community static proxies of a community',
        description: 'For all users'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its community static proxies [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @PublicWithFlid()
    @Get('community/:communityId')
    async getStaticProxiesOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.staticProxiesService.getStaticProxiesOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationStaticProxiesDto })
    @ApiOperation({
        summary: 'Get community static proxies of a snapshot',
        description: 'For admin, local manager, and resilience expert only'
    })
    @ApiParam({ name: 'snaphotId', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a snapshot to be retrieved its community static proxies', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
    @Get('snapshot/:snaphotId')
    async getStaticProxiesOfSnapshot(@Param('snaphotId') snaphotId: ObjectId, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.staticProxiesService.getStaticProxiesOfSnapshot(snaphotId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'Static proxy {id} updated successfully' })
    @ApiNotFoundResponse({ description: 'Static proxy {id} does not exist' })
    @ApiOperation({
        summary: 'Update visibility, min target, max target and descriptive metadata for a selected static proxy',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a static proxy to be updated', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Put('metadata/:id')
    async updateStaticProxyOfCommunity(@Param('id') id: string, @Body() updateStaticProxyOfCommunityDto: UpdateStaticProxyOfCommunityDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const staticProxy = await this.staticProxiesService.updateStaticProxyOfCommunity(id, updateStaticProxyOfCommunityDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (staticProxy) {
            return { message: `Static proxy ${id} updated successfully` };
        } else {
            throw new BadRequestException(`Static proxy ${id} updated failed`);
        }
    }

    // --------------------------------------------------------------------------------------------------
    @UserRoles(UserRole.Admin)
    // @Put('migration/cloneFromPeriodOfReferencyToPeriodOfReference')
    async cloneFromPeriodOfReferencyToPeriodOfReference() {
        return await this.staticProxiesService.cloneFromPeriodOfReferencyToPeriodOfReference();
    }
}

