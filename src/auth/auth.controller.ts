import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { Request, Response } from 'express'
import { LoginDto } from './dto/login.dto'
import { Recaptcha } from '@nestlab/google-recaptcha'
import { AuthProviderGuard } from './guards/provider.guard'
import { ConfigService } from '@nestjs/config'
import { ProviderService } from './provider/provider.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
  ) {}

  @Recaptcha()
  @Post('register') // декорато с адресом "register", чтоб url был таким /auth/register
  @HttpCode(HttpStatus.OK)
  public async register(@Req() req: Request, @Body() dto: RegisterDto) {
    return this.authService.register(req, dto)
  }

  @Recaptcha()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(req, dto)
  }

  @UseGuards(AuthProviderGuard)
  @Get('/oauth/callback/:provider') // сюда редиректим после успешной авторизации
  public async callback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('code') code: string,
    @Param('provider') provider: string,
  ) {
    if (!code) {
      throw new BadRequestException('Не был предоставлен код авторизации.')
    }

    await this.authService.extractProfileFromCode(req, provider, code)

    return res.redirect(
      `${this.configService.getOrThrow<string>('ALLOWED_ORIGIN')}/dashboard/settings`,
    )
  }

  @UseGuards(AuthProviderGuard)
  @Get('/oauth/connect/:provider')
  public async connect(@Param('provider') provider: string) {
    const providerInstance = this.providerService.findByService(provider)

    return {
      url: providerInstance?.getAuthUrl(),
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // passthrough нужен для доступа к res для возможной модификации ответа + сохранится автоматическая обработка ответов NestJS
  ) {
    return this.authService.logout(req, res)
  }
}
