import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class MailingsService {
     constructor(
          private mailerService: MailerService,
          private readonly configService: ConfigService
     ) { }

     async sendUserAccountActivation(user: User, token: string) {
          const url = `http://abc.com/auth/activate-account/${token}`;
          const logo = this.configService.get<string>('mailing.logo');
          const banner = this.configService.get<string>('mailing.banner');

          let firstName = '';
          if (user.firstName && user.firstName != '') {
               firstName = ' ' + user.firstName;
          }

          await this.mailerService.sendMail({
               to: user.email,
               // from: '"Support Team" <support@example.com>', // override default from
               subject: 'Welcome to RESILOC Inventory! Active Your Account',
               template: './user-account-activation',
               context: {
                    logo: logo,
                    banner: banner,
                    firstName: `${firstName}`,
                    url,
               },
          });
     }

     async sendPasswordReset(user: User, token: string) {
          const url = `http://abc.com/auth/recovery-password/reset-password/${token}`;
          const logo = this.configService.get<string>('mailing.logo');
          const banner = this.configService.get<string>('mailing.banner');

          let firstName = '';
          if (user.firstName && user.firstName != '') {
               firstName = ' ' + user.firstName;
          }

          await this.mailerService.sendMail({
               to: user.email,
               // from: '"Support Team" <support@example.com>', // override default from
               subject: 'Reset Password Instructions for Your RESILOC Inventory Account',
               template: './password-reset',
               context: {
                    logo: logo,
                    banner: banner,
                    firstName: `${firstName}`,
                    url,
               },
          });
     }
}
