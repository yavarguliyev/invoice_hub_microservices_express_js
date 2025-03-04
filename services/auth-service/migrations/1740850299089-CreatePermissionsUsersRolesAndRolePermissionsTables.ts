import { Service } from 'typedi';
import { MigrationInterface, QueryRunner } from 'typeorm';

@Service()
export class CreatePermissionsUsersRolesAndRolePermissionsTables1740850299089 implements MigrationInterface {
    public async up (queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE "roles" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(64) UNIQUE NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW(),
          "deleted_at" TIMESTAMP NULL
        );
      `);

      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "email" VARCHAR(128) UNIQUE NOT NULL,
          "first_name" VARCHAR(128) NOT NULL,
          "last_name" VARCHAR(64) NOT NULL,
          "password" VARCHAR(256) NOT NULL,
          "role_id" UUID NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW(),
          "updated_at" TIMESTAMP DEFAULT NOW(),
          "deleted_at" TIMESTAMP NULL,
          FOREIGN KEY ("role_id") REFERENCES "roles"("id")
        );
      `);

      await queryRunner.query(`
          INSERT INTO "roles" ("id", "name", "created_at", "updated_at") VALUES
            (gen_random_uuid(), 'Global Admin', NOW(), NOW()),
            (gen_random_uuid(), 'Admin', NOW(), NOW()),
            (gen_random_uuid(), 'Contributor', NOW(), NOW()),
            (gen_random_uuid(), 'Standard', NOW(), NOW());
      `);

      await queryRunner.query(`
          INSERT INTO "users" ("id", "email", "first_name", "last_name", "password", "role_id", "created_at", "updated_at") VALUES
            (gen_random_uuid(), 'global_admin@example.com', 'Alice', 'Global Admin', '$2b$10$8OG/d5Uk8h45FtcnhlP33eHknL0NCwYe1FikPbER8gd/YJgKZBm6S',
              (SELECT id FROM "roles" WHERE name = 'Global Admin'), NOW(), NOW()),
            (gen_random_uuid(), 'admin@example.com', 'Bob', 'Admin', '$2b$10$8OG/d5Uk8h45FtcnhlP33eHknL0NCwYe1FikPbER8gd/YJgKZBm6S',
              (SELECT id FROM "roles" WHERE name = 'Admin'), NOW(), NOW()),
            (gen_random_uuid(), 'contributor@example.com', 'Charlie', 'Contributor', '$2b$10$8OG/d5Uk8h45FtcnhlP33eHknL0NCwYe1FikPbER8gd/YJgKZBm6S',
              (SELECT id FROM "roles" WHERE name = 'Contributor'), NOW(), NOW()),
            (gen_random_uuid(), 'standard@example.com', 'Diana', 'Standard', '$2b$10$8OG/d5Uk8h45FtcnhlP33eHknL0NCwYe1FikPbER8gd/YJgKZBm6S',
              (SELECT id FROM "roles" WHERE name = 'Standard'), NOW(), NOW());
      `);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DELETE FROM "users"');
        await queryRunner.query('DELETE FROM "roles"');

        await queryRunner.query('DROP TABLE "users"');
        await queryRunner.query('DROP TABLE "roles"');
    }
}
