import { forwardRef, Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { HelpersController } from './helpers.controller';
import { HelpersService } from './helpers.service';

@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
  ],
  controllers: [HelpersController],
  providers: [HelpersService],
  exports: [HelpersService]
})
export class HelpersModule { }
