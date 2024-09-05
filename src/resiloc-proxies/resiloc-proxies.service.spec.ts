import { Test, TestingModule } from '@nestjs/testing';
import { ResilocProxiesService } from './resiloc-proxies.service';

describe('ResilocProxiesService', () => {
  let service: ResilocProxiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResilocProxiesService],
    }).compile();

    service = module.get<ResilocProxiesService>(ResilocProxiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
