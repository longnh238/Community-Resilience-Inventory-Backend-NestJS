import { Controller, Request, Post, UseGuards, Get, Body, Header, Req } from '@nestjs/common';
import { LocalAuthGuard } from './auth/guards/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { AppService } from './app.service';
import { ApiBearerAuth, ApiBody, ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './users/users.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@ApiTags('authorizations')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private authService: AuthService,
  ) { }

  @ApiOkResponse({ description: 'Return bearer token' })
  @ApiOperation({
    summary: 'Gain access to a user by username and password',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
        },
        password: {
          type: 'string',
        },
        keepMeLoggedIn: {
          type: 'boolean'
        }
      },
    },
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() param) {
    return this.authService.login(req.user._doc, param);
  }

  @ApiOkResponse({ description: '{ "message": "Account {username} logged out successfully" }' })
  @ApiOperation({
    summary: 'End access to RESILOC inventory',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('loggout')
  async logout(@Req() req, @AuthUser() authUser: any) {
    return this.authService.loggedOut(req, authUser);
  }

  @ApiExcludeEndpoint()
  @Get('resiloc_test')
  async resilocTest(@Request() req) {
    return "Hello RESILOC!";
  }
}