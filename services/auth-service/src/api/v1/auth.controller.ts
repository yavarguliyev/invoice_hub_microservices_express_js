import { Body, Get, HeaderParam, JsonController, Post } from 'routing-controllers';
import { createVersionedRoute, ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IAuthService } from 'application/services/auth.service';
import { SigninArgs } from 'core/inputs/signin.args';

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
  async signin (@Body() args: SigninArgs) {
    return await this.authService.signin(args);
  }

  @Post('/signout')
  async signout (@HeaderParam('authorization') accesToken: string) {
    return await this.authService.signout(accesToken);
  }
}
