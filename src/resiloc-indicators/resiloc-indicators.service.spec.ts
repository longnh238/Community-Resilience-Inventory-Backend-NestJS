import { Test, TestingModule } from '@nestjs/testing';
import { ResilocIndicatorsService } from './resiloc-indicators.service';

describe('ResilocIndicatorsService', () => {
  let service: ResilocIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResilocIndicatorsService],
    }).compile();

    service = module.get<ResilocIndicatorsService>(ResilocIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
