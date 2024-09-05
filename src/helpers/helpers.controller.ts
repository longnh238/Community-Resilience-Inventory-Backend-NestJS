import { Controller, Get, HttpException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { AuthUser } from '../users/users.decorator';
import { HelpersService } from './helpers.service';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiTags('helpers')
@Controller('helpers')
export class HelpersController {
    constructor(private readonly helpersService: HelpersService) { };

    @UseGuards(JwtAuthGuard, UserRolesGuard)
    @ApiOkResponse({ description: 'OK', type: String })
    @ApiOperation({
        summary: 'Cipher a text',
        description: 'For admin only'
    })
    @UserRoles(UserRole.Admin)
    @Get('cipher/:text')
    async cipher(@Param('text') text: string) {
        return this.helpersService.cipherText(text).catch(err => {
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }

    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({ description: 'OK', type: [String] })
    @ApiOperation({
        summary: 'Get username',
    })
    @Get('who-am-i')
    async whoAmI(@AuthUser() authUser: any) {
        return this.helpersService.whoAmI(authUser).catch(err => {
            throw new HttpException({
                statusCode: err.status,
                message: err.message
            }, err.status);
        });
    }
}
