import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enum/user-role.enum';

export const USER_ROLES_KEY = 'userRoles';
export const UserRoles = (...userRoles: UserRole[]) => SetMetadata(USER_ROLES_KEY, userRoles);