# DATABASE — Thiết kế cơ sở dữ liệu

> Hệ quản trị: **Microsoft SQL Server 2022**
> Collation: `Vietnamese_CI_AS`
> Toàn bộ chuỗi tiếng Việt dùng `nvarchar`, chuỗi mã/kỹ thuật dùng `varchar`.

---

## 1. Quy ước chung

| Hạng mục           | Quy ước                                                     | Ghi chú                                                                        |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tên bảng           | PascalCase, **số ít**                                       | `DriverProfile`, không phải `driver_profiles`                                  |
| Tên cột            | camelCase                                                   | `approvalStatus`                                                               |
| Khóa chính         | `id`, kiểu `uniqueidentifier`, mặc định `NEWSEQUENTIALID()` | Dùng `NEWSEQUENTIALID()` thay vì `NEWID()` để giảm phân mảnh chỉ mục clustered |
| Khóa ngoại         | `<tênBảngCha>Id`                                            | `driverId` trỏ tới `DriverProfile.id`                                          |
| Thời gian          | `datetime2(3)`, luôn lưu theo **UTC**                       | Client tự đổi sang giờ Việt Nam khi hiển thị                                   |
| Mặc định thời gian | `SYSUTCDATETIME()`                                          | Không dùng `GETDATE()` (giờ local của máy chủ)                                 |
| Tiền tệ            | `decimal(18,0)` — VNĐ số nguyên                             | Không dùng `float`/`real` cho tiền                                             |
| Tọa độ             | `decimal(10,7)`                                             | Độ chính xác ~1cm, đủ dùng                                                     |
| Tỷ lệ phần trăm    | `decimal(5,4)`                                              | `0.1000` nghĩa là 10%                                                          |
| Enum               | `varchar(n)` + `CHECK` constraint                           | Không dùng bảng tra cứu riêng cho enum cố định                                 |
| Xóa dữ liệu        | Không xóa cứng dữ liệu nghiệp vụ                            | Dùng trạng thái (`LOCKED`, `CANCELLED`)                                        |

> ⚠️ **`User` là từ khóa dành riêng của SQL Server.** Trong mọi câu lệnh T-SQL phải viết
> `[User]`. Trong TypeORM khai báo `@Entity({ name: 'User' })` và TypeORM sẽ tự bọc ngoặc.

---

## 2. Tổng quan các bảng

| #   | Bảng                | Nhóm      | Vai trò                                            |
| --- | ------------------- | --------- | -------------------------------------------------- |
| 1   | `SystemConfig`      | Cấu hình  | Tham số nghiệp vụ động (BR-01)                     |
| 2   | `User`              | Tài khoản | Thông tin đăng nhập và vai trò                     |
| 3   | `RefreshToken`      | Tài khoản | Phiên đăng nhập dài hạn                            |
| 4   | `DriverProfile`     | Tài xế    | Hồ sơ, trạng thái duyệt, trạng thái online, vị trí |
| 5   | `DriverDocument`    | Tài xế    | Ảnh giấy tờ lịch sử (nếu có)                        |
| 6   | `Vehicle`           | Tài xế    | Phương tiện                                        |
| 7   | `Customer`          | Chuyến    | Khách hàng mô phỏng do Admin tạo                   |
| 8   | `Ride`              | Chuyến    | Chuyến xe — bảng trung tâm                         |
| 9   | `RideOffer`         | Chuyến    | Lịch sử gửi lời mời nhận chuyến                    |
| 10  | `RideStatusHistory` | Chuyến    | Nhật ký chuyển trạng thái                          |
| 11  | `Wallet`            | Tài chính | Ví của tài xế và của nền tảng                      |
| 12  | `WalletTransaction` | Tài chính | Sổ cái giao dịch ví                                |
| 13  | `TopUpRequest`      | Tài chính | Yêu cầu nạp tiền chờ Admin duyệt                   |
| 14  | `Notification`      | Hệ thống  | Thông báo trong ứng dụng                           |

**So với bản thiết kế ban đầu (8 bảng), bổ sung 6 bảng:**
`SystemConfig`, `RefreshToken`, `DriverDocument`, `RideStatusHistory`,
`TopUpRequest`, `Notification`.

---

## 3. Sơ đồ quan hệ (ERD)

```
                        ┌──────────────┐
                        │ SystemConfig │  (độc lập, không có quan hệ)
                        └──────────────┘

┌──────────┐ 1      0..n ┌──────────────┐
│   User   │─────────────│ RefreshToken │
│          │             └──────────────┘
│ id       │ 1      0..n ┌──────────────┐
│ email    │─────────────│ Notification │
│ role     │             └──────────────┘
│ status   │ 1         1 ┌──────────────┐ 1      0..n ┌───────────────────┐
└────┬─────┘─────────────│    Wallet    │─────────────│ WalletTransaction │
     │ 1                 │ balance      │             │ type, direction   │
     │                   └──────────────┘             │ amount            │
     │                                                │ balanceAfter      │
     │ 0..1                                           └─────────┬─────────┘
┌────▼──────────────┐                                           │ 0..n
│  DriverProfile    │                                           │
│  approvalStatus   │ 1      0..n ┌────────────────┐            │
│  isOnline         │─────────────│ DriverDocument │            │
│  currentLatitude  │             └────────────────┘            │
│  currentLongitude │ 1      0..n ┌────────────────┐            │
│  cancelCount      │─────────────│    Vehicle     │            │
└───┬───────────┬───┘             │ licensePlate   │            │
    │ 0..n      │ 1          0..n │ isActive       │            │
    │           │                 └────────┬───────┘            │
    │      ┌────▼───────────┐              │ 0..1               │
    │      │  TopUpRequest  │              │                    │
    │      └────────────────┘              │                    │
    │                                      │                    │
    │ 0..n                                 │                    │
┌───▼────────────┐          ┌──────────┐   │                    │
│   RideOffer    │ 0..n   1 │          │◄──┘                    │
│ status         │──────────│   Ride   │                        │
│ round          │          │          │  1                     │
│ expiredAt      │          │ status   │────────────────────────┘
│ UQ(rideId,     │          │ estimatedFare
│    driverId)   │          │ finalFare       │ 1
└────────────────┘          │ commissionRate  │
                            │ platformFee     │ 0..n
                            │ driverEarning   ├──────┐
                            └────┬────────────┘      │
                                 │ n            ┌────▼──────────────┐
                            ┌────▼─────┐        │ RideStatusHistory │
                            │ Customer │        │ fromStatus        │
                            └──────────┘        │ toStatus          │
                                                └───────────────────┘
```

