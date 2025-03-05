import { Repository, EntityRepository } from 'typeorm';

import { Invoice } from 'domain/entities/invoice.entity';

@EntityRepository(Invoice)
export class InvoiceRepository extends Repository<Invoice> {};
