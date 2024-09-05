import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunitiesModule } from '../communities/communities.module';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UsersModule } from '../users/users.module';
import { Snapshot, SnapshotSchema } from './schemas/snapshot.schema';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Snapshot.name, schema: SnapshotSchema }]),
    forwardRef(() => UsersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => StaticProxiesModule)
  ],
  controllers: [SnapshotsController],
  providers: [SnapshotsService],
  exports: [SnapshotsService]
})
export class SnapshotsModule { }
