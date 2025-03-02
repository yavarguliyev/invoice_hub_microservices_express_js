import { Repository, EntityRepository } from 'typeorm';

import Permission from 'domain/entities/permission.entity';

@EntityRepository(Permission)
export class PermissionRepository extends Repository<Permission> {};