**Các quan hệ chính:**

| Quan hệ                        | Loại     | Giải thích                                                                            |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------- |
| `User` ↔ `DriverProfile`       | 1 – 0..1 | Một tài khoản vai trò DRIVER có đúng một hồ sơ. Ràng buộc `UNIQUE(userId)`            |
| `User` ↔ `Wallet`              | 1 – 1    | Mỗi tài khoản một ví. Ràng buộc `UNIQUE(userId)`                                      |
| `DriverProfile` ↔ `Vehicle`    | 1 – n    | Một tài xế nhiều xe, nhưng **chỉ một xe `isActive = 1`** (filtered unique index)      |
| `Ride` ↔ `RideOffer`           | 1 – n    | Một chuyến gửi tới nhiều tài xế, mỗi tài xế đúng một lần (`UNIQUE(rideId, driverId)`) |
| `Wallet` ↔ `WalletTransaction` | 1 – n    | Sổ cái, chỉ ghi thêm, không sửa không xóa                                             |
| `Ride` ↔ `WalletTransaction`   | 1 – 0..n | Một chuyến sinh **hai** bút toán (ví tài xế + ví nền tảng), `UNIQUE(rideId, type)`    |

---

## 4. Script DDL đầy đủ

### 4.1. Tạo cơ sở dữ liệu

```sql
IF DB_ID('DriverHub') IS NULL
    CREATE DATABASE DriverHub COLLATE Vietnamese_CI_AS;
GO
USE DriverHub;
GO
```

### 4.2. `SystemConfig` — Cấu hình hệ thống

```sql
CREATE TABLE SystemConfig (
    [key]       varchar(64)    NOT NULL,
    [value]     nvarchar(500)  NOT NULL,
    dataType    varchar(20)    NOT NULL CONSTRAINT DF_Config_Type DEFAULT 'STRING',
    description nvarchar(500)  NULL,
    updatedAt   datetime2(3)   NOT NULL CONSTRAINT DF_Config_Upd DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SystemConfig PRIMARY KEY CLUSTERED ([key]),
    CONSTRAINT CK_Config_Type CHECK (dataType IN ('STRING','NUMBER','BOOLEAN'))
);
```

### 4.3. `User` — Tài khoản đăng nhập

```sql
CREATE TABLE [User] (
    id           uniqueidentifier NOT NULL CONSTRAINT DF_User_Id DEFAULT NEWSEQUENTIALID(),
    email        varchar(255)     NOT NULL,
    passwordHash varchar(255)     NOT NULL,   -- bcrypt, dài 60 ký tự
    role         varchar(20)      NOT NULL,
    [status]     varchar(20)      NOT NULL CONSTRAINT DF_User_Status DEFAULT 'PENDING',
    createdAt    datetime2(3)     NOT NULL CONSTRAINT DF_User_Cre DEFAULT SYSUTCDATETIME(),
    updatedAt    datetime2(3)     NOT NULL CONSTRAINT DF_User_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_User      PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_User_Email UNIQUE (email),
    CONSTRAINT CK_User_Role   CHECK (role     IN ('ADMIN','DRIVER')),
    CONSTRAINT CK_User_Status CHECK ([status] IN ('PENDING','ACTIVE','LOCKED'))
);
```

> **Thay đổi so với thiết kế cũ:** bỏ giá trị `REJECTED` khỏi `User.status`. Việc từ chối hồ
> sơ thuộc trách nhiệm của `DriverProfile.approvalStatus` (BR-20). Hai cột không còn chồng lấn.

### 4.4. `RefreshToken` — Phiên đăng nhập

```sql
CREATE TABLE RefreshToken (
    id         uniqueidentifier NOT NULL CONSTRAINT DF_RT_Id DEFAULT NEWSEQUENTIALID(),
    userId     uniqueidentifier NOT NULL,
    tokenHash  varchar(255)     NOT NULL,
    deviceId   varchar(255)     NULL,
    deviceName nvarchar(200)    NULL,
    fcmToken   varchar(500)     NULL,   -- token thiết bị để gửi thông báo đẩy
    expiresAt  datetime2(3)     NOT NULL,
    revokedAt  datetime2(3)     NULL,
    createdAt  datetime2(3)     NOT NULL CONSTRAINT DF_RT_Cre DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_RefreshToken PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_RT_User FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE
);

CREATE INDEX IX_RT_User  ON RefreshToken(userId, revokedAt);
CREATE INDEX IX_RT_Token ON RefreshToken(tokenHash);
```

### 4.5. `DriverProfile` — Hồ sơ tài xế

