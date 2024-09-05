import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResilocProxiesModule } from '../resiloc-proxies/resiloc-proxies.module';
import { ResilocScenariosModule } from '../resiloc-scenarios/resiloc-scenarios.module';
import { ScenariosModule } from '../scenarios/scenarios.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { UsersModule } from '../users/users.module';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { Community, CommunitySchema } from './schemas/community.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Community.name, schema: CommunitySchema }]),
    forwardRef(() => UserRolesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ResilocProxiesModule),
    forwardRef(() => ResilocScenariosModule),
    forwardRef(() => StaticProxiesModule),
    forwardRef(() => ScenariosModule),
    forwardRef(() => SnapshotsModule)
  ],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService]
})
export class CommunitiesModule { }