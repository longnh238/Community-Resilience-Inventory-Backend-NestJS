import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommunitiesModule } from './communities/communities.module';
import configuration from './config/configuration';
import { HelpersModule } from './helpers/helpers.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { MailingsModule } from './mailings/mailings.module';
import { GetRequestMiddleware } from './middlewares/pager.middleware';
import { RedisModule } from './redis/redis.module';
import { ResilocIndicatorsModule } from './resiloc-indicators/resiloc-indicators.module';
import { ResilocProxiesModule } from './resiloc-proxies/resiloc-proxies.module';
import { ResilocScenariosModule } from './resiloc-scenarios/resiloc-scenarios.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { StaticProxiesModule } from './static-proxies/static-proxies.module';
import { TimelinesModule } from './timelines/timelines.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { UsersModule } from './users/users.module';
import { OpenDataModule } from './open-data/open-data.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
        auth: {
          authSource: "admin"
        },
        user: configService.get<string>('mongodb.username'),
        pass: configService.get<string>('mongodb.password'),
        useCreateIndex: true,
        useFindAndModify: false
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('postgres.host'),
        port: +configService.get<string>('postgres.port'),
        username: configService.get<string>('postgres.username'),
        password: configService.get<string>('postgres.password'),
        database: configService.get<string>('postgres.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration
      ],
    }),
    AuthModule,
    UsersModule,
    UserRolesModule,
    CommunitiesModule,
    SnapshotsModule,
    StaticProxiesModule,
    ResilocProxiesModule,
    TimelinesModule,
    UserRolesModule,
    RedisModule,
    HelpersModule,
    MailingsModule,
    ResilocIndicatorsModule,
    IndicatorsModule,
    ScenariosModule,
    ResilocScenariosModule,
    OpenDataModule
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GetRequestMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.GET });
  }
}


