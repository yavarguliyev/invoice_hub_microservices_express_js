import { Get, JsonController, Post } from 'routing-controllers';
import { createVersionedRoute, ContainerHelper } from '@invoice-hub/common-packages';

import { ContainerItems } from 'application/ioc/static/container-items';
import { IAuthService } from 'application/services/auth.service';

@JsonController(createVersionedRoute({ controllerPath: '/auth', version: 'v1' }))
export class AuthController {
  private authService: IAuthService;

  constructor () {
    this.authService = ContainerHelper.get<IAuthService>(ContainerItems.IAuthService);
  }

  @Get('/')
  async get () {
    return await this.authService.get();
  }

  @Post('/signin')
  async signin () {
    return await this.authService.signin();
  }

  @Post('/signup')
  async signup () {
    return await this.authService.signup();
  }
}