```sql
CREATE TABLE DriverProfile (
    id               uniqueidentifier NOT NULL CONSTRAINT DF_DP_Id DEFAULT NEWSEQUENTIALID(),
    userId           uniqueidentifier NOT NULL,
    fullName         nvarchar(150)    NOT NULL,
    phoneNumber      varchar(15)      NOT NULL,
    dateOfBirth      date             NULL,
    citizenIdNumber  varchar(20)      NULL,
    citizenIdIssueDate date            NULL,
    driverLicenseNumber varchar(30)    NULL,
    driverLicenseIssueDate date        NULL,
    avatarUrl        varchar(500)     NULL,
    temporaryAddress nvarchar(500)    NULL,

    -- Trạng thái duyệt hồ sơ (BR-17, BR-20)
    approvalStatus   varchar(20)      NOT NULL CONSTRAINT DF_DP_Appr DEFAULT 'PENDING',
    rejectReason     nvarchar(500)    NULL,   -- BỔ SUNG: bắt buộc khi REJECTED (BR-18)
    approvedAt       datetime2(3)     NULL,
    approvedBy       uniqueidentifier NULL,   -- BỔ SUNG: Admin nào đã duyệt

    -- Trạng thái hoạt động
    isOnline         bit              NOT NULL CONSTRAINT DF_DP_Online DEFAULT 0,

    -- Vị trí gần nhất, phục vụ điều phối (BR-27, BR-28) — BỔ SUNG
    currentLatitude       decimal(10,7) NULL,
    currentLongitude      decimal(10,7) NULL,
    lastLocationUpdatedAt datetime2(3)  NULL,

    -- Thống kê — BỔ SUNG
    totalRides       int              NOT NULL CONSTRAINT DF_DP_Total  DEFAULT 0,
    cancelCount      int              NOT NULL CONSTRAINT DF_DP_Cancel DEFAULT 0,

    createdAt        datetime2(3)     NOT NULL CONSTRAINT DF_DP_Cre DEFAULT SYSUTCDATETIME(),
    updatedAt        datetime2(3)     NOT NULL CONSTRAINT DF_DP_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_DriverProfile PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_DP_User  UNIQUE (userId),        -- quan hệ 1-1 với User
    CONSTRAINT UQ_DP_Phone UNIQUE (phoneNumber),   -- BR-05
    CONSTRAINT FK_DP_User     FOREIGN KEY (userId)     REFERENCES [User](id),
    CONSTRAINT FK_DP_Approver FOREIGN KEY (approvedBy) REFERENCES [User](id),
    CONSTRAINT CK_DP_Approval CHECK (approvalStatus IN ('PENDING','APPROVED','REJECTED')),
    -- BR-18: từ chối thì bắt buộc có lý do
    CONSTRAINT CK_DP_RejectReason CHECK (
        approvalStatus <> 'REJECTED' OR rejectReason IS NOT NULL
    ),
    CONSTRAINT CK_DP_Lat CHECK (currentLatitude  IS NULL OR currentLatitude  BETWEEN -90  AND 90),
    CONSTRAINT CK_DP_Lng CHECK (currentLongitude IS NULL OR currentLongitude BETWEEN -180 AND 180)
);
```

### 4.6. `DriverDocument` — Giấy tờ đối tác

Lưu ảnh giấy tờ lịch sử; đăng ký mới dùng thông tin CCCD/GPLX trên `DriverProfile`
và không tạo bản ghi ở bảng này.

```sql
CREATE TABLE DriverDocument (
    id                 uniqueidentifier NOT NULL CONSTRAINT DF_DD_Id DEFAULT NEWSEQUENTIALID(),
    driverId           uniqueidentifier NOT NULL,
    docType            varchar(30)      NOT NULL,
    fileUrl            varchar(500)     NOT NULL,   -- URL Cloudinary
    verificationStatus varchar(20)      NOT NULL CONSTRAINT DF_DD_Ver DEFAULT 'PENDING',
    rejectReason       nvarchar(500)    NULL,
    uploadedAt         datetime2(3)     NOT NULL CONSTRAINT DF_DD_Up DEFAULT SYSUTCDATETIME(),
    verifiedAt         datetime2(3)     NULL,

    CONSTRAINT PK_DriverDocument PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_DD_Driver FOREIGN KEY (driverId) REFERENCES DriverProfile(id) ON DELETE CASCADE,
    CONSTRAINT CK_DD_Type CHECK (docType IN (
        'ID_CARD_FRONT','ID_CARD_BACK','DRIVER_LICENSE','VEHICLE_REGISTRATION')),
    CONSTRAINT CK_DD_Status CHECK (verificationStatus IN ('PENDING','APPROVED','REJECTED')),
    -- Mỗi loại giấy tờ chỉ có một bản hiện hành cho mỗi tài xế
    CONSTRAINT UQ_DD_Driver_Type UNIQUE (driverId, docType)
);
```

### 4.7. `Vehicle` — Phương tiện

```sql
CREATE TABLE Vehicle (
    id                 uniqueidentifier NOT NULL CONSTRAINT DF_V_Id DEFAULT NEWSEQUENTIALID(),
    driverId           uniqueidentifier NOT NULL,
    vehicleType        varchar(20)      NOT NULL,
    brand              nvarchar(100)    NOT NULL,
    modelName          nvarchar(100)    NOT NULL,
    licensePlate       varchar(20)      NOT NULL,
    color              nvarchar(50)     NULL,
    isActive           bit              NOT NULL CONSTRAINT DF_V_Active DEFAULT 1,
    verificationStatus varchar(20)      NOT NULL CONSTRAINT DF_V_Ver DEFAULT 'PENDING',
    createdAt          datetime2(3)     NOT NULL CONSTRAINT DF_V_Cre DEFAULT SYSUTCDATETIME(),
    updatedAt          datetime2(3)     NOT NULL CONSTRAINT DF_V_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Vehicle PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_V_Plate UNIQUE (licensePlate),   -- BR-22
    CONSTRAINT FK_V_Driver FOREIGN KEY (driverId) REFERENCES DriverProfile(id),
    CONSTRAINT CK_V_Type   CHECK (vehicleType IN ('MOTORBIKE','CAR')),
    CONSTRAINT CK_V_Status CHECK (verificationStatus IN ('PENDING','APPROVED','REJECTED'))
);

-- BR-23: mỗi tài xế chỉ có ĐÚNG MỘT xe đang hoạt động.
-- Filtered unique index — ràng buộc này không thể diễn đạt bằng UNIQUE thường.
CREATE UNIQUE INDEX UX_Vehicle_ActivePerDriver
    ON Vehicle(driverId) WHERE isActive = 1;
```

