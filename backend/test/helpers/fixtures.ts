export type CleanupStep = () => Promise<unknown>;

// Dùng chung bởi mọi *.e2e-spec.ts: dọn dữ liệu fixture theo TỪNG bước độc
// lập. Một bước lỗi (dòng đã bị xóa từ trước, hoặc fixture chưa kịp tạo xong
// vì beforeEach/beforeAll phía trên throw) không bao giờ được phép làm hỏng
// hay che mất kết quả thật của test — nên luôn best-effort, bỏ qua lỗi từng
// bước thay vì để cả afterEach/afterAll sập theo.
export async function safeCleanup(steps: CleanupStep[]): Promise<void> {
  for (const step of steps) {
    try {
      await step();
    } catch {
      // best-effort — bỏ qua.
    }
  }
}
