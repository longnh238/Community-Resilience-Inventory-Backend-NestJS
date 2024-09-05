import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) { }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && !user.isActive) {
      throw new UnauthorizedException('This account is not actived');
    }
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password, ...result } = user;
      return result;
    } else {
      throw new UnauthorizedException('The username or password is incorrect');
    }
  }

  async login(user: User, param: any) {
    const payload = { username: user.username };
    const keepMeLoggedIn = param?.keepMeLoggedIn;
    if (keepMeLoggedIn) {
      if (await this.usersService.isResilocService(user.username)) {
        return { token: this.jwtService.sign(payload, { expiresIn: this.configService.get<string>('jwt.very_long_expiration_time') }) };
      } else {
        return { token: this.jwtService.sign(payload, { expiresIn: this.configService.get<string>('jwt.long_expiration_time') }) };
      }
    } else {
      return { token: this.jwtService.sign(payload) };
    }
  }

  async loggedOut(req: any, authUser: any) {
    let jwtTokenPrefix = this.configService.get<string>('jwtTokenPrefix.capitalised');
    if (!req.headers.authorization.includes(jwtTokenPrefix)) {
      jwtTokenPrefix = this.configService.get<string>('jwtTokenPrefix.normal');
    }
    const jwtToken = req.headers.authorization.replace(jwtTokenPrefix, '');
    await this.redisService.set(jwtToken, this.configService.get<string>('blacklist.value'));
    if (await this.redisService.get(jwtToken)) {
      return { message: `Account ${authUser.username} logged out successfully` };
    } else {
      throw new BadRequestException('Logout failed');
    }
  }
}