### 4.8. `Customer` — Khách hàng mô phỏng

```sql
CREATE TABLE Customer (
    id          uniqueidentifier NOT NULL CONSTRAINT DF_C_Id DEFAULT NEWSEQUENTIALID(),
    fullName    nvarchar(150)    NOT NULL,
    phoneNumber varchar(15)      NOT NULL,
    avatarUrl   varchar(500)     NULL,
    note        nvarchar(500)    NULL,
    createdAt   datetime2(3)     NOT NULL CONSTRAINT DF_C_Cre DEFAULT SYSUTCDATETIME(),
    updatedAt   datetime2(3)     NOT NULL CONSTRAINT DF_C_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Customer PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_C_Phone  UNIQUE (phoneNumber)
);
```

### 4.9. `Ride` — Chuyến xe

```sql
CREATE TABLE Ride (
    id          uniqueidentifier NOT NULL CONSTRAINT DF_R_Id DEFAULT NEWSEQUENTIALID(),
    rideCode    varchar(20)      NOT NULL,   -- BỔ SUNG: mã dễ đọc, vd R20260918-0001
    customerId  uniqueidentifier NOT NULL,
    driverId    uniqueidentifier NULL,
    vehicleId   uniqueidentifier NULL,

    -- Điểm đón / điểm trả
    pickupAddress    nvarchar(500) NOT NULL,
    pickupLatitude   decimal(10,7) NOT NULL,
    pickupLongitude  decimal(10,7) NOT NULL,
    dropoffAddress   nvarchar(500) NOT NULL,
    dropoffLatitude  decimal(10,7) NOT NULL,
    dropoffLongitude decimal(10,7) NOT NULL,

    -- Thông số chuyến
    vehicleType              varchar(20)   NOT NULL,   -- BỔ SUNG: loại xe yêu cầu (BR-25)
    distanceKm               decimal(8,2)  NOT NULL,
    estimatedDurationMinutes int           NULL,

    -- Tiền bạc
    estimatedFare  decimal(18,0) NOT NULL,
    finalFare      decimal(18,0) NULL,
    commissionRate decimal(5,4)  NULL,   -- BỔ SUNG: SNAPSHOT tỷ lệ phí (BR-60)
    platformFee    decimal(18,0) NULL,   -- BỔ SUNG
    driverEarning  decimal(18,0) NULL,   -- BỔ SUNG
    paymentMethod  varchar(20)   NOT NULL CONSTRAINT DF_R_Pay DEFAULT 'CASH',

    -- Trạng thái và điều phối
    [status]       varchar(30)   NOT NULL CONSTRAINT DF_R_Status DEFAULT 'SEARCHING',
    dispatchRound  int           NOT NULL CONSTRAINT DF_R_Round DEFAULT 0,  -- BỔ SUNG

    -- Mốc thời gian (BR-35)
    createdAt    datetime2(3) NOT NULL CONSTRAINT DF_R_Cre DEFAULT SYSUTCDATETIME(),
    acceptedAt   datetime2(3) NULL,
    arrivedAt    datetime2(3) NULL,
    startedAt    datetime2(3) NULL,
    completedAt  datetime2(3) NULL,
    cancelledAt  datetime2(3) NULL,
    cancelledBy  varchar(20)  NULL,   -- BỔ SUNG: ADMIN / DRIVER / SYSTEM (BR-50)
    cancelReason nvarchar(500) NULL,
    createdBy    uniqueidentifier NOT NULL,   -- BỔ SUNG: Admin tạo chuyến
    updatedAt    datetime2(3) NOT NULL CONSTRAINT DF_R_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Ride    PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_R_Code  UNIQUE (rideCode),
    CONSTRAINT FK_R_Customer FOREIGN KEY (customerId) REFERENCES Customer(id),
    CONSTRAINT FK_R_Driver   FOREIGN KEY (driverId)   REFERENCES DriverProfile(id),
    CONSTRAINT FK_R_Vehicle  FOREIGN KEY (vehicleId)  REFERENCES Vehicle(id),
    CONSTRAINT FK_R_Creator  FOREIGN KEY (createdBy)  REFERENCES [User](id),

    CONSTRAINT CK_R_Status CHECK ([status] IN
        ('SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED',
         'CANCELLED','NO_DRIVER_FOUND')),
    CONSTRAINT CK_R_VehicleType CHECK (vehicleType   IN ('MOTORBIKE','CAR')),
    CONSTRAINT CK_R_Payment     CHECK (paymentMethod IN ('CASH','WALLET')),
    CONSTRAINT CK_R_CancelledBy CHECK (cancelledBy IS NULL OR
                                       cancelledBy IN ('ADMIN','DRIVER','SYSTEM')),
    CONSTRAINT CK_R_Fare     CHECK (estimatedFare > 0),
    CONSTRAINT CK_R_Distance CHECK (distanceKm > 0),

    -- Ràng buộc toàn vẹn nghiệp vụ ngay tại tầng CSDL:
    -- đã nhận chuyến thì bắt buộc phải có tài xế
    CONSTRAINT CK_R_DriverRequired CHECK (
        [status] IN ('SEARCHING','CANCELLED','NO_DRIVER_FOUND') OR driverId IS NOT NULL
    ),
    -- đã hoàn thành thì bắt buộc có đủ số liệu tài chính
    CONSTRAINT CK_R_Settled CHECK (
        [status] <> 'COMPLETED' OR
        (finalFare IS NOT NULL AND commissionRate IS NOT NULL
         AND platformFee IS NOT NULL AND driverEarning IS NOT NULL)
    ),
    -- hủy thì bắt buộc có lý do và người hủy
    CONSTRAINT CK_R_CancelInfo CHECK (
        [status] <> 'CANCELLED' OR (cancelReason IS NOT NULL AND cancelledBy IS NOT NULL)
    )
);
```

