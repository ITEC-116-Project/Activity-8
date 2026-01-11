import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCrudModule } from './modules/user-crud/user-crud.module';
import { AuthModule } from './Auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';  // 👈 Add modules/ prefix
import { MessagesModule } from './modules/messages/messages.module';  // 👈 Add modules/ prefix

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    UserCrudModule,
    AuthModule,
    RoomsModule,
    MessagesModule,
  ],
})
export class AppModule {}