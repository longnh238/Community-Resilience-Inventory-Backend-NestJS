import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, PublicWithFlid } from '../common/decorator/public.decorator';
import { ValidationPipe } from '../common/pipe/validation.pipe';
import { PaginationResilocProxiesDto } from '../resiloc-proxies/dto/read-resiloc-proxy.dto';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { PaginationCommunitiesDto, PaginationFollowedCommunitiesDto, PaginationUsersOfCommunityDto } from './dto/read-community.dto';
import { CommunityScenariosDto, CommunityStaticProxiesDto, PointersToOtherCommunitiesDto, UpdateCommunityDto, UserOfCommunityDto } from './dto/update-community.dto';
import { Community } from './schemas/community.schema';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('communities')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('communities')
export class CommunitiesController {
  constructor(
    private readonly communitiesService: CommunitiesService,
    private readonly configService: ConfigService
  ) { };

  @ApiCreatedResponse({ description: '{ "message": "Community {name} created successfully" }' })
  @ApiOperation({
    summary: 'Create a community',
    description: 'For admin only'
  })
  @UserRoles(UserRole.Admin)
  @UsePipes(new ValidationPipe())
  @Post()
  async create(@Body() createCommunityDto: CreateCommunityDto) {
    const community = await this.communitiesService.create(createCommunityDto).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      if (err._message == this.configService.get<string>('mongoose.community_unique_validator_error_message')) {
        const errors = err.message.replace(this.configService.get<string>('mongoose.community_unique_validator_error_message') + ': ', '').split(', ');
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err._message,
          fields: errors
        }, err.status);
      } else if (err.code == this.configService.get<number>('mongoose.unique_validator_error_code')) {
        const re = new RegExp(this.configService.get('parser.inside_curly_brackets'));
        let errors = [];
        errors.push(err.message.match(re)[1].trim().split(':')[0]
          + ': '
          + this.configService.get<string>('mongoose.unique_validator_error_tag'));
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: this.configService.get<string>('mongoose.community_unique_validator_error_message'),
          fields: errors
        }, err.status);
      } else {
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err.message,
        }, err.status);
      }
    });
    if (community) {
      return { message: `Community ${community.name} created successfully` };
    } else {
      throw new BadRequestException(`Community created failed`);
    }
  }

  @ApiOkResponse({ description: 'OK', type: PaginationCommunitiesDto })
  @ApiOperation({
    summary: 'Get all communities in the inventory',
    description: 'For admin only'
  })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @UserRoles(UserRole.Admin)
  @Get()
  async findAll(@Query() { page, limit }) {
    return this.communitiesService.findAll(page, limit).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: PaginationCommunitiesDto })
  @ApiOperation({
    summary: 'Get all communities in the inventory with populated referenced information',
    description: 'For admin only'
  })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @UserRoles(UserRole.Admin)
  @Get('detail')
  async findAllWithDetail(@Query() { page, limit }) {
    return this.communitiesService.findAllWithDetail(page, limit).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: PaginationCommunitiesDto })
  @ApiOperation({
    summary: 'Get available communities for user to follow',
  })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @Public()
  @Get('follow/:username')
  async getCommunitiesToFollow(@Param('username') username: string, @Query() { page, limit }, @AuthUser() authUser: any) {
    return this.communitiesService.getCommunitiesToFollow(username, page, limit, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: PaginationFollowedCommunitiesDto })
  @ApiOperation({
    summary: 'Get followed communities of a user',
  })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @Public()
  @Get('followed/:username')
  async getFollowedCommunities(@Param('username') username: string, @Query() { page, limit }, @AuthUser() authUser: any) {
    return this.communitiesService.getFollowedCommunities(username, page, limit, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: Community })
  @ApiOperation({
    summary: 'Get information of a community',
    description: 'For all users'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved [OR] "selected" for retrieving selected community', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @PublicWithFlid()
  @Get(':id')
  async getCommunity(@Param('id') id: ObjectId | any, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    return this.communitiesService.getCommunity(id, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: Community })
  @ApiOperation({
    summary: 'Get information of a community with populated referenced information',
    description: 'For admin and local manager only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved [OR] "selected" for retrieving selected community', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.LocalManager)
  @Get('detail/:id')
  async getCommunityInfoWithDetail(@Param('id') id: ObjectId | any, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    return this.communitiesService.getCommunityInfoWithDetail(id, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: PaginationUsersOfCommunityDto })
  @ApiOperation({
    summary: 'Get users of a community',
    description: 'For admin and community admin only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved [OR] "selected" for retrieving selected community', required: true })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.CommunityAdmin)
  @Get('users/:id')
  async getUsersOfCommunity(@Param('id') id: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    return this.communitiesService.getUsersOfCommunity(id, page, limit, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'OK', type: PaginationResilocProxiesDto })
  @ApiOperation({
    summary: 'Get community static proxies selected',
    description: 'For admin and local manager only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved [OR] "selected" for retrieving selected community', required: true })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.LocalManager)
  @Get('selected-proxies/:id')
  async getSelectedResilocProxiesOfCommunity(@Param('id') id: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    return this.communitiesService.getSelectedResilocProxiesOfCommunity(id, page, limit, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated succesfully" }' })
  @ApiNotFoundResponse({ description: 'Community id {id} does not exist' })
  @ApiOperation({
    summary: 'To let a user follow a community',
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a community to be followed by a user', required: true })
  @Public()
  @UsePipes(new ValidationPipe())
  @Put('follow/:id')
  async assignUserForCommunity(@Param('id') id: ObjectId, @Body() userOfCommunityDto: UserOfCommunityDto, @AuthUser() authUser: any) {
    const community = await this.communitiesService.assignUserForCommunity(id, userOfCommunityDto, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiOperation({
    summary: 'Update community information',
    description: 'For admin, local manager, and community admin only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be updated [OR] "selected" for retrieving selected community', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.LocalManager)
  @UsePipes(new ValidationPipe())
  @Put(':id')
  async update(@Param('id') id: ObjectId | any, @Body() updateCommunityDto: UpdateCommunityDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    const community = await this.communitiesService.update(id, updateCommunityDto, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      if (err._message == this.configService.get<string>('mongoose.community_unique_validator_error_message')) {
        const errors = err.message.replace(this.configService.get<string>('mongoose.community_unique_validator_error_message') + ': ', '').split(', ');
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err._message,
          fields: errors
        }, err.status);
      } else if (err.code == this.configService.get<number>('mongoose.unique_validator_error_code')) {
        const re = new RegExp(this.configService.get('parser.inside_curly_brackets'));
        let errors = [];
        errors.push(err.message.match(re)[1].trim().split(':')[0]
          + ': '
          + this.configService.get<string>('mongoose.unique_validator_error_tag'));
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: this.configService.get<string>('mongoose.community_unique_validator_error_message'),
          fields: errors
        }, err.status);
      } else {
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err.message,
        }, err.status);
      }
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiNotFoundResponse({ description: 'Resiloc proxy id {id} does not exist' })
  @ApiOperation({
    summary: 'Update the list of community static proxies selected for a community based on resiloc proxies',
    description: 'For admin and local manager only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be selected static proxies [OR] "selected" for retrieving selected community', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.LocalManager)
  @UsePipes(new ValidationPipe())
  @Put('static-proxies/:id')
  async selectStaticProxiesForCommunity(@Param('id') id: ObjectId | any, @Body() communityStaticProxyDto: CommunityStaticProxiesDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    const community = await this.communitiesService.selectStaticProxiesForCommunity(id, communityStaticProxyDto, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiNotFoundResponse({ description: 'Resiloc scenario id {id} does not exist' })
  @ApiOperation({
    summary: 'Update the list of community scenarios selected for a community based on resiloc scenarios',
    description: 'For admin, local manager, and resilience expert only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be selected scenarios [OR] "selected" for retrieving selected community', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UserRoles(UserRole.Admin, UserRole.LocalManager, UserRole.ResilienceExpert)
  @UsePipes(new ValidationPipe())
  @Put('scenarios/:id')
  async selectScenariosForCommunity(@Param('id') id: ObjectId | any, @Body() communityScenariosDto: CommunityScenariosDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    const community = await this.communitiesService.selectScenariosForCommunity(id, communityScenariosDto, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiOperation({
    summary: 'Point a community to its parents, peers, or children',
    description: 'For admin only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a community to be pointed to other communities', required: true })
  @UserRoles(UserRole.Admin)
  @UsePipes(new ValidationPipe())
  @Put('pointers/:id')
  async pointToOtherCommunities(@Param('id') id: ObjectId, @Body() pointersToOtherCommunitiesDto: PointersToOtherCommunitiesDto) {
    const community = await this.communitiesService.assignPointersToOtherCommunities(id, pointersToOtherCommunitiesDto).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${community.name} updated failed`);
    }
  }

  @ApiOkResponse({ description: 'Community ${id} removed successfully' })
  @ApiOperation({
    summary: 'Delete a community',
    description: 'For admin only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a community to be removed', required: true })
  @UserRoles(UserRole.Admin)
  @Delete(':id')
  async remove(@Param('id') id: ObjectId, @AuthUser() authUser: any) {
    const res = await this.communitiesService.remove(id, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (res && res.deletedCount > 0) {
      return { message: `Community ${id} removed successfully` };
    } else {
      throw new BadRequestException(`Community ${id} removed failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiNotFoundResponse({ description: 'Username {username} does not exist' })
  @ApiOperation({
    summary: 'To let a user unfollow a community',
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a community to be unfollowed by a user', required: true })
  @Public()
  @UsePipes(new ValidationPipe())
  @Put('unfollow/:id')
  async removeUserOfCommunity(@Param('id') id: ObjectId, @Body() userOfCommunityDto: UserOfCommunityDto, @AuthUser() authUser: any) {
    const community = await this.communitiesService.removeUserOfCommunity(id, userOfCommunityDto, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Community {name} updated successfully" }' })
  @ApiOperation({
    summary: 'Remove pointers of a community to its parents, peers, or children',
    description: 'For admin only'
  })
  @ApiParam({ name: 'id', type: String, example: '605ca687da58256a9c997d01', description: 'The id of a community to be removed pointers to other communities', required: true })
  @UserRoles(UserRole.Admin)
  @UsePipes(new ValidationPipe())
  @Put('delete/pointers/:id')
  async removePointersToOtherCommunities(@Param('id') id: ObjectId, @Body() pointersToOtherCommunitiesDto: PointersToOtherCommunitiesDto) {
    const community = await this.communitiesService.removePointersToOtherCommunities(id, pointersToOtherCommunitiesDto).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (community) {
      return { message: `Community ${community.name} updated successfully` };
    } else {
      throw new BadRequestException(`Community ${id} updated failed`);
    }
  }
}

