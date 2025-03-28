import { ContainerHelper, ContainerItems } from '@invoice-hub/common';

import { IAuthService } from 'application/services/auth.service';
import { IRoleService } from 'application/services/role.service';
import { IUserService } from 'application/services/user.service';

export abstract class BaseController {
  private _authService: IAuthService;
  private _roleService: IRoleService;
  private _userService: IUserService;

  protected get authService (): IAuthService {
    if (!this._authService) {
      this._authService = ContainerHelper.get<IAuthService>(ContainerItems.IAuthService);
    }

    return this._authService;
  }

  protected get roleService (): IRoleService {
    if (!this._roleService) {
      this._roleService = ContainerHelper.get<IRoleService>(ContainerItems.IRoleService);
    }

    return this._roleService;
  }

  protected get userService (): IUserService {
    if (!this._userService) {
      this._userService = ContainerHelper.get<IUserService>(ContainerItems.IUserService);
    }

    return this._userService;
  }
}
