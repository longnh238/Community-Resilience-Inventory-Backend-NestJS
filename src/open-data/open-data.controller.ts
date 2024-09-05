import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationStaticProxiesDto } from '../static-proxies/dto/read-static-proxy.dto';
import { OpenDataService } from './open-data.service';

@ApiTags('open-data')
@Controller('open-data')
export class OpenDataController {
     constructor(
          private readonly openDataService: OpenDataService,
          private readonly configService: ConfigService
     ) { }

     @ApiOkResponse({ description: 'OK', type: PaginationStaticProxiesDto })
     @ApiOperation({
          summary: 'Get all public static-proxies in the inventory',
     })
     @ApiQuery({ name: 'page', description: 'Page number (blank | null: 1st page)', required: false })
     @ApiQuery({ name: 'limit', description: 'The number of items per page (blank | null: get all items)', required: false })
     @Get('static-proxies')
     async findAllPublicStaticProxies(@Query() { page, limit }) {
          return this.openDataService.findAllPublicStaticProxies(page, limit).catch(err => {
               if (!err.status || err.status == HttpStatus.CREATED || err.status == HttpStatus.OK) err.status = HttpStatus.BAD_REQUEST;
               throw new HttpException({
                    statusCode: err.status,
                    message: err.message
               }, err.status);
          });
     }
}
