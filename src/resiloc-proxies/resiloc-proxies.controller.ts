import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { CreateResilocProxyDto } from './dto/create-resiloc-proxy.dto';
import { PaginationResilocProxiesDto, PaginationResilocProxiyTagsDto } from './dto/read-resiloc-proxy.dto';
import { UpdateResilocProxyDto, UpdateResilocProxyStatusDto } from './dto/update-resiloc-proxy.dto';
import { ResilocProxy } from './entities/resiloc-proxy.entity';
import { ResilocProxyTagOrderingOption } from './enum/resiloc-proxy-ordering-options.enum';
import { ResilocProxyStatus } from './enum/resiloc-proxy-status.enum';
import { ResilocProxiesService } from './resiloc-proxies.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('resiloc-proxies')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('resiloc-proxies')
export class ResilocProxiesController {
    constructor(
        private readonly resilocProxiesService: ResilocProxiesService,
        private readonly configService: ConfigService
    ) { };

    @ApiCreatedResponse({ description: '{ "message": "Resiloc proxy {name} is created/requested successfully" }' })
    @ApiOperation({
        summary: 'Create/Request a resiloc proxy',
        description: 'For admin and local manager only'
    })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @UsePipes(new ValidationPipe())
    @Post()
    async create(@Body() createResilocProxyDto: CreateResilocProxyDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const resilocProxy = await this.resilocProxiesService.create(createResilocProxyDto, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            if (err.code == this.configService.get<number>('typeorm.unique_validator_error_code')) {
                const re = new RegExp(this.configService.get('parser.inside_rounded_brackets'));
                let errors = []
                errors.push(`${err.detail.match(re)[1]}: ${this.configService.get('typeorm.unique_validator_error_tag')}`)
                throw new HttpException({
                    statusCode: err.status,
                    message: this.configService.get<string>('typeorm.resiloc_proxy_unique_validator_error_message'),
                    fields: errors
                }, err.status);
            } else {
                throw new HttpException({
                    statusCode: err.status,
                    message: err.message
                }, err.status);
            }
        });
        if (resilocProxy) {
            return { message: `Resiloc proxy ${resilocProxy.name} created/requested successfully` };
        } else {
            throw new BadRequestException(`Resiloc proxy is created/requested failed`);
        }
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all resiloc proxies in the inventory',
        description: 'For admin only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @UserRoles(UserRole.Admin)
    @Get()
    async findAll(@Query() { page, limit }) {
        return this.resilocProxiesService.findAll(page, limit).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all resiloc proxies that are visible to communities (verified or accepted and not draft) in the inventory',
        description: 'For admin and local manager only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('visible')
    async getVisibleResilocProxies(@Query() { page, limit }, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getVisibleResilocProxies(page, limit, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all resiloc proxies that are visible to communities (verified or accepted and not draft) in the inventory by tag name',
        description: 'For admin and local manager only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('visible/tag/:tagName')
    async getVisibleResilocProxiesByTag(@Param('tagName') tagName: string, @Query() { page, limit }, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getVisibleResilocProxiesByTag(tagName, page, limit, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all verified resiloc proxies in the inventory',
        description: 'For admin and local manager only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('verified')
    async getVerifiedResilocProxies(@Query() { page, limit }, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getVerifiedResilocProxies(page, limit, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all accepted resiloc proxies in the inventory',
        description: 'For admin and local manager only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('accepted')
    async getAcceptedResilocProxies(@Query() { page, limit }, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getAcceptedResilocProxies(page, limit, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all requested resiloc proxies in the inventory',
        description: 'For admin only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @UserRoles(UserRole.Admin)
    @Get('requested')
    async getRequestedResilocProxies(@Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getRequestedResilocProxies(page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get resiloc proxies in the inventory that a community requested',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its requested proxies [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiQuery({ name: 'status', description: 'The proxy status to be retrieved (blank | null: get all items)', enum: ResilocProxyStatus, isArray: true, required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('community/:communityId')
    async getRequestedResilocProxiesByCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit, status }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getRequestedResilocProxiesByCommunity(communityId, page, limit, status, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
    @ApiOperation({
        summary: 'Get all resiloc proxies in the inventory by tag name',
        description: 'For admin only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @UserRoles(UserRole.Admin)
    @Get('tag/:tagName')
    async getByTag(@Param('tagName') tagName: string, @Query() { page, limit }) {
        return this.resilocProxiesService.getByTag(tagName, page, limit).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiyTagsDto })
    @ApiOperation({
        summary: 'Get all tags of resiloc proxies in the inventory (return tags from non-draft and verified/accepted resiloc proxies in terms of local managers)',
        description: 'For admin and local manager only'
    })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiQuery({ name: 'orderBy', description: 'Order by options', enum: ResilocProxyTagOrderingOption, required: false })
    @ApiQuery({ name: 'arrange', description: 'Arrange options', enum: ArrangingOption, required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get('tags')
    async getAllTags(@Query() { page, limit, orderBy, arrange }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getAllTags(page, limit, orderBy, arrange, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: 'OK', type: ResilocProxy })
    @ApiOperation({
        summary: 'Get information of a resiloc proxy',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc proxy to be retrieved', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Get(':id')
    async getResilocProxy(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.resilocProxiesService.getResilocProxy(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @ApiOkResponse({ description: '{ "message": "resiloc proxy {name} updated successfully" }' })
    @ApiNotFoundResponse({ description: 'Resiloc proxy id {id} does not exist' })
    @ApiOperation({
        summary: 'Update resiloc proxy information',
        description: 'For admin only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc proxy to be updated', required: true })
    @UserRoles(UserRole.Admin)
    @UsePipes(new ValidationPipe())
    @Put(':id')
    async update(@Param('id') id: string, @Body() updateResilocProxyDto: UpdateResilocProxyDto) {
        const resilocProxy = await this.resilocProxiesService.update(id, updateResilocProxyDto).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            if (err.code == this.configService.get<number>('typeorm.unique_validator_error_code')) {
                const re = new RegExp(this.configService.get('parser.inside_rounded_brackets'));
                let errors = []
                errors.push(`${err.detail.match(re)[1]}: ${this.configService.get('typeorm.unique_validator_error_tag')}`)
                throw new HttpException({
                    statusCode: err.status,
                    message: this.configService.get<string>('typeorm.resiloc_proxy_unique_validator_error_message'),
                    fields: errors
                }, err.status);
            } else {
                throw new HttpException({
                    statusCode: err.status,
                    message: err.message
                }, err.status);
            }
        });
        if (resilocProxy) {
            return { message: `Resiloc proxy ${resilocProxy.name} updated successfully` };
        } else {
            throw new BadRequestException(`Resiloc proxy ${id} updated failed`);
        }
    }

    @ApiOkResponse({ description: '{ "message": "Resiloc proxy {name} updated successfully" }' })
    @ApiNotFoundResponse({ description: 'Resiloc proxy id {id} does not exist' })
    @ApiOperation({
        summary: 'Update status (verified, accepted, or requested) of a resiloc proxy',
        description: 'For admin only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc proxy to be updated its status', required: true })
    @UserRoles(UserRole.Admin)
    @UsePipes(new ValidationPipe())
    @Put('status/:id')
    async updateResilocProxyStatus(@Param('id') id: string, @Body() updateResilocProxyStatusDto: UpdateResilocProxyStatusDto) {
        const resilocProxy = await this.resilocProxiesService.updateResilocProxyStatus(id, updateResilocProxyStatusDto).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (resilocProxy) {
            return { message: `Resiloc proxy ${resilocProxy.name} updated successfully` };
        } else {
            throw new BadRequestException(`Resiloc proxy ${id} updated failed`);
        }
    }

    @ApiOkResponse({ description: '{ "message": "Resiloc proxy {id} removed successfully" }' })
    @ApiNotFoundResponse({ description: 'Resiloc proxy id {id} does not exist' })
    @ApiOperation({
        summary: 'Delete a resiloc proxy',
        description: 'For admin and local manager only'
    })
    @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc proxy to be removed', required: true })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @UserRoles(UserRole.Admin, UserRole.LocalManager)
    @Delete(':id')
    async remove(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        const res = await this.resilocProxiesService.remove(id, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
        if (res && res.affected > 0) {
            return { message: `Resiloc proxy ${id} removed successfully` };
        } else {
            throw new BadRequestException(`Resiloc proxy ${id} removed failed`);
        }
    }

    // --------------------------------------------------------------------------------------------------
    @UserRoles(UserRole.Admin)
    // @Put('migration/createMetadataForExistingResilocProxies')
    async createMetadataForExistingResilocProxies() {
        return await this.resilocProxiesService.createMetadataForExistingResilocProxies();
    }
}