> `CK_R_Settled` và `CK_R_DriverRequired` là ví dụ điển hình của việc **đưa quy tắc nghiệp
> vụ xuống tầng cơ sở dữ liệu**: dù mã nguồn có lỗi, CSDL vẫn không cho phép tồn tại một
> chuyến `COMPLETED` mà thiếu số liệu tài chính.

### 4.10. `RideOffer` — Lời mời nhận chuyến

```sql
CREATE TABLE RideOffer (
    id          uniqueidentifier NOT NULL CONSTRAINT DF_RO_Id DEFAULT NEWSEQUENTIALID(),
    rideId      uniqueidentifier NOT NULL,
    driverId    uniqueidentifier NOT NULL,
    [status]    varchar(20)      NOT NULL CONSTRAINT DF_RO_Status DEFAULT 'SENT',
    [round]     int              NOT NULL CONSTRAINT DF_RO_Round DEFAULT 1,  -- BỔ SUNG
    distanceKm  decimal(8,2)     NULL,   -- BỔ SUNG: khoảng cách lúc gửi, để phân tích
    offeredAt   datetime2(3)     NOT NULL CONSTRAINT DF_RO_Off DEFAULT SYSUTCDATETIME(),
    viewedAt    datetime2(3)     NULL,
    respondedAt datetime2(3)     NULL,
    expiredAt   datetime2(3)     NOT NULL,

    CONSTRAINT PK_RideOffer PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_RO_Ride   FOREIGN KEY (rideId)   REFERENCES Ride(id) ON DELETE CASCADE,
    CONSTRAINT FK_RO_Driver FOREIGN KEY (driverId) REFERENCES DriverProfile(id),
    -- BR-44: một chuyến không bao giờ gửi lặp cho cùng một tài xế
    CONSTRAINT UQ_RideOffer_Ride_Driver UNIQUE (rideId, driverId),
    CONSTRAINT CK_RO_Status CHECK ([status] IN
        ('SENT','VIEWED','ACCEPTED','IGNORED','EXPIRED','LOST'))
);
```

### 4.11. `RideStatusHistory` — Nhật ký chuyển trạng thái

```sql
CREATE TABLE RideStatusHistory (
    id          bigint           IDENTITY(1,1) NOT NULL,
    rideId      uniqueidentifier NOT NULL,
    fromStatus  varchar(30)      NULL,   -- NULL khi khởi tạo chuyến
    toStatus    varchar(30)      NOT NULL,
    changedByType varchar(20)    NOT NULL,   -- ADMIN / DRIVER / SYSTEM
    changedById uniqueidentifier NULL,
    note        nvarchar(500)    NULL,
    changedAt   datetime2(3)     NOT NULL CONSTRAINT DF_RSH_At DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_RideStatusHistory PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_RSH_Ride FOREIGN KEY (rideId) REFERENCES Ride(id) ON DELETE CASCADE,
    CONSTRAINT CK_RSH_By CHECK (changedByType IN ('ADMIN','DRIVER','SYSTEM'))
);

CREATE INDEX IX_RSH_Ride ON RideStatusHistory(rideId, changedAt);
```

> Bảng này dùng `bigint IDENTITY` thay vì `uniqueidentifier` vì đây là bảng chỉ ghi thêm
> (append-only) với lượng bản ghi lớn; khóa tăng dần cho hiệu năng ghi tốt hơn.

### 4.12. `Wallet` — Ví

```sql
CREATE TABLE Wallet (
    id        uniqueidentifier NOT NULL CONSTRAINT DF_W_Id DEFAULT NEWSEQUENTIALID(),
    userId    uniqueidentifier NOT NULL,
    balance   decimal(18,0)    NOT NULL CONSTRAINT DF_W_Bal DEFAULT 0,  -- có thể ÂM (BR-55)
    createdAt datetime2(3)     NOT NULL CONSTRAINT DF_W_Cre DEFAULT SYSUTCDATETIME(),
    updatedAt datetime2(3)     NOT NULL CONSTRAINT DF_W_Upd DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Wallet  PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_W_User  UNIQUE (userId),        -- BR-54: mỗi tài khoản một ví
    CONSTRAINT FK_W_User  FOREIGN KEY (userId) REFERENCES [User](id)
);
```

### 4.13. `WalletTransaction` — Sổ cái giao dịch

```sql
CREATE TABLE WalletTransaction (
    id           uniqueidentifier NOT NULL CONSTRAINT DF_WT_Id DEFAULT NEWSEQUENTIALID(),
    walletId     uniqueidentifier NOT NULL,
    rideId       uniqueidentifier NULL,
    [type]       varchar(30)      NOT NULL,
    direction    varchar(10)      NOT NULL,
    amount       decimal(18,0)    NOT NULL,   -- luôn DƯƠNG; direction quyết định chiều
    balanceAfter decimal(18,0)    NOT NULL,   -- BR-57: ảnh chụp số dư sau giao dịch
    description  nvarchar(500)    NOT NULL,
    createdAt    datetime2(3)     NOT NULL CONSTRAINT DF_WT_Cre DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_WalletTransaction PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_WT_Wallet FOREIGN KEY (walletId) REFERENCES Wallet(id),
    CONSTRAINT FK_WT_Ride   FOREIGN KEY (rideId)   REFERENCES Ride(id),
    CONSTRAINT CK_WT_Type CHECK ([type] IN
        ('COMMISSION_FEE','COMMISSION_INCOME','RIDE_EARNING',
         'TOPUP','WITHDRAW','ADJUSTMENT')),
    CONSTRAINT CK_WT_Direction CHECK (direction IN ('CREDIT','DEBIT')),
    CONSTRAINT CK_WT_Amount    CHECK (amount > 0),

    -- BR-64 LỚP 2: lưới an toàn chống trừ phí hai lần cho cùng một chuyến.
    -- Đây là ràng buộc quan trọng nhất của toàn bộ thiết kế tài chính.
    CONSTRAINT UQ_WT_Ride_Type UNIQUE (rideId, [type])
);

CREATE INDEX IX_WT_Wallet ON WalletTransaction(walletId, createdAt DESC);
CREATE INDEX IX_WT_Ride   ON WalletTransaction(rideId);
```

