import { Test, TestingModule } from '@nestjs/testing';
import { ResilocIndicatorsController } from './resiloc-indicators.controller';

describe('ResilocIndicatorsController', () => {
  let controller: ResilocIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResilocIndicatorsController],
    }).compile();

    controller = module.get<ResilocIndicatorsController>(ResilocIndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
