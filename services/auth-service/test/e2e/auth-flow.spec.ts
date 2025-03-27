import { Container } from 'typedi';
import { DeepPartial } from 'typeorm';
import { compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ContainerHelper, ContainerItems, SigninArgs, Roles } from '@invoice-hub/common';

import { AuthService } from '../../src/application/services/auth.service';
import { UserService } from '../../src/application/services/user.service';
import { UserRepository } from '../../src/domain/repositories/user.repository';
import { RoleRepository } from '../../src/domain/repositories/role.repository';
import { User } from '../../src/domain/entities/user.entity';
import { Role } from '../../src/domain/entities/role.entity';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Authentication Flow (E2E)', () => {
  let authService: AuthService;
  let userService: UserService;

  let mockUserRepository: jest.Mocked<Pick<UserRepository, 'findOne' | 'find' | 'save' | 'create'>>;
  let mockRoleRepository: jest.Mocked<Pick<RoleRepository, 'findOne' | 'find'>>;

  let testUser: User;
  let adminRole: Role;
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    };

    mockRoleRepository = {
      findOne: jest.fn(),
      find: jest.fn()
    };

    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

    (jwt.verify as jest.Mock).mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    (compare as jest.Mock).mockResolvedValue(true);

    const roleData: DeepPartial<Role> = {
      id: '1',
      name: Roles.Admin,
      users: []
    };

    adminRole = roleData as Role;

    const userData: DeepPartial<User> = {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'hashedPassword',
      hashPassword: jest.fn()
    };

    testUser = userData as User;

    jest.spyOn(Container, 'get').mockImplementation((token) => {
      if (token === UserRepository) {
        return mockUserRepository;
      }

      if (token === RoleRepository) {
        return mockRoleRepository;
      }

      return {};
    });

    authService = new AuthService();
    userService = new UserService();

    jest.spyOn(ContainerHelper, 'get').mockImplementation((token) => {
      if (token === ContainerItems.IAuthService) {
        return authService;
      }

      if (token === ContainerItems.IUserService) {
        return userService;
      }

      return {};
    });
  });

  it('should complete full authentication flow', async () => {
    mockUserRepository.findOne.mockResolvedValue(testUser);

    const signinArgs: SigninArgs = {
      email: 'admin@example.com',
      password: 'adminpass'
    };

    const loginResponse = await authService.signin(signinArgs);

    expect(loginResponse).toHaveProperty('accessToken');
    expect(loginResponse.accessToken).toBe('mock-jwt-token');
    expect(loginResponse).toHaveProperty('payload');
    expect(loginResponse.payload).toHaveProperty('currentUser');

    authToken = loginResponse.accessToken;

    const signoutResult = await authService.signout(`Bearer ${authToken}`);
    expect(signoutResult).toBe(true);
  });
});
