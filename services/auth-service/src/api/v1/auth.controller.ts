import { Body, HeaderParam, JsonController, Post } from 'routing-controllers';
import { createVersionedRoute, SigninArgs } from '@invoice-hub/common';

import { BaseController } from 'api/base.controller';

@JsonController(createVersionedRoute({ controllerPath: '/auth', version: 'v1' }))
export class AuthController extends BaseController {
  @Post('/signin')
  async signin (@Body() args: SigninArgs) {
    return this.authService.signin(args);
  }

  @Post('/signout')
  async signout (@HeaderParam('authorization') accesToken: string) {
    return this.authService.signout(accesToken);
  }
}
