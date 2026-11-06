import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

// DATABASE.md mục 4.2 — CK_Config_Type
export type SystemConfigDataType = 'STRING' | 'NUMBER' | 'BOOLEAN';

@Entity({ name: 'SystemConfig' })
@Check('CK_Config_Type', `"dataType" IN ('STRING','NUMBER','BOOLEAN')`)
export class SystemConfig {
  // Khóa chính là chính tên tham số cấu hình, không dùng uniqueidentifier
  // (bảng này không theo quy ước "id" ở mục 1 — xem DDL gốc mục 4.2).
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 64 })
  key: string;

  @Column({ name: 'value', type: 'nvarchar', length: 500 })
  value: string;

  @Column({
    name: 'dataType',
    type: 'varchar',
    length: 20,
    default: 'STRING',
  })
  dataType: SystemConfigDataType;

  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    name: 'updatedAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  updatedAt: Date;
}
