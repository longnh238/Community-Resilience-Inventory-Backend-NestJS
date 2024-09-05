import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunitiesModule } from '../communities/communities.module';
import { Snapshot, SnapshotSchema } from '../snapshots/schemas/snapshot.schema';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UsersModule } from '../users/users.module';
import { Timeline, TimelineSchema } from './schemas/timeline.schema';
import { TimelinesController } from './timelines.controller';
import { TimelinesService } from './timelines.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Timeline.name, schema: TimelineSchema }]),
        MongooseModule.forFeature([{ name: Snapshot.name, schema: SnapshotSchema }]),
        forwardRef(() => UsersModule),
        forwardRef(() => CommunitiesModule),
        forwardRef(() => StaticProxiesModule)
    ],
    controllers: [TimelinesController],
    providers: [TimelinesService],
    exports: [TimelinesService]
})
export class TimelinesModule { }
