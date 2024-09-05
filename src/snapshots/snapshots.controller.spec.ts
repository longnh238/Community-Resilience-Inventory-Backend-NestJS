import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsController } from './snapshots.controller';

describe('SnapshotsController', () => {
  let controller: SnapshotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnapshotsController],
    }).compile();

    controller = module.get<SnapshotsController>(SnapshotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
