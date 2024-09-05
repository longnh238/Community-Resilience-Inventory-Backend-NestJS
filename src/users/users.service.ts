import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, ObjectId } from 'mongoose';
import { ArrangingOption } from '../common/enum/arranging-options.enum';
import { CommunitiesService } from '../communities/communities.service';
import { HelpersService } from '../helpers/helpers.service';
import { MailingsService } from '../mailings/mailings.service';
import { RedisService } from '../redis/redis.service';
import { ResilocServiceRole } from '../user-roles/enum/resiloc-service-role.enum';
import { UserRole } from '../user-roles/enum/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationMetaDataUsersDto, PaginationUsersDto } from './dto/read-user.dto';
import { ResetUserPasswordDto, UpdateUserDto, UpdateUserPasswordDto, UserRolesDto } from './dto/update-user.dto';
import { UserOrderingOption } from './enum/user-ordering-options.enum';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => CommunitiesService)) private readonly communitiesService: CommunitiesService,
    private readonly mailingsService: MailingsService,
    private readonly configService: ConfigService,
    private readonly helpersService: HelpersService,
    private readonly redisService: RedisService
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    const user = await createdUser.save();

    const userActivationToken = await this.helpersService.makeRandomString(this.configService.get<number>('userModel.userActivationTokenLength'), true, true, false);
    await this.redisService.set(userActivationToken, user.username);

    await this.mailingsService.sendUserAccountActivation(user, userActivationToken);

    return user;
  }

  async requestUserActivationEmail(id: string): Promise<any> {
    let user = undefined;
    if (await this.helpersService.validateEmail(id)) {
      user = await this.userModel.findOne({ email: id }).exec();
    } else {
      user = await this.findOne(id);
    }
    if (user) {
      if (user.isActive) {
        throw new BadRequestException(`Account ${user.username} was actived`);
      }
      const userActivationToken = await this.helpersService.makeRandomString(this.configService.get<number>('userModel.userActivationTokenLength'), true, true, false);
      await this.redisService.set(userActivationToken, user.username);

      await this.mailingsService.sendUserAccountActivation(user, userActivationToken);

      return {
        message: `Account activation link was sent to your registered email`
      };
    } else {
      throw new BadRequestException(`Id ${id} does not exist`);
    }
  }

  async activeUserAccount(userActiveToken: string): Promise<User> {
    const username = await this.redisService.get(userActiveToken);
    if (username) {
      const user = await this.findOne(username);
      if (user) {
        if (user.isActive) {
          throw new BadRequestException(`Account ${username} was actived`);
        } else {
          return await this.userModel.findOneAndUpdate({ username: username }, { isActive: true }).exec();
        }
      } else {
        throw new BadRequestException(`Username ${username} does not exist`);
      }
    } else {
      throw new BadRequestException(`User activation token ${userActiveToken} has expired or does not exist`);
    }
  }

  async resetUserPasswordResetEmail(id: string): Promise<any> {
    let user = undefined;
    if (await this.helpersService.validateEmail(id)) {
      user = await this.userModel.findOne({ email: id }).exec();
    } else {
      user = await this.findOne(id);
    }
    if (user) {
      const passwordResetToken = await this.helpersService.makeRandomString(this.configService.get<number>('userModel.passwordResetTokenLength'), true, true, false);
      await this.redisService.set(passwordResetToken, user.username);

      await this.mailingsService.sendPasswordReset(user, passwordResetToken);

      return {
        message: `Password reset link was sent to your registered email`
      };
    } else {
      throw new BadRequestException(`Id ${id} does not exist`);
    }
  }

  async resetPassword(passwordResetToken: string, resetUserPasswordDto: ResetUserPasswordDto): Promise<User> {
    const username = await this.redisService.get(passwordResetToken);
    if (username) {
      const user = await this.findOne(username);
      if (user) {
        if (resetUserPasswordDto.password == resetUserPasswordDto.confirmPassword) {
          await this.redisService.remove(passwordResetToken);
          return await this.userModel.findOneAndUpdate({ username: username }, { password: resetUserPasswordDto.password }).exec();
        } else {
          throw new BadRequestException(`Password and confirm password does not match`);
        }
      } else {
        throw new BadRequestException(`Username ${username} does not exist`);
      }
    } else {
      throw new BadRequestException(`Password reset token ${passwordResetToken} has expired or does not exist`);
    }
  }

  async findAll(page: number, limit: number, orderBy: UserOrderingOption, arrange: ArrangingOption): Promise<PaginationUsersDto> {
    if (!Object.values(UserOrderingOption).includes(orderBy)) {
      orderBy = this.configService.get<UserOrderingOption>('pagination.orderBy');
    }
    if (!Object.values(ArrangingOption).includes(arrange)) {
      arrange = this.configService.get<ArrangingOption>('pagination.arrange');
    }

    const query1 = this.userModel.find();
    const totalItems = await query1.countDocuments();

    limit = limit == this.configService.get<number>('pagination.limit') ? totalItems : limit;

    const query2 = this.userModel.find().select(this.configService.get<string>('userModel.excluded_information')).sort({ [`${orderBy}`]: arrange })
    const items = await query2.skip((page - 1) * limit).limit(limit).exec();

    let totalPage = Math.ceil(totalItems / limit);
    if (isNaN(totalPage)) totalPage = 0;

    let paginationUsersDto = new PaginationUsersDto();
    paginationUsersDto.metadata = new PaginationMetaDataUsersDto();

    paginationUsersDto.items = items;
    paginationUsersDto.metadata.currentPage = page;
    paginationUsersDto.metadata.totalPages = totalPage;
    paginationUsersDto.metadata.itemsPerPage = limit;
    paginationUsersDto.metadata.totalItems = totalItems;

    return paginationUsersDto;
  }

  async getUserInfo(username: string, authUser: any): Promise<User> {
    let allowed = false;
    if (await this.isMatchingToken(username, authUser)) {
      allowed = true;
    } else if (await this.isAdmin(authUser.username)) {
      allowed = true;
    } else {
      throw new ForbiddenException('Forbidden resource');
    }

    if (allowed) {
      const user = await this.userModel.findOne({ username: username }).select(this.configService.get<string>('userModel.excluded_information')).exec();
      if (user) {
        return user;
      } else {
        throw new NotFoundException(`Username ${username} does not exist`);
      }
    }
  }

  async activeAccount(username: string): Promise<User> {
    return await this.userModel.findOneAndUpdate({ username: username }, { isActive: true }).exec();
  }

  async update(username: string, updateUserDto: UpdateUserDto, authUser: any): Promise<User> {
    let allowed = false;
    if (await this.isMatchingToken(username, authUser)) {
      allowed = true;
    } else if (await this.isAdmin(authUser.username)) {
      allowed = true;
    } else {
      throw new ForbiddenException('Forbidden resource');
    }

    if (allowed) {
      return await this.userModel.findOneAndUpdate({ username: username }, updateUserDto).exec();
    }
  }

  async changePassword(username: string, updateUserPasswordDto: UpdateUserPasswordDto, authUser: any): Promise<User> {
    let allowed = false;
    if (await this.isMatchingToken(username, authUser)) {
      allowed = true;
    } else if (await this.isAdmin(authUser.username)) {
      allowed = true;
    } else {
      throw new ForbiddenException('Forbidden resource');
    }

    if (allowed) {
      const user = await this.findOne(username);
      if (user && bcrypt.compareSync(updateUserPasswordDto.oldPassword, user.password)) {
        return await this.userModel.findOneAndUpdate({ username: username }, { password: updateUserPasswordDto.newPassword }).exec();
      } else {
        throw new BadRequestException('The old password is incorrect');
      }
    }
  }

  async assignUserRole(username: string, userRolesDto: UserRolesDto, flid: string, authUser: any): Promise<User> {
    if (await this.isAdmin(username)) {
      throw new ForbiddenException('Unable to assign user roles for admin accounts');
    } else if (await this.isResilocService(username)) {
      throw new ForbiddenException('Unable to assign user roles for resiloc service accounts');
    }

    if (await this.helpersService.hasDuplicates(userRolesDto.userRoles)) {
      throw new BadRequestException(`Array of user roles contains duplicate values`);
    }

    const communityId = userRolesDto.communityId;
    let allowed = false;
    if (await this.isAdmin(authUser.username)) {
      allowed = true;
    } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
      allowed = true;
    } else {
      throw new ForbiddenException('Forbidden resource');
    }

    if (allowed) {
      if (await this.isMatchingToken(username, authUser)) {
        throw new BadRequestException('Unable to self-assign roles');
      }
      if (await this.communitiesService.isUserBelongToCommunity(communityId, username)) {
        const userRoles = userRolesDto.userRoles ? userRolesDto.userRoles : [];

        const indexOfAdmin = userRoles.indexOf(UserRole.Admin);
        if (indexOfAdmin > -1) {
          userRoles.splice(indexOfAdmin, 1);
          throw new ForbiddenException('Unable to assign roles as admin');
        }

        // const indexOfCommunityAdmin = userRoles.indexOf(UserRole.CommunityAdmin);
        // if (indexOfCommunityAdmin > -1 && !(await this.isAdmin(authUser.username))) {
        //   userRoles.splice(indexOfCommunityAdmin, 1);
        //   throw new ForbiddenException('Only admin can assign roles for community admin');
        // }

        return await this.userModel.findOneAndUpdate({ username: username }, { $addToSet: { [`userRoles.${communityId}`]: { $each: userRoles } } }).exec();
      } else {
        throw new NotAcceptableException(`User ${username} does not belong to this community`);
      }
    }
  }

  async remove(username: string): Promise<any> {
    if (await this.isAdmin(username)) {
      throw new BadRequestException('Cannot remove admin account');
    } else if (await this.isResilocService(username)) {
      throw new BadRequestException('Cannot remove resiloc service account');
    } else {
      await this.communitiesService.removeUserFromCommunities(username);
      return await this.userModel.deleteOne({ username: username }).exec();
    }
  }

  async removeUserRole(username: string, userRolesDto: UserRolesDto, flid: string, authUser: any) {
    if (await this.isAdmin(username)) {
      throw new ForbiddenException('Unable to remove user roles for admin accounts');
    } else if (await this.isResilocService(username)) {
      throw new ForbiddenException('Unable to remove user roles for resiloc service accounts');
    }

    if (await this.helpersService.hasDuplicates(userRolesDto.userRoles)) {
      throw new BadRequestException(`Array of user roles contains duplicate values`);
    }

    const communityId = userRolesDto.communityId;
    let allowed = false;
    if (await this.isAdmin(authUser.username)) {
      allowed = true;
    } else if (await this.communitiesService.isCommunityIdMatchingWithFlid(communityId, flid)) {
      allowed = true;
    } else {
      throw new ForbiddenException('Forbidden resource');
    }

    if (allowed) {
      if (await this.communitiesService.isUserBelongToCommunity(userRolesDto.communityId, username)) {
        const userRoles = userRolesDto.userRoles ? userRolesDto.userRoles : [];

        const isAdmin = await this.isAdmin(authUser.username);
        await userRoles.forEach(userRole => {
          if (userRole != UserRole.Citizen && userRole != UserRole.Admin) {
            if (userRole == UserRole.CommunityAdmin) {
              if (!isAdmin) {
                throw new BadRequestException('Only admin can remove community admin role');
              }
            }
            this.userModel.findOneAndUpdate({ username: username }, { $pull: { [`userRoles.${communityId}`]: userRole } }).exec();
          } else if (userRole == UserRole.Citizen) {
            throw new BadRequestException('Cannot remove citizen role');
          } else if (userRole == UserRole.Admin) {
            throw new BadRequestException('Cannot remove admin role');
          }
        });
      } else {
        throw new NotAcceptableException('User does not belong to this community');
      }
    }
  }

  async findOne(username: string): Promise<User> {
    return await this.userModel.findOne({ username: username }).exec();
  }

  async findOneById(id: ObjectId): Promise<User> {
    return await this.userModel.findById(id).exec();
  }

  async getUserIdOfUsername(username: string): Promise<ObjectId> {
    const user = await this.userModel.findOne({ username: username }).exec();
    return user?._id;
  }

  async getUserIdsOfUsernames(usernames: string[]): Promise<ObjectId[]> {
    let userIds = [];
    for (const username of usernames) {
      userIds.push(await this.getUserIdOfUsername(username));
    }
    return userIds;
  }

  async getUserRolesByCommunities(username: string): Promise<Map<ObjectId, UserRole[]>> {
    const user = await this.findOne(username);
    return user.userRoles;
  }

  async getUserRolesByCommunity(username: string, communityId: ObjectId): Promise<UserRole[]> {
    const user = await this.findOne(username);
    const userRolesByCommunities = user.userRoles;
    for (let [key, value] of userRolesByCommunities) {
      if (key == communityId) {
        return value;
      }
    }
  }

  async getJwtToken(username: string): Promise<string> {
    return (await this.userModel.findOne({ username: username }))?.jwtToken;
  }

  async setDefaultUserRoleAsCitizen(username: string, communityId: ObjectId): Promise<User> {
    const role = [UserRole.Citizen];
    const currentUserRoles = (await this.findOne(username)).userRoles;
    currentUserRoles.set(communityId, role);
    return await this.userModel.findOneAndUpdate({ username: username }, { userRoles: currentUserRoles }).exec();
  }

  async removeUserRolesFromCommunity(username: string, communityId: ObjectId) {
    await this.userModel.findOneAndUpdate({ username: username }, { $unset: { [`userRoles.${communityId}`]: 1 } });
  }

  async isMatchingToken(username: string, authUser: any): Promise<boolean> {
    let isMatchingToken = false;
    if (username && authUser.username && username == authUser.username) {
      isMatchingToken = true;
    }
    return isMatchingToken;
  }

  async isAdmin(username: string): Promise<boolean> {
    const user = await this.findOne(username);
    const isAdmin = user?.isAdmin;
    return isAdmin;
  }

  async isResilocService(username: string) {
    const user = await this.findOne(username);
    return Object.values(ResilocServiceRole).includes(user.resilocServiceRole);
  }

  async isCommunityAdmin(username: string, communityId: ObjectId): Promise<boolean> {
    const user = await this.findOne(username);
    let isLocalManager = false;
    const userRolesByCommunities = user.userRoles;
    for (let [key, value] of userRolesByCommunities) {
      if (key == communityId) {
        isLocalManager = value.includes(UserRole.CommunityAdmin);
      }
    }
    return isLocalManager;
  }

  async isLocalManager(username: string, communityId: ObjectId): Promise<boolean> {
    const user = await this.findOne(username);
    let isLocalManager = false;
    const userRolesByCommunities = user.userRoles;
    for (let [key, value] of userRolesByCommunities) {
      if (key == communityId) {
        isLocalManager = value.includes(UserRole.LocalManager);
      }
    }
    return isLocalManager;
  }

  async isResilienceExpert(username: string, communityId: ObjectId): Promise<boolean> {
    const user = await this.findOne(username);
    let isResilienceExpert = false;
    const userRolesByCommunities = user.userRoles;
    for (let [key, value] of userRolesByCommunities) {
      if (key == communityId) {
        isResilienceExpert = value.includes(UserRole.ResilienceExpert);
      }
    }
    return isResilienceExpert;
  }

  async isCitizen(username: string, communityId: ObjectId): Promise<boolean> {
    const user = await this.findOne(username);
    let isCitizen = false;
    const userRolesByCommunities = user.userRoles;
    const userRoles = userRolesByCommunities.get(communityId);
    if (userRoles) {
      if (userRoles.length == 1 && userRoles.includes(UserRole.Citizen)) {
        isCitizen = true;
      }
    }
    return isCitizen;
  }
}