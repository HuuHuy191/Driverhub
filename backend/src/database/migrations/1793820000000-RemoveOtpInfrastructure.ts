import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOtpInfrastructure1793820000000 implements MigrationInterface {
  name = 'RemoveOtpInfrastructure1793820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IX_Otp_Lookup" ON "OtpCode"`);
    await queryRunner.query(`DROP TABLE "OtpCode"`);
    await queryRunner.query(
      `DELETE FROM "SystemConfig" WHERE "key" IN ('OTP_EXPIRY_MINUTES', 'OTP_MAX_ATTEMPTS', 'OTP_RESEND_COOLDOWN_SECONDS')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "OtpCode" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_4e5d67b726f57f2c3bf6f62acf9" DEFAULT NEWSEQUENTIALID(), "email" varchar(255) NOT NULL, "codeHash" varchar(255) NOT NULL, "purpose" varchar(20) NOT NULL, "expiresAt" datetime2(3) NOT NULL, "isUsed" bit NOT NULL CONSTRAINT "DF_64125a49402020612882904db0a" DEFAULT 0, "attemptCount" int NOT NULL CONSTRAINT "DF_f807f950599c37b352cd9cf1c1c" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_5b3287acccb29c7eaf0fe0e9fc5" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_Otp_Purpose" CHECK ("purpose" IN ('REGISTER','RESET_PASSWORD')), CONSTRAINT "PK_4e5d67b726f57f2c3bf6f62acf9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_Otp_Lookup" ON "OtpCode" ("email", "purpose", "isUsed", "expiresAt")`,
    );
    await queryRunner.query(
      `INSERT INTO "SystemConfig" ("key", "value", "dataType", "description") SELECT 'OTP_EXPIRY_MINUTES', '5', 'NUMBER', N'Thời gian sống của mã OTP' WHERE NOT EXISTS (SELECT 1 FROM "SystemConfig" WHERE "key" = 'OTP_EXPIRY_MINUTES')`,
    );
    await queryRunner.query(
      `INSERT INTO "SystemConfig" ("key", "value", "dataType", "description") SELECT 'OTP_MAX_ATTEMPTS', '5', 'NUMBER', N'Số lần nhập sai OTP tối đa' WHERE NOT EXISTS (SELECT 1 FROM "SystemConfig" WHERE "key" = 'OTP_MAX_ATTEMPTS')`,
    );
    await queryRunner.query(
      `INSERT INTO "SystemConfig" ("key", "value", "dataType", "description") SELECT 'OTP_RESEND_COOLDOWN_SECONDS', '60', 'NUMBER', N'Khoảng chờ gửi lại OTP' WHERE NOT EXISTS (SELECT 1 FROM "SystemConfig" WHERE "key" = 'OTP_RESEND_COOLDOWN_SECONDS')`,
    );
  }
}
