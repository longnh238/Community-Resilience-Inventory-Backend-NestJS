import { Test, TestingModule } from '@nestjs/testing';
import { StaticProxiesService } from './static-proxies.service';

describe('StaticProxiesService', () => {
  let service: StaticProxiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticProxiesService],
    }).compile();

    service = module.get<StaticProxiesService>(StaticProxiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
