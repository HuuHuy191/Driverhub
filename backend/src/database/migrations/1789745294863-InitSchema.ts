import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1789745294863 implements MigrationInterface {
    name = 'InitSchema1789745294863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "User" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_9862f679340fb2388436a5ab3e4" DEFAULT NEWSEQUENTIALID(), "email" varchar(255) NOT NULL, "passwordHash" varchar(255) NOT NULL, "role" varchar(20) NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_e99721daeabe7943e43b1dfac06" DEFAULT 'PENDING', "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_44d12a3355d90f16aa83daa35d4" DEFAULT SYSUTCDATETIME(), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_d6c6506bfc576233e6a5c518073" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_User_Email" UNIQUE ("email"), CONSTRAINT "CK_User_Status" CHECK ("status" IN ('PENDING','ACTIVE','LOCKED')), CONSTRAINT "CK_User_Role" CHECK ("role" IN ('ADMIN','DRIVER')), CONSTRAINT "PK_9862f679340fb2388436a5ab3e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Wallet" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_8828fa4047435abf9287ff0e89e" DEFAULT NEWSEQUENTIALID(), "userId" uniqueidentifier NOT NULL, "balance" decimal(18,0) NOT NULL CONSTRAINT "DF_80402585304b21225c548acafcc" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_0dd82680608ba18c1eb6b97cb10" DEFAULT SYSUTCDATETIME(), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_3767f38f0b3da6d082f9ba40941" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_W_User" UNIQUE ("userId"), CONSTRAINT "PK_8828fa4047435abf9287ff0e89e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_2f7aa51d6746fc8fc8ed63ddfb" ON "Wallet" ("userId") WHERE "userId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "Customer" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_60596e16740e1fa20dbf0154ec7" DEFAULT NEWSEQUENTIALID(), "fullName" nvarchar(150) NOT NULL, "phoneNumber" varchar(15) NOT NULL, "avatarUrl" varchar(500), "note" nvarchar(500), "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_7aeede423785c7a9a8d2426ea10" DEFAULT SYSUTCDATETIME(), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_81d42a9858670f2adec07f73d51" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_C_Phone" UNIQUE ("phoneNumber"), CONSTRAINT "PK_60596e16740e1fa20dbf0154ec7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "DriverDocument" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_cd13d930570effb709d7cde07f3" DEFAULT NEWSEQUENTIALID(), "driverId" uniqueidentifier NOT NULL, "docType" varchar(30) NOT NULL, "fileUrl" varchar(500) NOT NULL, "verificationStatus" varchar(20) NOT NULL CONSTRAINT "DF_4b0e6115d8c6a372d2bf397174b" DEFAULT 'PENDING', "rejectReason" nvarchar(500), "uploadedAt" datetime2(3) NOT NULL CONSTRAINT "DF_7938e8e202d2b2e497958bf2e33" DEFAULT SYSUTCDATETIME(), "verifiedAt" datetime2(3), CONSTRAINT "UQ_DD_Driver_Type" UNIQUE ("driverId", "docType"), CONSTRAINT "CK_DD_Status" CHECK ("verificationStatus" IN ('PENDING','APPROVED','REJECTED')), CONSTRAINT "CK_DD_Type" CHECK ("docType" IN ('ID_CARD_FRONT','ID_CARD_BACK','DRIVER_LICENSE','VEHICLE_REGISTRATION')), CONSTRAINT "PK_cd13d930570effb709d7cde07f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Vehicle" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_7124b1b9d8e76a0a3dcfc7ed98d" DEFAULT NEWSEQUENTIALID(), "driverId" uniqueidentifier NOT NULL, "vehicleType" varchar(20) NOT NULL, "brand" nvarchar(100) NOT NULL, "modelName" nvarchar(100) NOT NULL, "licensePlate" varchar(20) NOT NULL, "color" nvarchar(50), "isActive" bit NOT NULL CONSTRAINT "DF_3de74d59312defd849f861560e1" DEFAULT 1, "verificationStatus" varchar(20) NOT NULL CONSTRAINT "DF_7e0e3147e107af508ff1fc9adaf" DEFAULT 'PENDING', "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_8d79467c8022dde6f13e1ca2387" DEFAULT SYSUTCDATETIME(), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_f480b63703e46b28b6be6ffb394" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_V_Plate" UNIQUE ("licensePlate"), CONSTRAINT "CK_V_Status" CHECK ("verificationStatus" IN ('PENDING','APPROVED','REJECTED')), CONSTRAINT "CK_V_Type" CHECK ("vehicleType" IN ('MOTORBIKE','CAR')), CONSTRAINT "PK_7124b1b9d8e76a0a3dcfc7ed98d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UX_Vehicle_ActivePerDriver" ON "Vehicle" ("driverId") WHERE "isActive" = 1`);
        await queryRunner.query(`CREATE TABLE "DriverProfile" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_ccaadbfd6fd3a0337f9aa05b5df" DEFAULT NEWSEQUENTIALID(), "userId" uniqueidentifier NOT NULL, "fullName" nvarchar(150) NOT NULL, "phoneNumber" varchar(15) NOT NULL, "dateOfBirth" date, "avatarUrl" varchar(500), "temporaryAddress" nvarchar(500), "approvalStatus" varchar(20) NOT NULL CONSTRAINT "DF_a264a50d591481ab10d3f8227fb" DEFAULT 'PENDING', "rejectReason" nvarchar(500), "approvedAt" datetime2(3), "approvedBy" uniqueidentifier, "isOnline" bit NOT NULL CONSTRAINT "DF_c34742085f2062e7af5591811ff" DEFAULT 0, "currentLatitude" decimal(10,7), "currentLongitude" decimal(10,7), "lastLocationUpdatedAt" datetime2(3), "totalRides" int NOT NULL CONSTRAINT "DF_f21530c4d92495cf45c35b913f7" DEFAULT 0, "cancelCount" int NOT NULL CONSTRAINT "DF_f82055e7bb6e2f40ed86ce27b9b" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_3117f8d5a0cce8ccf8cefc31ba3" DEFAULT SYSUTCDATETIME(), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_4055415240db3007cb94ef9afcf" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_DP_Phone" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_DP_User" UNIQUE ("userId"), CONSTRAINT "CK_DP_Lng" CHECK ("currentLongitude" IS NULL OR "currentLongitude" BETWEEN -180 AND 180), CONSTRAINT "CK_DP_Lat" CHECK ("currentLatitude" IS NULL OR "currentLatitude" BETWEEN -90 AND 90), CONSTRAINT "CK_DP_RejectReason" CHECK ("approvalStatus" <> 'REJECTED' OR "rejectReason" IS NOT NULL), CONSTRAINT "CK_DP_Approval" CHECK ("approvalStatus" IN ('PENDING','APPROVED','REJECTED')), CONSTRAINT "PK_ccaadbfd6fd3a0337f9aa05b5df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_e7db5ea435f8ad7ed3dabfec18" ON "DriverProfile" ("userId") WHERE "userId" IS NOT NULL`);
        // DATABASE.md mục 5 — bổ sung thủ công: TypeORM không tự sinh được từ
        // entity vì có INCLUDE (covering index) / sắp DESC, không có decorator tương ứng.
        await queryRunner.query(`CREATE INDEX "IX_DP_Dispatch" ON "DriverProfile" ("isOnline", "approvalStatus", "lastLocationUpdatedAt") INCLUDE ("currentLatitude", "currentLongitude", "fullName", "phoneNumber")`);
        await queryRunner.query(`CREATE INDEX "IX_DP_Approval" ON "DriverProfile" ("approvalStatus", "createdAt" DESC)`);
        await queryRunner.query(`CREATE TABLE "Ride" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_28a13915f0079450ef8da0b3e6c" DEFAULT NEWSEQUENTIALID(), "rideCode" varchar(20) NOT NULL, "customerId" uniqueidentifier NOT NULL, "driverId" uniqueidentifier, "vehicleId" uniqueidentifier, "pickupAddress" nvarchar(500) NOT NULL, "pickupLatitude" decimal(10,7) NOT NULL, "pickupLongitude" decimal(10,7) NOT NULL, "dropoffAddress" nvarchar(500) NOT NULL, "dropoffLatitude" decimal(10,7) NOT NULL, "dropoffLongitude" decimal(10,7) NOT NULL, "vehicleType" varchar(20) NOT NULL, "distanceKm" decimal(8,2) NOT NULL, "estimatedDurationMinutes" int, "estimatedFare" decimal(18,0) NOT NULL, "finalFare" decimal(18,0), "commissionRate" decimal(5,4), "platformFee" decimal(18,0), "driverEarning" decimal(18,0), "paymentMethod" varchar(20) NOT NULL CONSTRAINT "DF_99e16545b58ff2183641f5d354a" DEFAULT 'CASH', "status" varchar(30) NOT NULL CONSTRAINT "DF_ddf59aa52911ea1b6344666fcb4" DEFAULT 'SEARCHING', "dispatchRound" int NOT NULL CONSTRAINT "DF_c0f67808d1c1b8f64a919471789" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_cc43195f9ddec912a9cc61180bc" DEFAULT SYSUTCDATETIME(), "acceptedAt" datetime2(3), "arrivedAt" datetime2(3), "startedAt" datetime2(3), "completedAt" datetime2(3), "cancelledAt" datetime2(3), "cancelledBy" varchar(20), "cancelReason" nvarchar(500), "createdBy" uniqueidentifier NOT NULL, "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_85b613146a0fd6e40d2dc318400" DEFAULT SYSUTCDATETIME(), CONSTRAINT "UQ_R_Code" UNIQUE ("rideCode"), CONSTRAINT "CK_R_CancelInfo" CHECK ("status" <> 'CANCELLED' OR ("cancelReason" IS NOT NULL AND "cancelledBy" IS NOT NULL)), CONSTRAINT "CK_R_Settled" CHECK ("status" <> 'COMPLETED' OR ("finalFare" IS NOT NULL AND "commissionRate" IS NOT NULL AND "platformFee" IS NOT NULL AND "driverEarning" IS NOT NULL)), CONSTRAINT "CK_R_DriverRequired" CHECK ("status" IN ('SEARCHING','CANCELLED','NO_DRIVER_FOUND') OR "driverId" IS NOT NULL), CONSTRAINT "CK_R_Distance" CHECK ("distanceKm" > 0), CONSTRAINT "CK_R_Fare" CHECK ("estimatedFare" > 0), CONSTRAINT "CK_R_CancelledBy" CHECK ("cancelledBy" IS NULL OR "cancelledBy" IN ('ADMIN','DRIVER','SYSTEM')), CONSTRAINT "CK_R_Payment" CHECK ("paymentMethod" IN ('CASH','WALLET')), CONSTRAINT "CK_R_VehicleType" CHECK ("vehicleType" IN ('MOTORBIKE','CAR')), CONSTRAINT "CK_R_Status" CHECK ("status" IN ('SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','NO_DRIVER_FOUND')), CONSTRAINT "PK_28a13915f0079450ef8da0b3e6c" PRIMARY KEY ("id"))`);
        // DATABASE.md mục 5 — bổ sung thủ công (covering index / DESC / filtered)
        await queryRunner.query(`CREATE INDEX "IX_Ride_DriverActive" ON "Ride" ("driverId", "status") INCLUDE ("rideCode", "pickupAddress", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IX_Ride_StatusCreated" ON "Ride" ("status", "createdAt" DESC)`);
        await queryRunner.query(`CREATE INDEX "IX_Ride_Completed" ON "Ride" ("completedAt") INCLUDE ("finalFare", "platformFee", "driverEarning", "driverId") WHERE "status" = 'COMPLETED'`);
        await queryRunner.query(`CREATE TABLE "WalletTransaction" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_cbea41938cdca665879d9c96102" DEFAULT NEWSEQUENTIALID(), "walletId" uniqueidentifier NOT NULL, "rideId" uniqueidentifier, "type" varchar(30) NOT NULL, "direction" varchar(10) NOT NULL, "amount" decimal(18,0) NOT NULL, "balanceAfter" decimal(18,0) NOT NULL, "description" nvarchar(500) NOT NULL, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_805077072e7ff64a0cdfb3ea52d" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_WT_Amount" CHECK ("amount" > 0), CONSTRAINT "CK_WT_Direction" CHECK ("direction" IN ('CREDIT','DEBIT')), CONSTRAINT "CK_WT_Type" CHECK ("type" IN ('COMMISSION_FEE','COMMISSION_INCOME','RIDE_EARNING','TOPUP','WITHDRAW','ADJUSTMENT')), CONSTRAINT "PK_cbea41938cdca665879d9c96102" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_WT_Ride" ON "WalletTransaction" ("rideId") `);
        await queryRunner.query(`CREATE INDEX "IX_WT_Wallet" ON "WalletTransaction" ("walletId", "createdAt") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UX_WT_Ride_Type" ON "WalletTransaction" ("rideId", "type") WHERE "rideId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "TopUpRequest" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_87f4e260938900f4b609fc69d67" DEFAULT NEWSEQUENTIALID(), "driverId" uniqueidentifier NOT NULL, "amount" decimal(18,0) NOT NULL, "receiptUrl" varchar(500), "status" varchar(20) NOT NULL CONSTRAINT "DF_13aafa80fca3b32a295fc95164c" DEFAULT 'PENDING', "rejectReason" nvarchar(500), "reviewedBy" uniqueidentifier, "reviewedAt" datetime2(3), "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_ca682bb29f9a376713e6753d9b2" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_TU_Amount" CHECK ("amount" BETWEEN 20000 AND 5000000), CONSTRAINT "CK_TU_Status" CHECK ("status" IN ('PENDING','APPROVED','REJECTED')), CONSTRAINT "PK_87f4e260938900f4b609fc69d67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UX_TopUp_PendingPerDriver" ON "TopUpRequest" ("driverId") WHERE "status" = 'PENDING'`);
        await queryRunner.query(`CREATE TABLE "RideStatusHistory" ("id" bigint NOT NULL IDENTITY(1,1), "rideId" uniqueidentifier NOT NULL, "fromStatus" varchar(30), "toStatus" varchar(30) NOT NULL, "changedByType" varchar(20) NOT NULL, "changedById" uniqueidentifier, "note" nvarchar(500), "changedAt" datetime2(3) NOT NULL CONSTRAINT "DF_4ca2e7f339db15f7d6e990917b2" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_RSH_By" CHECK ("changedByType" IN ('ADMIN','DRIVER','SYSTEM')), CONSTRAINT "PK_876688f9922cf2e3247ec24ae5a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_RSH_Ride" ON "RideStatusHistory" ("rideId", "changedAt") `);
        await queryRunner.query(`CREATE TABLE "SystemConfig" ("key" varchar(64) NOT NULL, "value" nvarchar(500) NOT NULL, "dataType" varchar(20) NOT NULL CONSTRAINT "DF_f34015d6445f080dfefb93f372c" DEFAULT 'STRING', "description" nvarchar(500), "updatedAt" datetime2(3) NOT NULL CONSTRAINT "DF_7f9905701f8a79570b0693b1399" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_Config_Type" CHECK ("dataType" IN ('STRING','NUMBER','BOOLEAN')), CONSTRAINT "PK_d8d02104b156487130e95960575" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "Notification" ("id" bigint NOT NULL IDENTITY(1,1), "userId" uniqueidentifier NOT NULL, "type" varchar(40) NOT NULL, "title" nvarchar(200) NOT NULL, "body" nvarchar(500) NOT NULL, "dataJson" nvarchar(MAX), "isRead" bit NOT NULL CONSTRAINT "DF_5ae0122e5d2b854a22c469537a8" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_109cfc31eca93365d0846e0bc0a" DEFAULT SYSUTCDATETIME(), CONSTRAINT "PK_da18f6446b6fea585f01d03f56c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_N_User" ON "Notification" ("userId", "isRead", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "RideOffer" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_2e324a83a4f7c6c4c10b978557e" DEFAULT NEWSEQUENTIALID(), "rideId" uniqueidentifier NOT NULL, "driverId" uniqueidentifier NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_32fe9bea4776203ad6324f088d9" DEFAULT 'SENT', "round" int NOT NULL CONSTRAINT "DF_940386a4b0997ff5c062b8832de" DEFAULT 1, "distanceKm" decimal(8,2), "offeredAt" datetime2(3) NOT NULL CONSTRAINT "DF_b5cf652b28434d1cdf3792b2818" DEFAULT SYSUTCDATETIME(), "viewedAt" datetime2(3), "respondedAt" datetime2(3), "expiredAt" datetime2(3) NOT NULL, CONSTRAINT "UQ_RideOffer_Ride_Driver" UNIQUE ("rideId", "driverId"), CONSTRAINT "CK_RO_Status" CHECK ("status" IN ('SENT','VIEWED','ACCEPTED','IGNORED','EXPIRED','LOST')), CONSTRAINT "PK_2e324a83a4f7c6c4c10b978557e" PRIMARY KEY ("id"))`);
        // DATABASE.md mục 5 — bổ sung thủ công (filtered / DESC)
        await queryRunner.query(`CREATE INDEX "IX_RO_Expiry" ON "RideOffer" ("expiredAt", "status") WHERE "status" IN ('SENT','VIEWED')`);
        await queryRunner.query(`CREATE INDEX "IX_RO_Driver" ON "RideOffer" ("driverId", "status", "offeredAt" DESC)`);
        await queryRunner.query(`CREATE TABLE "OtpCode" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_4e5d67b726f57f2c3bf6f62acf9" DEFAULT NEWSEQUENTIALID(), "email" varchar(255) NOT NULL, "codeHash" varchar(255) NOT NULL, "purpose" varchar(20) NOT NULL, "expiresAt" datetime2(3) NOT NULL, "isUsed" bit NOT NULL CONSTRAINT "DF_64125a49402020612882904db0a" DEFAULT 0, "attemptCount" int NOT NULL CONSTRAINT "DF_f807f950599c37b352cd9cf1c1c" DEFAULT 0, "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_5b3287acccb29c7eaf0fe0e9fc5" DEFAULT SYSUTCDATETIME(), CONSTRAINT "CK_Otp_Purpose" CHECK ("purpose" IN ('REGISTER','RESET_PASSWORD')), CONSTRAINT "PK_4e5d67b726f57f2c3bf6f62acf9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_Otp_Lookup" ON "OtpCode" ("email", "purpose", "isUsed", "expiresAt") `);
        await queryRunner.query(`CREATE TABLE "RefreshToken" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_e5efef1572bd829464edc903d19" DEFAULT NEWSEQUENTIALID(), "userId" uniqueidentifier NOT NULL, "tokenHash" varchar(255) NOT NULL, "deviceId" varchar(255), "deviceName" nvarchar(200), "fcmToken" varchar(500), "expiresAt" datetime2(3) NOT NULL, "revokedAt" datetime2(3), "createdAt" datetime2(3) NOT NULL CONSTRAINT "DF_c6130fa5232bd6aeedec08c4c3f" DEFAULT SYSUTCDATETIME(), CONSTRAINT "PK_e5efef1572bd829464edc903d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_RT_Token" ON "RefreshToken" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IX_RT_User" ON "RefreshToken" ("userId", "revokedAt") `);
        await queryRunner.query(`ALTER TABLE "Wallet" ADD CONSTRAINT "FK_W_User" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "DriverDocument" ADD CONSTRAINT "FK_DD_Driver" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Vehicle" ADD CONSTRAINT "FK_V_Driver" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "DriverProfile" ADD CONSTRAINT "FK_DP_User" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "DriverProfile" ADD CONSTRAINT "FK_DP_Approver" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Ride" ADD CONSTRAINT "FK_R_Customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Ride" ADD CONSTRAINT "FK_R_Driver" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Ride" ADD CONSTRAINT "FK_R_Vehicle" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Ride" ADD CONSTRAINT "FK_R_Creator" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "WalletTransaction" ADD CONSTRAINT "FK_WT_Wallet" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "WalletTransaction" ADD CONSTRAINT "FK_WT_Ride" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TopUpRequest" ADD CONSTRAINT "FK_TU_Driver" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "TopUpRequest" ADD CONSTRAINT "FK_TU_Reviewer" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "RideStatusHistory" ADD CONSTRAINT "FK_RSH_Ride" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Notification" ADD CONSTRAINT "FK_N_User" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "RideOffer" ADD CONSTRAINT "FK_RO_Ride" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "RideOffer" ADD CONSTRAINT "FK_RO_Driver" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "RefreshToken" ADD CONSTRAINT "FK_RT_User" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "RefreshToken" DROP CONSTRAINT "FK_RT_User"`);
        await queryRunner.query(`ALTER TABLE "RideOffer" DROP CONSTRAINT "FK_RO_Driver"`);
        await queryRunner.query(`ALTER TABLE "RideOffer" DROP CONSTRAINT "FK_RO_Ride"`);
        await queryRunner.query(`ALTER TABLE "Notification" DROP CONSTRAINT "FK_N_User"`);
        await queryRunner.query(`ALTER TABLE "RideStatusHistory" DROP CONSTRAINT "FK_RSH_Ride"`);
        await queryRunner.query(`ALTER TABLE "TopUpRequest" DROP CONSTRAINT "FK_TU_Reviewer"`);
        await queryRunner.query(`ALTER TABLE "TopUpRequest" DROP CONSTRAINT "FK_TU_Driver"`);
        await queryRunner.query(`ALTER TABLE "WalletTransaction" DROP CONSTRAINT "FK_WT_Ride"`);
        await queryRunner.query(`ALTER TABLE "WalletTransaction" DROP CONSTRAINT "FK_WT_Wallet"`);
        await queryRunner.query(`ALTER TABLE "Ride" DROP CONSTRAINT "FK_R_Creator"`);
        await queryRunner.query(`ALTER TABLE "Ride" DROP CONSTRAINT "FK_R_Vehicle"`);
        await queryRunner.query(`ALTER TABLE "Ride" DROP CONSTRAINT "FK_R_Driver"`);
        await queryRunner.query(`ALTER TABLE "Ride" DROP CONSTRAINT "FK_R_Customer"`);
        await queryRunner.query(`ALTER TABLE "DriverProfile" DROP CONSTRAINT "FK_DP_Approver"`);
        await queryRunner.query(`ALTER TABLE "DriverProfile" DROP CONSTRAINT "FK_DP_User"`);
        await queryRunner.query(`ALTER TABLE "Vehicle" DROP CONSTRAINT "FK_V_Driver"`);
        await queryRunner.query(`ALTER TABLE "DriverDocument" DROP CONSTRAINT "FK_DD_Driver"`);
        await queryRunner.query(`ALTER TABLE "Wallet" DROP CONSTRAINT "FK_W_User"`);
        await queryRunner.query(`DROP INDEX "IX_RT_User" ON "RefreshToken"`);
        await queryRunner.query(`DROP INDEX "IX_RT_Token" ON "RefreshToken"`);
        await queryRunner.query(`DROP TABLE "RefreshToken"`);
        await queryRunner.query(`DROP INDEX "IX_Otp_Lookup" ON "OtpCode"`);
        await queryRunner.query(`DROP TABLE "OtpCode"`);
        await queryRunner.query(`DROP INDEX "IX_RO_Driver" ON "RideOffer"`);
        await queryRunner.query(`DROP INDEX "IX_RO_Expiry" ON "RideOffer"`);
        await queryRunner.query(`DROP TABLE "RideOffer"`);
        await queryRunner.query(`DROP INDEX "IX_N_User" ON "Notification"`);
        await queryRunner.query(`DROP TABLE "Notification"`);
        await queryRunner.query(`DROP TABLE "SystemConfig"`);
        await queryRunner.query(`DROP INDEX "IX_RSH_Ride" ON "RideStatusHistory"`);
        await queryRunner.query(`DROP TABLE "RideStatusHistory"`);
        await queryRunner.query(`DROP INDEX "UX_TopUp_PendingPerDriver" ON "TopUpRequest"`);
        await queryRunner.query(`DROP TABLE "TopUpRequest"`);
        await queryRunner.query(`DROP INDEX "UX_WT_Ride_Type" ON "WalletTransaction"`);
        await queryRunner.query(`DROP INDEX "IX_WT_Wallet" ON "WalletTransaction"`);
        await queryRunner.query(`DROP INDEX "IX_WT_Ride" ON "WalletTransaction"`);
        await queryRunner.query(`DROP TABLE "WalletTransaction"`);
        await queryRunner.query(`DROP INDEX "IX_Ride_Completed" ON "Ride"`);
        await queryRunner.query(`DROP INDEX "IX_Ride_StatusCreated" ON "Ride"`);
        await queryRunner.query(`DROP INDEX "IX_Ride_DriverActive" ON "Ride"`);
        await queryRunner.query(`DROP TABLE "Ride"`);
        await queryRunner.query(`DROP INDEX "IX_DP_Approval" ON "DriverProfile"`);
        await queryRunner.query(`DROP INDEX "IX_DP_Dispatch" ON "DriverProfile"`);
        await queryRunner.query(`DROP INDEX "REL_e7db5ea435f8ad7ed3dabfec18" ON "DriverProfile"`);
        await queryRunner.query(`DROP TABLE "DriverProfile"`);
        await queryRunner.query(`DROP INDEX "UX_Vehicle_ActivePerDriver" ON "Vehicle"`);
        await queryRunner.query(`DROP TABLE "Vehicle"`);
        await queryRunner.query(`DROP TABLE "DriverDocument"`);
        await queryRunner.query(`DROP TABLE "Customer"`);
        await queryRunner.query(`DROP INDEX "REL_2f7aa51d6746fc8fc8ed63ddfb" ON "Wallet"`);
        await queryRunner.query(`DROP TABLE "Wallet"`);
        await queryRunner.query(`DROP TABLE "User"`);
    }

}
