import { forwardRef, Module } from '@nestjs/common';
import { StaticProxiesModule } from '../static-proxies/static-proxies.module';
import { OpenDataController } from './open-data.controller';
import { OpenDataService } from './open-data.service';

@Module({
  imports: [
    forwardRef(() => StaticProxiesModule),
  ],
  controllers: [OpenDataController],
  providers: [OpenDataService],
  exports: [OpenDataService]
})
export class OpenDataModule { }