> **Lưu ý về `UNIQUE(rideId, type)` và giá trị `NULL`:** trong SQL Server, ràng buộc
> `UNIQUE` coi các giá trị `NULL` là bằng nhau, nên chỉ cho phép **một** dòng có
> `rideId = NULL` cho mỗi `type`. Điều này sẽ chặn nhầm các giao dịch nạp/rút (vốn không
> gắn với chuyến nào). Vì vậy phải thay bằng **filtered unique index**:

```sql
-- Thay CONSTRAINT UQ_WT_Ride_Type ở trên bằng index này:
ALTER TABLE WalletTransaction DROP CONSTRAINT UQ_WT_Ride_Type;

CREATE UNIQUE INDEX UX_WT_Ride_Type
    ON WalletTransaction(rideId, [type])
    WHERE rideId IS NOT NULL;
```

### 4.14. `TopUpRequest` — Yêu cầu nạp tiền

```sql
CREATE TABLE TopUpRequest (
    id           uniqueidentifier NOT NULL CONSTRAINT DF_TU_Id DEFAULT NEWSEQUENTIALID(),
    driverId     uniqueidentifier NOT NULL,
    amount       decimal(18,0)    NOT NULL,
    receiptUrl   varchar(500)     NULL,   -- ảnh biên lai chuyển khoản
    [status]     varchar(20)      NOT NULL CONSTRAINT DF_TU_St DEFAULT 'PENDING',
    rejectReason nvarchar(500)    NULL,
    reviewedBy   uniqueidentifier NULL,
    reviewedAt   datetime2(3)     NULL,
    createdAt    datetime2(3)     NOT NULL CONSTRAINT DF_TU_Cre DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_TopUpRequest PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_TU_Driver   FOREIGN KEY (driverId)   REFERENCES DriverProfile(id),
    CONSTRAINT FK_TU_Reviewer FOREIGN KEY (reviewedBy) REFERENCES [User](id),
    CONSTRAINT CK_TU_Status CHECK ([status] IN ('PENDING','APPROVED','REJECTED')),
    CONSTRAINT CK_TU_Amount CHECK (amount BETWEEN 20000 AND 5000000)   -- BR-69
);

-- BR-70: mỗi tài xế chỉ có tối đa MỘT yêu cầu đang chờ duyệt
CREATE UNIQUE INDEX UX_TopUp_PendingPerDriver
    ON TopUpRequest(driverId) WHERE [status] = 'PENDING';
```

### 4.15. `Notification` — Thông báo

```sql
CREATE TABLE Notification (
    id        bigint           IDENTITY(1,1) NOT NULL,
    userId    uniqueidentifier NOT NULL,
    [type]    varchar(40)      NOT NULL,
    title     nvarchar(200)    NOT NULL,
    body      nvarchar(500)    NOT NULL,
    dataJson  nvarchar(max)    NULL,   -- payload kèm theo, vd { "rideId": "..." }
    isRead    bit              NOT NULL CONSTRAINT DF_N_Read DEFAULT 0,
    createdAt datetime2(3)     NOT NULL CONSTRAINT DF_N_Cre DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Notification PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_N_User FOREIGN KEY (userId) REFERENCES [User](id) ON DELETE CASCADE
);

CREATE INDEX IX_N_User ON Notification(userId, isRead, createdAt DESC);
```

---

## 5. Chỉ mục phục vụ các truy vấn nóng

```sql
-- Điều phối: lọc tài xế đủ điều kiện (BR-40) — truy vấn chạy nhiều nhất hệ thống
CREATE INDEX IX_DP_Dispatch
    ON DriverProfile(isOnline, approvalStatus, lastLocationUpdatedAt)
    INCLUDE (currentLatitude, currentLongitude, fullName, phoneNumber);

-- Kiểm tra "tài xế có đang bận không" (BR-40 điều kiện 5)
CREATE INDEX IX_Ride_DriverActive
    ON Ride(driverId, [status])
    INCLUDE (rideCode, pickupAddress, createdAt);

-- Admin xem danh sách chuyến theo trạng thái
CREATE INDEX IX_Ride_StatusCreated
    ON Ride([status], createdAt DESC);

-- Báo cáo doanh thu theo khoảng thời gian
CREATE INDEX IX_Ride_Completed
    ON Ride(completedAt)
    INCLUDE (finalFare, platformFee, driverEarning, driverId)
    WHERE [status] = 'COMPLETED';

-- Job quét lời mời hết hạn (BR-43), chạy mỗi 5 giây
CREATE INDEX IX_RO_Expiry
    ON RideOffer(expiredAt, [status])
    WHERE [status] IN ('SENT','VIEWED');

-- Ứng dụng tài xế lấy danh sách lời mời đang chờ
CREATE INDEX IX_RO_Driver
    ON RideOffer(driverId, [status], offeredAt DESC);

-- Duyệt hồ sơ: Admin lọc tài xế chờ duyệt
CREATE INDEX IX_DP_Approval
    ON DriverProfile(approvalStatus, createdAt DESC);
```

