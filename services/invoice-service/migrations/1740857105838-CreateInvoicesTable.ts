import { Service } from 'typedi';
import { MigrationInterface, QueryRunner } from 'typeorm';

@Service()
export class CreateInvoicesTable1740857105838 implements MigrationInterface {
    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "invoices" (
            "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "order_id" UUID NOT NULL,
            "user_id" UUID NOT NULL,
            "title" VARCHAR(255) NOT NULL,
            "amount" DECIMAL(10,2) NOT NULL,
            "description" VARCHAR(500),
            "status" VARCHAR(64) NOT NULL,
            "pdf_url" TEXT,
            "created_at" TIMESTAMP DEFAULT NOW(),
            "updated_at" TIMESTAMP DEFAULT NOW()
          );
        `);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "invoices"');
    }
}
