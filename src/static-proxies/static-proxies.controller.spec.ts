import { Test, TestingModule } from '@nestjs/testing';
import { StaticProxiesController } from './static-proxies.controller';

describe('StaticProxiesController', () => {
  let controller: StaticProxiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaticProxiesController],
    }).compile();

    controller = module.get<StaticProxiesController>(StaticProxiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
