import { Test, TestingModule } from '@nestjs/testing';
import { UserCrudController } from './user-crud.controller';
import { UserCrudService } from './user-crud.service';

describe('UserCrudController', () => {
  let controller: UserCrudController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCrudController],
      providers: [UserCrudService],
    }).compile();

    controller = module.get<UserCrudController>(UserCrudController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
