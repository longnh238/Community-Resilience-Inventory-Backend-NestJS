import { Injectable, NestMiddleware } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants";
import { ConfigService } from "@nestjs/config";
import { ResilocIndicatorsController } from "../resiloc-indicators/resiloc-indicators.controller";
import { ResilocProxiesController } from "../resiloc-proxies/resiloc-proxies.controller";
import { UserOrderingOption } from "../users/enum/user-ordering-options.enum";

@Injectable()
export class GetRequestMiddleware implements NestMiddleware {
    constructor(
        private readonly configService: ConfigService,
    ) { }

    use(req: any, res: any, next: () => void) {
        req.query.page = +req.query.page || this.configService.get<number>('pagination.page');
        req.query.limit = +req.query.limit || this.configService.get<number>('pagination.limit');
        req.query.orderBy = req.query.orderBy || this.configService.get<UserOrderingOption>('pagination.orderBy');
        req.query.arrange = req.query.arrange || this.configService.get<string>('pagination.arrange');

        if (req.url.split('/')[1] == Reflect.getMetadata(PATH_METADATA, ResilocProxiesController)) {
            req.query.status = req.query.status || this.configService.get<string>('query.requested_proxy_status');
        } else if (req.url.split('/')[1] == Reflect.getMetadata(PATH_METADATA, ResilocIndicatorsController)) {
            req.query.status = req.query.status || this.configService.get<string>('query.requested_indicator_status');
        }

        next();
    }
}