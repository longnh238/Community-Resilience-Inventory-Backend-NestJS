import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailingsService } from './mailings.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mailing.host'),
          port: configService.get<number>('mailing.port'),
          secure: true,
          auth: {
            user: configService.get<string>('mailing.account'),
            pass: configService.get<string>('mailing.password')
          },
        },
        defaults: {
          from: configService.get<string>('mailing.from')
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailingsService],
  exports: [MailingsService]
})
export class MailingsModule { }