---

## 6. Tối ưu truy vấn điều phối theo khoảng cách

`STDistance()` trên một giá trị `geography` dựng tại chỗ **không tận dụng được chỉ mục
thông thường** — SQL Server phải tính toán cho từng dòng. Với vài chục tài xế thì không
thành vấn đề, nhưng cách làm đúng là **lọc thô bằng hộp bao (bounding box) trước, tính
khoảng cách chính xác sau**:

```sql
DECLARE @latDelta decimal(10,7) = @radiusKm / 111.0;                          -- 1 độ vĩ ≈ 111 km
DECLARE @lngDelta decimal(10,7) = @radiusKm / (111.0 * COS(RADIANS(@pickupLat)));

SELECT TOP (@batchSize)
       dp.id, dp.fullName, dp.phoneNumber,
       geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
         .STDistance(geography::Point(@pickupLat, @pickupLng, 4326)) / 1000.0 AS distanceKm
FROM   DriverProfile dp
JOIN   [User]  u ON u.id = dp.userId
JOIN   Vehicle v ON v.driverId = dp.id
                AND v.isActive = 1
                AND v.verificationStatus = 'APPROVED'
                AND v.vehicleType = @vehicleType
JOIN   Wallet  w ON w.userId = u.id
WHERE  dp.isOnline = 1
  AND  dp.approvalStatus = 'APPROVED'
  AND  u.[status] = 'ACTIVE'
  AND  dp.lastLocationUpdatedAt >= DATEADD(MINUTE, -@staleMinutes, SYSUTCDATETIME())
  AND  w.balance >= @maxNegativeBalance
  -- Lọc thô bằng hộp bao: dùng được chỉ mục, loại bỏ phần lớn ứng viên
  AND  dp.currentLatitude  BETWEEN @pickupLat - @latDelta AND @pickupLat + @latDelta
  AND  dp.currentLongitude BETWEEN @pickupLng - @lngDelta AND @pickupLng + @lngDelta
  AND  NOT EXISTS (SELECT 1 FROM Ride r
                   WHERE r.driverId = dp.id
                     AND r.[status] IN ('ACCEPTED','ARRIVED','IN_PROGRESS'))
  AND  NOT EXISTS (SELECT 1 FROM RideOffer o
                   WHERE o.rideId = @rideId AND o.driverId = dp.id)
  -- Lọc tinh: khoảng cách thực theo đường tròn lớn
  AND  geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
         .STDistance(geography::Point(@pickupLat, @pickupLng, 4326)) <= @radiusKm * 1000
ORDER BY distanceKm ASC;
```

**Mở rộng (không bắt buộc):** nếu muốn dùng chỉ mục không gian thật sự, thêm một cột
`geography` được duy trì bởi trigger hoặc cập nhật cùng lúc với `currentLatitude/Longitude`,
rồi tạo `CREATE SPATIAL INDEX`. Với quy mô đồ án, cách lọc hộp bao ở trên là đủ và đơn giản hơn.

---

## 7. Dữ liệu khởi tạo (seed)

### 7.1. Cấu hình hệ thống

```sql
INSERT INTO SystemConfig ([key], [value], dataType, description) VALUES
('COMMISSION_RATE',            '0.10',    'NUMBER', N'Tỷ lệ phí nền tảng'),
('OFFER_TIMEOUT_SECONDS',      '20',      'NUMBER', N'Thời gian chờ tài xế phản hồi'),
('DISPATCH_BATCH_SIZE',        '5',       'NUMBER', N'Số tài xế mỗi vòng điều phối'),
('DISPATCH_MAX_ROUNDS',        '3',       'NUMBER', N'Số vòng điều phối tối đa'),
('DISPATCH_RADIUS_KM',         '10',      'NUMBER', N'Bán kính tìm tài xế (km)'),
('MAX_NEGATIVE_BALANCE',       '-200000', 'NUMBER', N'Ngưỡng ví âm tối đa (VNĐ)'),
('LOCATION_STALE_MINUTES',     '5',       'NUMBER', N'Ngưỡng vị trí bị coi là cũ'),
('FARE_BASE_MOTORBIKE',        '12000',   'NUMBER', N'Giá mở cửa xe máy'),
('FARE_PER_KM_MOTORBIKE',      '4000',    'NUMBER', N'Đơn giá mỗi km - xe máy'),
('FARE_BASE_CAR',              '25000',   'NUMBER', N'Giá mở cửa ô tô'),
('FARE_PER_KM_CAR',            '9000',    'NUMBER', N'Đơn giá mỗi km - ô tô'),
('FARE_BASE_DISTANCE_KM',      '2',       'NUMBER', N'Số km đã bao gồm trong giá mở cửa');
```

### 7.2. Tài khoản Admin và ví nền tảng

```sql
DECLARE @adminId uniqueidentifier = NEWID();

INSERT INTO [User] (id, email, passwordHash, role, [status])
VALUES (@adminId, 'admin@driverhub.local',
        '$2b$10$...',            -- bcrypt của mật khẩu đặt trong biến môi trường
        'ADMIN', 'ACTIVE');

-- Ví nền tảng: nơi tích lũy toàn bộ phí hoa hồng
INSERT INTO Wallet (userId, balance) VALUES (@adminId, 0);
```

### 7.3. Dữ liệu mô phỏng cho việc kiểm thử

Script `seed-demo-data.ts` tạo:

- **5 tài xế** đã duyệt, ví số dư 0, có vị trí rải quanh Hà Nội (Cầu Giấy, Đống Đa,
  Hai Bà Trưng, Thanh Xuân, Nam Từ Liêm) — phục vụ kiểm thử điều phối theo khoảng cách.
