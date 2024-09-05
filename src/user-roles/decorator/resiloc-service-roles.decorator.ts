import { SetMetadata } from '@nestjs/common';
import { ResilocServiceRole } from '../enum/resiloc-service-role.enum';

export const RESILOC_SERVICE_ROLES_KEY = 'resilocServiceRoles';
export const ResilocServiceRoles = (...resilocServiceRoles: ResilocServiceRole[]) => SetMetadata(RESILOC_SERVICE_ROLES_KEY, resilocServiceRoles);