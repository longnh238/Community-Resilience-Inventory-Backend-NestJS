import { Test, TestingModule } from '@nestjs/testing';
import { ResilocScenariosController } from './resiloc-scenarios.controller';

describe('ResilocScenariosController', () => {
  let controller: ResilocScenariosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResilocScenariosController],
    }).compile();

    controller = module.get<ResilocScenariosController>(ResilocScenariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
