import { Test, TestingModule } from '@nestjs/testing';
import { ResilocProxiesController } from './resiloc-proxies.controller';

describe('ResilocProxiesController', () => {
  let controller: ResilocProxiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResilocProxiesController],
    }).compile();

    controller = module.get<ResilocProxiesController>(ResilocProxiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
