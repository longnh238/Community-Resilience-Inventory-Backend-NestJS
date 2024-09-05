import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesModule } from '../communities/communities.module';
import { ResilocProxiesModule } from '../resiloc-proxies/resiloc-proxies.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { UsersModule } from '../users/users.module';
import { StaticProxyMetadata } from './entities/static-proxy-metadata.entity';
import { StaticProxy } from './entities/static-proxy.entity';
import { StaticProxiesController } from './static-proxies.controller';
import { StaticProxiesService } from './static-proxies.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaticProxy, StaticProxyMetadata]),
        forwardRef(() => UsersModule),
        forwardRef(() => CommunitiesModule),
        forwardRef(() => SnapshotsModule),
        forwardRef(() => ResilocProxiesModule)
    ],
    controllers: [StaticProxiesController],
    providers: [StaticProxiesService],
    exports: [StaticProxiesService]
})
export class StaticProxiesModule { }
