import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';

const BCRYPT_COST = 10; // BR-06

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Thiếu SEED_ADMIN_EMAIL hoặc SEED_ADMIN_PASSWORD trong .env',
    );
  }

  await AppDataSource.initialize();

  try {
    const userRepo = AppDataSource.getRepository(User);

    // Idempotent: đã có Admin với email này thì bỏ qua, không tạo trùng.
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      console.log(`Tài khoản Admin "${email}" đã tồn tại — bỏ qua.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    await AppDataSource.transaction(async (manager) => {
      const admin = await manager.getRepository(User).save({
        email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      // Ví nền tảng: nơi tích lũy toàn bộ phí hoa hồng (DATABASE.md mục 7.2)
      await manager.getRepository(Wallet).save({
        userId: admin.id,
        balance: '0',
      });

      console.log(
        `Đã tạo tài khoản Admin "${email}" (id=${admin.id}) và ví nền tảng balance=0.`,
      );
    });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed Admin thất bại:', err);
  process.exit(1);
});
