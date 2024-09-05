import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResilocIndicatorsModule } from '../resiloc-indicators/resiloc-indicators.module';
import { UsersModule } from '../users/users.module';
import { ResilocScenarioIndicatorProxy } from './entities/resiloc-scenario-indicator-proxy.entity';
import { ResilocScenario } from './entities/resiloc-scenario.entity';
import { ResilocScenariosController } from './resiloc-scenarios.controller';
import { ResilocScenariosService } from './resiloc-scenarios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResilocScenario]),
    TypeOrmModule.forFeature([ResilocScenarioIndicatorProxy]),
    forwardRef(() => UsersModule),
    forwardRef(() => ResilocIndicatorsModule),
  ],
  controllers: [ResilocScenariosController],
  providers: [ResilocScenariosService],
  exports: [ResilocScenariosService]
})
export class ResilocScenariosModule { }
