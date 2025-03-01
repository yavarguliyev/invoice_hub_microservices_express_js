import { Entity } from 'typeorm';
import { BaseEntity } from '@invoice-hub/common-packages';

import { Entities } from 'domain/enums/entities.enum';

@Entity(Entities.ROLE_PERMISSION)
export default class RolePermission extends BaseEntity {}
