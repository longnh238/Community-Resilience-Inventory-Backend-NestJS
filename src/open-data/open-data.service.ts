import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PaginationStaticProxiesDto } from '../static-proxies/dto/read-static-proxy.dto';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';

@Injectable()
export class OpenDataService {
     constructor(
          @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
     ) { }

     async findAllPublicStaticProxies(page: number, limit: number): Promise<PaginationStaticProxiesDto> {
          return await this.staticProxiesService.findPublic(page, limit);
     }
}
