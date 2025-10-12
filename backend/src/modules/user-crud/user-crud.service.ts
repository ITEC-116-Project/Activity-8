import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../typeorm/entities/users';

@Injectable()
export class UserCrudService {
  constructor(
    @InjectRepository(User) // Inject the repository for User entity
    private userRepository: Repository<User>,
  ) {}

  findAll() {
    return this.userRepository.find(); // fetch all users from DB
  }
}
