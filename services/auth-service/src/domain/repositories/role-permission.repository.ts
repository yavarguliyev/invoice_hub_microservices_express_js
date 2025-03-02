import { Repository, EntityRepository } from 'typeorm';

import RolePermission from 'domain/entities/role-permission.entity';

@EntityRepository(RolePermission)
export class RolePermissionRepository extends Repository<RolePermission> {};
