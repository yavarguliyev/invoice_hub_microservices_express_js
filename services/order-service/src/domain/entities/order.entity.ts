import { Entity } from 'typeorm';
import { BaseEntity } from '@invoice-hub/common-packages';

import { Entities } from 'domain/enums/entities.enum';

@Entity(Entities.ORDER)
export default class Order extends BaseEntity {}
