import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Get, Headers, HttpException, HttpStatus, Param, Put, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, PublicWithFlid } from '../common/decorator/public.decorator';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { PaginationScenariosDto, ReadScenarioIdsOfUserByCommunitiesDto, ReadScenariosOfUserByCommunitiesDto } from './dto/read-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { Scenario } from './entities/scenario.entity';
import { ScenariosService } from './scenarios.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('scenarios')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('scenarios')
export class ScenariosController {
     constructor(
          private readonly scenariosService: ScenariosService,
          private readonly configService: ConfigService
     ) { };

     @ApiOkResponse({ description: 'OK', type: PaginationScenariosDto })
     @ApiOperation({
          summary: 'Get all community scenarios in the inventory',
          description: 'For admin only'
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @UserRoles(UserRole.Admin)
     @Get()
     async findAll(@Query() { page, limit }) {
          return this.scenariosService.findAll(page, limit).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: Scenario })
     @ApiOperation({
          summary: 'Get information of a community scenario',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a community scenario to be retrieved', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get(':id')
     async getScenario(@Param('id') id: string, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.scenariosService.getScenario(id, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: [ReadScenarioIdsOfUserByCommunitiesDto] })
     @ApiOperation({
          summary: 'Get community scenarios that are visible to a user by his/her communities'
     })
     @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
     @Public()
     @Get('user/:username')
     async getScenarioIdsOfUserByCommunities(@Param('username') username: string, @AuthUser() authUser: any) {
          return this.scenariosService.getScenarioIdsOfUserByCommunities(username, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: [ReadScenariosOfUserByCommunitiesDto] })
     @ApiOperation({
          summary: 'Get community scenarios that are visible to a user by his/her communities with populated referenced information'
     })
     @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
     @Public()
     @Get('user/detail/:username')
     async getScenariosOfUserByCommunities(@Param('username') username: string, @AuthUser() authUser: any) {
          return this.scenariosService.getScenariosOfUserByCommunities(username, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationScenariosDto })
     @ApiOperation({
          summary: 'Get community scenarios of a community',
          description: 'For all users'
     })
     @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its community scenarios [OR] "selected" for retrieving selected community', required: true })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @PublicWithFlid()
     @Get('community/:communityId')
     async getScenariosOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.scenariosService.getScenariosOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationScenariosDto })
     @ApiOperation({
          summary: 'Get on-hold scenarios of a community',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its on-hold scenarios [OR] "selected" for retrieving selected community', required: true })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('onhold/community/:communityId')
     async getOnHoldScenariosOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.scenariosService.getOnHoldScenariosOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: 'OK', type: PaginationScenariosDto })
     @ApiOperation({
          summary: 'Get submitted scenarios of a community',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its submitted scenarios [OR] "selected" for retrieving selected community', required: true })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @Get('submitted/community/:communityId')
     async getSubmittedScenariosOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          return this.scenariosService.getSubmittedScenariosOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }

     @ApiOkResponse({ description: '{ "message": "Community scenario {id} updated successfully" }' })
     @ApiNotFoundResponse({ description: 'Community scenario id {id} does not exist' })
     @ApiOperation({
          summary: 'Update resiloc scenario information',
          description: 'For admin, local manager, and resilience expert only'
     })
     @ApiParam({ name: 'id', type: String, example: '6e4b5c4c-bbef-49ba-8d0f-17d7fdb08fb7', description: 'The id of a community scenario to be updated', required: true })
     @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
     @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
     @UsePipes(new ValidationPipe())
     @Put(':id')
     async update(@Param('id') id: string, @Body() updateScenarioDto: UpdateScenarioDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
          const scenario = await this.scenariosService.update(id, updateScenarioDto, flid, authUser).catch(err => {
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
          if (scenario) {
               return { message: `Community scenario ${scenario._id} updated successfully` };
          } else {
               throw new BadRequestException(`Community scenario ${id} updated failed`);
          }
     }
}
