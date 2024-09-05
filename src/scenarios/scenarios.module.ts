import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesModule } from '../communities/communities.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { ResilocScenariosModule } from '../resiloc-scenarios/resiloc-scenarios.module';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { UsersModule } from '../users/users.module';
import { Scenario } from './entities/scenario.entity';
import { ScenarioIndicatorProxy } from './enum/scenario-indicator-proxy.entity';
import { ScenariosController } from './scenarios.controller';
import { ScenariosService } from './scenarios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Scenario, ScenarioIndicatorProxy]),
    forwardRef(() => UsersModule),
    forwardRef(() => CommunitiesModule),
    forwardRef(() => ResilocScenariosModule),
    forwardRef(() => IndicatorsModule),
    forwardRef(() => StaticProxiesModule),
  ],
  controllers: [ScenariosController],
  providers: [ScenariosService],
  exports: [ScenariosService]
})
export class ScenariosModule { }
