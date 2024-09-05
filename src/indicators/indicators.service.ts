import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpersService } from '../helpers/helpers.service';
import { ResilocIndicatorsService } from '../resiloc-indicators/resiloc-indicators.service';
import { StaticProxyType } from '../static-proxies/enum/static-proxy-type.enum';
import { StaticProxyVisibility } from '../static-proxies/enum/static-proxy-visibility.enum';
import { StaticProxiesService } from '../static-proxies/static-proxies.service';
import { Indicator } from './entities/indicator.entity';
import { IndicatorVisibility } from './enum/indicator-visibility.enum';

@Injectable()
export class IndicatorsService {
     constructor(
          @InjectRepository(Indicator) private readonly indicatorRepository: Repository<Indicator>,
          @Inject(forwardRef(() => ResilocIndicatorsService)) private readonly resilocIndicatorsService: ResilocIndicatorsService,
          @Inject(forwardRef(() => StaticProxiesService)) private readonly staticProxiesService: StaticProxiesService,
          private readonly helpersService: HelpersService
     ) { }

     async create(resilocIndicatorId: string): Promise<Indicator> {
          const resilocIndicator = await this.resilocIndicatorsService.findOne(resilocIndicatorId);
          if (resilocIndicator) {
               const indicator = new Indicator();
               indicator.resilocIndicator = resilocIndicator;
               indicator.visibility = resilocIndicator.visibility as String as IndicatorVisibility;

               let staticProxies = [];
               const resilocProxies = resilocIndicator.resilocProxies;
               for (let resilocProxy of resilocProxies) {
                    const staticProxy = await this.staticProxiesService.create(resilocProxy._id, StaticProxyType.ProxyOfIndicator, resilocProxy.visibility as String as StaticProxyVisibility);
                    staticProxies.push(staticProxy);
               }
               indicator.staticProxies = staticProxies;

               return await this.indicatorRepository.save(
                    this.indicatorRepository.create(indicator)
               );
          } else {
               throw new BadRequestException(`Resiloc indicator ${resilocIndicatorId} does not exist`);
          }
     }

     async remove(id: string): Promise<boolean> {
          const indicator = await this.findOne(id);
          if (indicator) {
               await this.indicatorRepository.delete(id);
               return true;
          } else {
               throw new BadRequestException(`Indicator ${id} does not exist`);
          }
     }

     async findOne(id: string): Promise<Indicator> {
          return await this.indicatorRepository.findOne(id, {
               join: {
                    alias: "indicator",
                    leftJoinAndSelect: {
                         "static_proxy": "indicator.staticProxies",
                         "static_proxy_metadata": "static_proxy.metadata",
                    }
               }
          });
     }

     async isResilocIndicatorBeingUsedByCommunities(resilocIndicatorId: string): Promise<boolean> {
          const indicator = await this.indicatorRepository.createQueryBuilder('indicator')
               .where('indicator.resilocIndicator IN (:...resilocIndicator)', { resilocIndicator: [resilocIndicatorId] })
               .getMany();
          let isBeingUsed = false;
          if (indicator != undefined && indicator.length != 0) {
               isBeingUsed = true;
          }
          return isBeingUsed;
     }
}
