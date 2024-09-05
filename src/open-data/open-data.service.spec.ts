import { Test, TestingModule } from '@nestjs/testing';
import { OpenDataService } from './open-data.service';

describe('OpenDataService', () => {
  let service: OpenDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenDataService],
    }).compile();

    service = module.get<OpenDataService>(OpenDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
