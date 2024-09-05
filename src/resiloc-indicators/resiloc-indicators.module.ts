import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesModule } from '../communities/communities.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { ResilocProxiesModule } from '../resiloc-proxies/resiloc-proxies.module';
import { UsersModule } from '../users/users.module';
import { ResilocIndicator } from './entities/resiloc-indicator.entity';
import { ResilocIndicatorsController } from './resiloc-indicators.controller';
import { ResilocIndicatorsService } from './resiloc-indicators.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResilocIndicator]),
    forwardRef(() => UsersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => IndicatorsModule),
    forwardRef(() => ResilocProxiesModule),
  ],
  controllers: [ResilocIndicatorsController],
  providers: [ResilocIndicatorsService],
  exports: [ResilocIndicatorsService]
})
export class ResilocIndicatorsModule { }
