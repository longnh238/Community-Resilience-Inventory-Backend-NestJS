import { Test, TestingModule } from '@nestjs/testing';
import { MailingsService } from './mailings.service';

describe('MailingsService', () => {
  let service: MailingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailingsService],
    }).compile();

    service = module.get<MailingsService>(MailingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
