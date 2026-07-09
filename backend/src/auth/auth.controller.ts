import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Throttled on the route rather than the controller: `GET /auth/me` runs on
   * every app boot and must not share a budget with guess attempts.
   */
  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<{ token: string; user: AuthUser }> {
    return this.auth.login(dto.email, dto.password);
  }

  /** Lets the client confirm a stored token is still valid on boot. */
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
