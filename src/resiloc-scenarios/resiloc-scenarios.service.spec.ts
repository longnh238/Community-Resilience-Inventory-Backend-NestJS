import { Test, TestingModule } from '@nestjs/testing';
import { ResilocScenariosService } from './resiloc-scenarios.service';

describe('ResilocScenariosService', () => {
  let service: ResilocScenariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResilocScenariosService],
    }).compile();

    service = module.get<ResilocScenariosService>(ResilocScenariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
