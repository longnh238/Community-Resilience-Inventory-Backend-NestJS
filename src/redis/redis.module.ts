import { CacheModule, forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                store: redisStore,
                host: configService.get<string>('redis.host'),
                port: configService.get<number>('redis.port'),
                password: configService.get<string>('redis.password'),
                ttl: configService.get<number>('redis.ttl')
            }),
        }),
        forwardRef(() => UsersModule),
    ],
    controllers: [RedisController],
    providers: [RedisService],
    exports: [RedisService]
})
export class RedisModule { }
