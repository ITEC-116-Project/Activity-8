import { Repository } from 'typeorm';
import { User } from '../../typeorm/entities/users';
export declare class UserCrudService {
    private userRepository;
    constructor(userRepository: Repository<User>);
    findAll(): Promise<User[]>;
}
