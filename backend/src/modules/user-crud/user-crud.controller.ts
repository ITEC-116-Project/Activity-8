import { Controller, Get } from '@nestjs/common';
import { UserCrudService } from './user-crud.service';

@Controller('user-crud')
export class UserCrudController {
  constructor(private readonly userCrudService: UserCrudService) {}

  @Get()
  findAll() {
    return this.userCrudService.findAll(); // fetch all users
  }
}
