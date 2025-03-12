import { Column, Entity } from 'typeorm';
import { IsString, Length, IsNumber, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { Entities, InvoiceStatus, BaseEntity } from '@invoice-hub/common';

@Entity(Entities.INVOICE)
export class Invoice extends BaseEntity {
  @Column({ type: 'uuid', name: 'order_id' })
  @IsUUID()
  orderId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @IsUUID()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @Length(1, 255)
  title: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber()
  amount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Column({ type: 'varchar', length: 64 })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @Column({ type: 'text', name: 'pdf_url', nullable: true })
  @IsString()
  @IsOptional()
  pdfUrl?: string;
}
