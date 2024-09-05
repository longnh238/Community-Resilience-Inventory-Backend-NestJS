import { Controller, Get, HttpException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { RedisService } from './redis.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiTags('cache')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('cache')
export class RedisController {
    constructor(private readonly redisService: RedisService) { }

    @ApiOkResponse({ description: 'OK' })
    @ApiOperation({
        summary: 'Get all data in cache',
        description: 'For admin only'
    })
    @UserRoles(UserRole.Admin)
    @Get()
    async findAll() {
        return this.redisService.findAll().catch(err => {
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }
}
