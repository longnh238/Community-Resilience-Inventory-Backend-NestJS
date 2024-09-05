import { forwardRef, Global, Module } from '@nestjs/common';
import { CommunitiesModule } from '../communities/communities.module';
import { UsersModule } from '../users/users.module';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';

@Global()
@Module({
    imports: [
        forwardRef(() => UsersModule),
        forwardRef(() => CommunitiesModule),
    ],
    controllers: [UserRolesController],
    providers: [UserRolesService],
    exports: [UserRolesService]
})
export class UserRolesModule { }
