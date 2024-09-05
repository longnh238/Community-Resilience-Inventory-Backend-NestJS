import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResilocIndicatorsModule } from '../resiloc-indicators/resiloc-indicators.module';
import { ScenarioIndicatorProxy } from '../scenarios/enum/scenario-indicator-proxy.entity';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UsersModule } from '../users/users.module';
import { Indicator } from './entities/indicator.entity';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';

@Module({
     imports: [
          TypeOrmModule.forFeature([Indicator]),
          forwardRef(() => UsersModule),
          forwardRef(() => ResilocIndicatorsModule),
          forwardRef(() => StaticProxiesModule),
     ],
     controllers: [IndicatorsController],
     providers: [IndicatorsService],
     exports: [IndicatorsService]
})
export class IndicatorsModule { }
