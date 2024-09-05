import { PATH_METADATA } from '@nestjs/common/constants';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));

  app.useStaticAssets(join(__dirname, '..', '/public'), { prefix: '/' + configService.get<string>('documentation.url') });

  const config = new DocumentBuilder()
    .setTitle(configService.get<string>('documentation.title'))
    .setDescription(configService.get<string>('documentation.description'))
    .setVersion(configService.get<string>('documentation.version'))
    .addBearerAuth()
    .build();

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
    },
    customCss: `
      .topbar-wrapper img { content:url(\'./img/${configService.get<string>('documentation.logo')}\'); height:60px; width:auto; }
      .swagger-ui .topbar { background-color: white; border-bottom: 1px solid; border-color: rgba(59,65,81,.3) }
    `,
    customSiteTitle: configService.get<string>('documentation.siteTitle'),
  };
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(configService.get<string>('documentation.url'), app, document, customOptions);

  await app.listen(80);
}
bootstrap();
