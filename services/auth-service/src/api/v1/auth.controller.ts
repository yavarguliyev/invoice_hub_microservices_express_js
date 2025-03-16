import { Body, HeaderParam, JsonController, Post } from 'routing-controllers';
import { createVersionedRoute, ContainerHelper, ContainerItems, SigninArgs } from '@invoice-hub/common';

import { IAuthService } from 'application/services/auth.service';

@JsonController(createVersionedRoute({ controllerPath: '/auth', version: 'v1' }))
export class AuthController {
  private _authService: IAuthService;

  private get authService (): IAuthService {
    if (!this._authService) {
      this._authService = ContainerHelper.get<IAuthService>(ContainerItems.IAuthService);
    }

    return this._authService;
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
