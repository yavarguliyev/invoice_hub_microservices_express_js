import { Entity } from 'typeorm';
import { BaseEntity } from '@invoice-hub/common-packages';

import { Entities } from 'domain/enums/entities.enum';

@Entity(Entities.ROLE)
export default class Role extends BaseEntity {}
