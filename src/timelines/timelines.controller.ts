import { Controller, Get, Headers, HttpException, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublicWithFlid } from '../common/decorator/public.decorator';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { PaginationDefaultTimelineDto } from './dto/read-timeline.dto';
import { TimelinesService } from './timelines.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('timelines')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('timelines')
export class TimelinesController {
    constructor(private readonly timelinesService: TimelinesService) { }

    @ApiOkResponse({ description: 'OK', type: PaginationDefaultTimelineDto })
    @ApiOperation({
        summary: 'Get default timeline of a community',
        description: 'For all users'
    })
    @ApiParam({ name: 'communityId', type: String, example: '605ca687da58256a9c997d01 [OR] selected', description: 'The id of a community to be retrieved its default timeline [OR] "selected" for retrieving selected community', required: true })
    @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
    @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
    @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
    @PublicWithFlid()
    @Get('default/community/:communityId')
    async getDefaultTimelineOfCommunity(@Param('communityId') communityId: ObjectId | any, @Query() { page, limit }, @Headers('flid') flid: string, @AuthUser() authUser: any) {
        return this.timelinesService.getDefaultTimelineOfCommunity(communityId, page, limit, flid, authUser).catch(err => {
            if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }
}
