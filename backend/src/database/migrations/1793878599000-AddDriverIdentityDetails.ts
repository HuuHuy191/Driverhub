import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverIdentityDetails1793878599000 implements MigrationInterface {
  name = 'AddDriverIdentityDetails1793878599000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "DriverProfile"
      ADD "citizenIdNumber" varchar(20) NULL,
          "citizenIdIssueDate" date NULL,
          "driverLicenseNumber" varchar(30) NULL,
          "driverLicenseIssueDate" date NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "DriverProfile"
      DROP COLUMN "driverLicenseIssueDate",
                  "driverLicenseNumber",
                  "citizenIdIssueDate",
                  "citizenIdNumber"
    `);
  }
}
