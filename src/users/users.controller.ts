import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiHeader, ApiNotAcceptableResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorator/public.decorator';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { ValidationPipe } from '../common/pipe/validation.pipe';
import { ResilocServiceRoles } from '../user-roles/decorator/resiloc-service-roles.decorator';
import { UserRoles } from '../user-roles/decorator/user-roles.decorator';
import { ResilocServiceRole } from '../user-roles/enum/resiloc-service-role.enum';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { UserRolesGuard } from '../user-roles/guards/user-roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationUsersDto } from './dto/read-user.dto';
import { ResetUserPasswordDto, UpdateUserDto, UpdateUserPasswordDto, UserRolesDto } from './dto/update-user.dto';
import { UserOrderingOption } from './enum/user-ordering-options.enum';
import { User } from './schemas/user.schema';
import { AuthUser } from './users.decorator';
import { UsersService } from './users.service';

@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden resource' })
@ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed' })
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService
  ) { }

  @ApiCreatedResponse({ description: '{ "message": "Account {username} created successfully" }' })
  @ApiOperation({
    summary: 'Create a user account'
  })
  @Public()
  @UsePipes(new ValidationPipe())
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      if (err._message == this.configService.get<string>('mongoose.user_unique_validator_error_message')) {
        const errors = err.message.replace(this.configService.get<string>('mongoose.user_unique_validator_error_message') + ': ', '').split(', ');
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
          message: this.configService.get<string>('mongoose.user_unique_validator_error_message'),
          fields: errors
        }, err.status);
      } else {
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err.message,
        }, err.status);
      }
    });
    if (user) {
      return { message: `Account ${user.username} created successfully` };
    } else {
      throw new BadRequestException(`Account created failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Account activation link was sent to your registered email" }' })
  @ApiOperation({
    summary: 'Request to email for activing a user account'
  })
  @ApiParam({ name: 'id', type: String, example: 'resiloc [OR] resiloc@gmail.com', description: 'Id is a username or an email of an account to send account activation email', required: true })
  @Public()
  @Get('activation/:id')
  async requestUserActivationEmail(@Param('id') id: string) {
    return this.usersService.requestUserActivationEmail(id).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'Account {user.username} actived successfully' })
  @ApiOperation({
    summary: 'Active user account'
  })
  @ApiParam({ name: 'userActivationToken', type: String, example: 'WDlF2eAmRwRPSd9USTehOn8zCwAPPVewF8Kr2KKKzLaTVwrYEV', description: 'The token to active a user account', required: true })
  @Public()
  @Put('activation/:userActivationToken')
  async activeUserAccount(@Param('userActivationToken') userActivationToken: string) {
    const user = await this.usersService.activeUserAccount(userActivationToken).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (user) {
      return { message: `Account ${user.username} actived successfully` };
    } else {
      throw new BadRequestException(`Account actived failed`);
    }
  }

  @ApiOkResponse({ description: '{ "message": "Password reset link was sent to your registered email" }' })
  @ApiOperation({
    summary: 'Request to send email for reseting user password'
  })
  @ApiParam({ name: 'id', type: String, example: 'resiloc [OR] resiloc@gmail.com', description: 'Id is a username or email of an account to send password reset email', required: true })
  @Public()
  @Get('password-reset/:id')
  async resetUserPasswordResetEmail(@Param('id') id: string) {
    return this.usersService.resetUserPasswordResetEmail(id).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiOkResponse({ description: 'Account {user.username} actived successfully' })
  @ApiOperation({
    summary: 'Reset user password'
  })
  @ApiParam({ name: 'passwordResetToken', type: String, example: 'OxVR1pSw2B0VXwvVf8ukC7NBzKeGvOS4S55De0C7CaeXjQyUbnxH66pJBsGohSk1UzsgDTnCTbHR2XMb9sVoeWNnT7eF42kBy1jd', description: 'The token to reset password of a user account', required: true })
  @Public()
  @Put('password-reset/:passwordResetToken')
  async resetPassword(@Param('passwordResetToken') passwordResetToken: string, @Body() resetUserPasswordDto: ResetUserPasswordDto) {
    const user = await this.usersService.resetPassword(passwordResetToken, resetUserPasswordDto).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (user) {
      return { message: `Account ${user.username} reset password successfully` };
    } else {
      throw new BadRequestException(`Account reset password failed`);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK', type: PaginationUsersDto })
  @ApiOperation({
    summary: 'Get all users in the inventory',
    description: 'For admin only'
  })
  @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
  @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
  @ApiQuery({ name: 'orderBy', description: 'Order by options', enum: UserOrderingOption, required: false })
  @ApiQuery({ name: 'arrange', description: 'Arrange options', enum: ArrangingOption, required: false })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @ResilocServiceRoles(ResilocServiceRole.SemanticLayer)
  @UserRoles(UserRole.Admin)
  @Get()
  async findAll(@Query() { page, limit, orderBy, arrange }) {
    return this.usersService.findAll(page, limit, orderBy, arrange).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK', type: User })
  @ApiOperation({
    summary: 'Get information of a user',
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be retrieved', required: true })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Public()
  @Get(':username')
  async getUserInfo(@Param('username') username: string, @AuthUser() authUser: any) {
    return this.usersService.getUserInfo(username, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: '{ "message": "Account {username} updated successfully" }' })
  @ApiOperation({
    summary: 'Update user information',
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be updated', required: true })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Public()
  @UsePipes(new ValidationPipe())
  @Put(':username')
  async update(@Param('username') username: string, @Body() updateUserDto: UpdateUserDto, @AuthUser() authUser: any) {
    const user = await this.usersService.update(username, updateUserDto, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      if (err._message == this.configService.get<string>('mongoose.user_unique_validator_error_message')) {
        const errors = err.message.replace(this.configService.get<string>('mongoose.user_unique_validator_error_message') + ': ', '').split(', ');
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
          message: this.configService.get<string>('mongoose.user_unique_validator_error_message'),
          fields: errors
        }, err.status);
      } else {
        throw new HttpException({
          statusCode: err.status ? err.status : HttpStatus.BAD_REQUEST,
          message: err.message,
        }, err.status);
      }
    });
    if (user) {
      return { message: `Account ${user.username} updated successfully` };
    } else {
      throw new BadRequestException(`Account ${username} updated failed`);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: '{ "message": "Account {username} updated successfully" }' })
  @ApiBadRequestResponse({ description: 'No valid fields were requested [OR] Value validation failed [OR] The old password is incorrect' })
  @ApiOperation({
    summary: 'Change user password',
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be changed password', required: true })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Public()
  @UsePipes(new ValidationPipe())
  @Put('password/:username')
  async changePassword(@Param('username') username: string, @Body() updateUserPasswordDto: UpdateUserPasswordDto, @AuthUser() authUser: any) {
    const user = await this.usersService.changePassword(username, updateUserPasswordDto, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (user) {
      return { message: `Account ${user.username} updated successfully` };
    } else {
      throw new BadRequestException(`Account ${username} updated failed`);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: '{ "message": "Account {username} updated successfully" }' })
  @ApiNotAcceptableResponse({ description: 'User does not belong to this community' })
  @ApiOperation({
    summary: 'Assign roles for a user',
    description: 'For admin and community admin only. Assigning roles is possible only after a user selected his/her communities'
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be assigned roles', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @UserRoles(UserRole.Admin, UserRole.CommunityAdmin)
  @UsePipes(new ValidationPipe())
  @Put('roles/:username')
  async assignUserRole(@Param('username') username: string, @Body() userRolesDto: UserRolesDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    const user = await this.usersService.assignUserRole(username, userRolesDto, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (user) {
      return { message: `Account ${user.username} updated successfully` };
    } else {
      throw new BadRequestException(`Account ${username} updated failed`);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: '{ "message": "Account {username} removed successfully" }' })
  @ApiOperation({
    summary: 'Delete a user account',
    description: 'For admin only'
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be deleted', required: true })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @UserRoles(UserRole.Admin)
  @Delete(':username')
  async remove(@Param('username') username: string) {
    const res = await this.usersService.remove(username).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    if (res && res.deletedCount > 0) {
      return { message: `Account ${username} removed successfully` };
    } else {
      throw new BadRequestException(`Account ${username} removed failed`);
    }
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: '{ "message": "Account {username} updated successfully" }' })
  @ApiNotAcceptableResponse({ description: 'User does not belong to this community' })
  @ApiOperation({
    summary: 'Remove roles of a user',
    description: 'For admin and community admin only'
  })
  @ApiParam({ name: 'username', type: String, example: 'resiloc', description: 'The username of an account to be removed roles', required: true })
  @ApiHeader({ name: 'flid', description: 'The community id decoded (not required towards admin)', required: false })
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @UserRoles(UserRole.Admin, UserRole.CommunityAdmin)
  @UsePipes(new ValidationPipe())
  @Put('delete/roles/:username')
  async removeUserRole(@Param('username') username: string, @Body() userRolesDto: UserRolesDto, @Headers('flid') flid: string, @AuthUser() authUser: any) {
    await this.usersService.removeUserRole(username, userRolesDto, flid, authUser).catch(err => {
      if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
      throw new HttpException({
        statusCode: err.status,
        message: err.message
      }, err.status);
    });
    return { message: `Account ${username} updated successfully` };
  }
}