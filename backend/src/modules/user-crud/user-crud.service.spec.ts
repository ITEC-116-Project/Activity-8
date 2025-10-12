import { Test, TestingModule } from '@nestjs/testing';
import { UserCrudService } from './user-crud.service';

describe('UserCrudService', () => {
  let service: UserCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCrudService],
    }).compile();

    service = module.get<UserCrudService>(UserCrudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
