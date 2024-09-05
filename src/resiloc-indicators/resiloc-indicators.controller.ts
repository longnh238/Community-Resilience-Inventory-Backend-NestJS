import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { CreateResilocIndicatorDto, CreateResilocProxiesOfResilocIndicatorDto } from './dto/create-resiloc-indicator.dto';
import { PaginationResilocIndicatorsDto, PaginationResilocIndicatorTagsDto } from './dto/read-resiloc-indicator.dto';
import { UpdateResilocIndicatorDto, UpdateResilocIndicatorStatusDto } from './dto/update-resiloc-indicator.dto';
import { ResilocIndicator } from './entities/resiloc-indicator.entity';
import { ResilocIndicatorTagOrderingOption } from './enum/resiloc-Indicator-ordering-options.enum';
import { ResilocIndicatorStatus } from './enum/resiloc-indicator-status.enum';
import { ResilocIndicatorsService } from './resiloc-indicators.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('resiloc-indicators')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('resiloc-indicators')
export class ResilocIndicatorsController {
     constructor(
          private readonly resilocIndicatorsService: ResilocIndicatorsService,
          private readonly configService: ConfigService
     ) { }

     @ApiCreatedResponse({ description: '{ "message": "Resiloc indicator {name} created/requested successfully" }' })
     @ApiOperation({
          summary: 'Create/Request a resiloc indicator',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @UsePipes(new ValidationPipe())
     @Post()
     async create(@Body() createResilocIndicatorDto: CreateResilocIndicatorDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          const resilocIndicator = await this.resilocIndicatorsService.create(createResilocIndicatorDto, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               if (err.code == this.configService.get<number>('typeorm.unique_validator_error_code')) {
                    const re = new RegExp(this.configService.get('parser.inside_rounded_brackets'));
                    let errors = []
                    errors.push(`${err.detail.match(re)[1]}: ${this.configService.get('typeorm.unique_validator_error_tag')}`)
                    throw new HttpException({
                         statusCode: err.status,
                         message: this.configService.get<string>('typeorm.resiloc_indicator_unique_validator_error_message'),
                         fields: errors
                    }, err.status);
               } else {
                    throw new HttpException({
                         statusCode: err.status,
                         message: err.message
                    }, err.status);
               }
          });
          if (resilocIndicator) {
               return {
                    message: `Resiloc indicator ${resilocIndicator.name} created successfully`,
                    resilocIndicatorId: resilocIndicator._id
               };
          } else {
               throw new BadRequestException(`Resiloc indicator created/requested failed`);
          }
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all resiloc indicators in the inventory',
          description: 'For admin only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @UserRoles(UserRole.Admin)
     @Get()
     async findAll(@Query() { page, limit }) {
          return this.resilocIndicatorsService.findAll(page, limit).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all resiloc indicators that are visible to communities (verified or accepted and not draft) in the inventory',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('visible')
     async getVisibleResilocIndicators(@Query() { page, limit }, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getVisibleResilocIndicators(page, limit, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all resiloc indicators that are visible to communities (verified or accepted and not draft) in the inventory by tag name',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('visible/tag/:tagName')
     async getVisibleResilocProxiesByTag(@Param('tagName') tagName: string, @Query() { page, limit }, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getVisibleResilocIndicatorsByTag(tagName, page, limit, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all verified resiloc indicators in the inventory',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('verified')
     async getVerifiedResilocIndicators(@Query() { page, limit }, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getVerifiedResilocIndicators(page, limit, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all accepted resiloc indicators in the inventory',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('accepted')
     async getAcceptedResilocIndicators(@Query() { page, limit }, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getAcceptedResilocIndicators(page, limit, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all requested resiloc indicators in the inventory',
          description: 'For admin only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @UserRoles(UserRole.Admin)
     @Get('requested')
     async getRequestedResilocIndicators(@Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getRequestedResilocIndicators(page, limit, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get resiloc indicators in the inventory that a community requested',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its requested indicators [OR] "selected" for retrieving selected community', required: true })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiQuery({ name: 'status', description: 'The proxy status to be retrieved (blank | null: get all items)', enum: ResilocIndicatorStatus, isArray: true, required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('community/:communityId')
     async getRequestedResilocIndicatorsByCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit, status }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getRequestedResilocIndicatorsByCommunity(communityId, page, limit, status, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorsDto })
     @ApiOperation({
          summary: 'Get all resiloc indicators in the inventory by tag name',
          description: 'For admin only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @UserRoles(UserRole.Admin)
     @Get('tag/:tagName')
     async getByTag(@Param('tagName') tagName: string, @Query() { page, limit }) {
          return this.resilocIndicatorsService.getByTag(tagName, page, limit).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationResilocIndicatorTagsDto })
     @ApiOperation({
          summary: 'Get all tags of resiloc indicators in the inventory (return tags from non-draft and verified/accepted resiloc indicators in terms of local managers/resilience experts)',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiQuery({ name: 'orderBy', description: 'Order by options', enum: ResilocIndicatorTagOrderingOption, required: false })
     @ApiQuery({ name: 'arrange', description: 'Arrange options', enum: ArrangingOption, required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('tags')
     async getAllTags(@Query() { page, limit, orderBy, arrange }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getAllTags(page, limit, orderBy, arrange, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: ResilocIndicator })
     @ApiOperation({
          summary: 'Get information of a resiloc indicator',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc indicator to be retrieved', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get(':id')
     async getResilocIndicator(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.resilocIndicatorsService.getResilocIndicator(id, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc indicator {name} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc indicator id {id} does not exist' })
     @ApiOperation({
          summary: 'Update resiloc indicator information',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc indicator to be updated', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @UsePipes(new ValidationPipe())
     @Put(':id')
     async update(@Param('id') id: string, @Body() updateResilocIndicatorDto: UpdateResilocIndicatorDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          const resilocIndicator = await this.resilocIndicatorsService.update(id, updateResilocIndicatorDto, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (resilocIndicator) {
               return { message: `Resiloc indicator ${resilocIndicator.name} updated successfully` };
          } else {
               throw new BadRequestException(`Resiloc indicator ${id} updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc indicator {name} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc indicator id {id} does not exist' })
     @ApiOperation({
          summary: 'Update status (verified, accepted, or requested) of a resiloc indicator',
          description: 'For admin only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc indicator to be updated its status', required: true })
     @UserRoles(UserRole.Admin)
     @UsePipes(new ValidationPipe())
     @Put('status/:id')
     async updateResilocIndicatorStatus(@Param('id') id: string, @Body() updateResilocIndicatorStatusDto: UpdateResilocIndicatorStatusDto) {
          const resilocIndicator = await this.resilocIndicatorsService.updateResilocIndicatorStatus(id, updateResilocIndicatorStatusDto).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (resilocIndicator) {
               return { message: `Resiloc indicator ${resilocIndicator.name} updated successfully` };
          } else {
               throw new BadRequestException(`Resiloc indicator ${id} updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc indicator {name} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc indicator id {id} does not exist' })
     @ApiOperation({
          summary: 'Associate resiloc proxies to a resiloc indicator',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc indicator to be assigned its resiloc proxies', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @ApiBody({ type: CreateResilocProxiesOfResilocIndicatorDto })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @UsePipes(new ValidationPipe())
     @Put('resiloc-proxies/:id')
     async assignResilocProxiesForResilocIndicator(@Param('id') id: string, @Body() createResilocProxyOfResilocIndicatorDto: CreateResilocProxiesOfResilocIndicatorDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          const resilocIndicator = await this.resilocIndicatorsService.assignResilocProxiesForResilocIndicator(id, createResilocProxyOfResilocIndicatorDto, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (resilocIndicator) {
               return { message: `Resiloc indicator ${resilocIndicator.name} updated successfully` };
          } else {
               throw new BadRequestException(`Resiloc indicator ${id} updated failed`);
          }
     }

     @ApiOkResponse({ description: '{ "message": "Resiloc indicator {id} removed successfully" }' })
     @ApiNotFoundResponse({ description: 'Resiloc indicator id {id} does not exist' })
     @ApiOperation({
          summary: 'Delete a resiloc indicator',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a resiloc proxy to be removed', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Delete(':id')
     async remove(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          const res = await this.resilocIndicatorsService.remove(id, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
          if (res && res.affected > 0) {
               return { message: `Resiloc indicator ${id} removed successfully` };
          } else {
               throw new BadRequestException(`Resiloc proxy ${id} removed failed`);
          }
     }
}
