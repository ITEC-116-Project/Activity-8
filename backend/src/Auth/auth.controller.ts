import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() body: { username: string; password: string }) {
    return this.authService.signup(body.username, body.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  // Keep the old simple login endpoint for backward compatibility (optional)
  @Post('simple-login')
  @HttpCode(HttpStatus.OK)
  simpleLogin(@Body() loginDto: LoginDto) {
    return this.authService.simpleLogin(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto.userId);
  }
}