import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesModule } from '../communities/communities.module';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UsersModule } from '../users/users.module';
import { ResilocProxyMetadata } from './entities/resiloc-proxy-metadata.entity';
import { ResilocProxy } from './entities/resiloc-proxy.entity';
import { ResilocProxiesController } from './resiloc-proxies.controller';
import { ResilocProxiesService } from './resiloc-proxies.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([ResilocProxy]),
        TypeOrmModule.forFeature([ResilocProxyMetadata]),
        forwardRef(() => UsersModule),
        forwardRef(() => CommunitiesModule),
        forwardRef(() => StaticProxiesModule),
    ],
    controllers: [ResilocProxiesController],
    providers: [ResilocProxiesService],
    exports: [ResilocProxiesService],         
})
export class ResilocProxiesModule { }