- **2 tài xế** đang chờ duyệt — phục vụ kiểm thử luồng phê duyệt.
- **1 tài xế** bị từ chối kèm lý do.
- **10 khách hàng** mô phỏng.
- **20 chuyến đã hoàn thành** trong 7 ngày gần nhất, đã quyết toán đầy đủ — phục vụ kiểm
  thử màn hình thống kê và báo cáo doanh thu.

---

## 8. Các truy vấn báo cáo thường dùng

### 8.1. Thu nhập của một tài xế theo ngày

```sql
SELECT CAST(completedAt AS date)  AS [ngay],
       COUNT(*)                   AS soChuyen,
       SUM(finalFare)             AS tongCuoc,
       SUM(platformFee)           AS tongPhiNenTang,
       SUM(driverEarning)         AS thuNhapRong
FROM   Ride
WHERE  driverId = @driverId
  AND  [status] = 'COMPLETED'
  AND  completedAt >= @fromDate
GROUP BY CAST(completedAt AS date)
ORDER BY [ngay] DESC;
```

### 8.2. Doanh thu nền tảng theo tháng

```sql
SELECT YEAR(completedAt)  AS [nam],
       MONTH(completedAt) AS [thang],
       COUNT(*)           AS soChuyen,
       SUM(finalFare)     AS tongGiaTriGiaoDich,
       SUM(platformFee)   AS doanhThuNenTang,
       AVG(commissionRate) AS tyLePhiTrungBinh
FROM   Ride
WHERE  [status] = 'COMPLETED'
GROUP BY YEAR(completedAt), MONTH(completedAt)
ORDER BY [nam] DESC, [thang] DESC;
```

> Truy vấn này lấy `commissionRate` từ cột snapshot trong bảng `Ride`, **không** lấy từ
> `SystemConfig`. Đó chính là lý do BR-60 tồn tại: nếu tỷ lệ phí đổi giữa chừng, báo cáo
> các tháng cũ vẫn đúng.

### 8.3. Hiệu quả điều phối

```sql
SELECT [round],
       COUNT(*)                                                       AS soLoiMoi,
       SUM(CASE WHEN [status] = 'ACCEPTED' THEN 1 ELSE 0 END)         AS soLuotNhan,
       SUM(CASE WHEN [status] = 'IGNORED'  THEN 1 ELSE 0 END)         AS soLuotBoQua,
       SUM(CASE WHEN [status] = 'EXPIRED'  THEN 1 ELSE 0 END)         AS soLuotHetHan,
       CAST(100.0 * SUM(CASE WHEN [status]='ACCEPTED' THEN 1 ELSE 0 END)
            / NULLIF(COUNT(*),0) AS decimal(5,2))                     AS tyLeNhanPhanTram
FROM   RideOffer
GROUP BY [round]
ORDER BY [round];
```

### 8.4. Kiểm tra toàn vẹn sổ cái (đối soát)

```sql
-- (a) Số dư ví phải khớp với bút toán cuối cùng trong sổ cái (BR-57)
SELECT w.id, w.balance AS soDuVi, lastTx.balanceAfter AS soDuTheoSoCai
FROM   Wallet w
OUTER APPLY (
    SELECT TOP 1 balanceAfter
    FROM   WalletTransaction wt
    WHERE  wt.walletId = w.id
    ORDER BY wt.createdAt DESC, wt.id DESC
) lastTx
WHERE  lastTx.balanceAfter IS NOT NULL
  AND  w.balance <> lastTx.balanceAfter;
-- Kết quả PHẢI rỗng.

-- (b) Ghi sổ kép phải cân (BR-62)
SELECT SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS chenhLech
FROM   WalletTransaction
WHERE  [type] IN ('COMMISSION_FEE','COMMISSION_INCOME');
-- Kết quả PHẢI bằng 0.

-- (c) Không chuyến nào bị thu phí hai lần (BR-64)
SELECT rideId, [type], COUNT(*) AS soLan
FROM   WalletTransaction
WHERE  rideId IS NOT NULL
GROUP BY rideId, [type]
HAVING COUNT(*) > 1;
-- Kết quả PHẢI rỗng.
```

> Ba truy vấn trên nên được đưa vào báo cáo như **bằng chứng** rằng thiết kế tài chính hoạt
> động đúng. Chạy chúng sau khi kiểm thử và chụp lại kết quả rỗng.

---

## 9. Bảng đối chiếu với thiết kế ban đầu

| Hạng mục            | Thiết kế ban đầu      | Sau khi bổ sung                     | Lý do                                                                                    |
| ------------------- | --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Số bảng             | 8                     | 14                                  | Bổ sung giấy tờ, phiên đăng nhập, nhật ký trạng thái, nạp tiền, thông báo, cấu hình      |
| `Ride.status`       | Không liệt kê giá trị | 7 trạng thái + `CHECK`              | BR-31                                                                                    |
| Tỷ lệ phí           | Hardcode 10%          | Cấu hình động + snapshot vào `Ride` | BR-01, BR-60                                                                             |
| Chống trừ phí lặp   | Không có              | 2 lớp bảo vệ                        | BR-64                                                                                    |
| Vị trí tài xế       | Không lưu             | 3 cột + chỉ mục                     | BR-27, BR-40                                                                             |
| Lý do từ chối hồ sơ | Không có              | `rejectReason` + `CHECK`            | BR-18                                                                                    |
| Người hủy chuyến    | Không có              | `cancelledBy`                       | BR-50                                                                                    |
| Ràng buộc duy nhất  | 1 (`rideId+driverId`) | 9                                   | Toàn vẹn dữ liệu                                                                         |
| Chỉ mục             | Không có              | 12                                  | Hiệu năng truy vấn điều phối                                                             |
| `CHECK` constraint  | Không có              | 20+                                 | Đưa quy tắc nghiệp vụ xuống tầng CSDL                                                    |
