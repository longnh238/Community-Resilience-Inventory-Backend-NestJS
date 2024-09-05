import { Test, TestingModule } from '@nestjs/testing';
import { OpenDataController } from './open-data.controller';

describe('OpenDataController', () => {
  let controller: OpenDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenDataController],
    }).compile();

    controller = module.get<OpenDataController>(OpenDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
