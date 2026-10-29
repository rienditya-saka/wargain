import { ACCOUNTS, expect, test } from "./fixtures";

test.describe("Login", () => {
  test("password salah menampilkan pesan & tetap di halaman login", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@wargain.id").fill(ACCOUNTS.warga.email);
    await page.locator('input[type="password"]').fill("salah-password-123");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/salah|tidak valid|gagal|tidak ditemukan/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login warga berhasil → masuk Feed", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin@wargain.id").fill(ACCOUNTS.warga.email);
    await page.locator('input[type="password"]').fill(ACCOUNTS.warga.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 15_000 });
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem("wargain_tenant_session") ?? "null"));
    expect(session?.communityId).toBeTruthy();
    expect(session?.citizenId, "akun warga terhubung ke data penduduk").toBeTruthy();
  });

  test("halaman terproteksi → login → kembali ke halaman asal (?next=)", async ({ page }) => {
    await page.goto("/kartu");
    await expect(page).toHaveURL(/\/login\?next=%2Fkartu/);
    await page.getByPlaceholder("admin@wargain.id").fill(ACCOUNTS.warga.email);
    await page.locator('input[type="password"]').fill(ACCOUNTS.warga.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/kartu$/, { timeout: 15_000 });
    await expect(page.getByText("KARTU WARGA DIGITAL", { exact: true })).toBeVisible();
  });

  test("next= ke domain lain diabaikan (anti open-redirect)", async ({ page }) => {
    await page.goto("/login?next=//evil.example.com");
    await page.getByPlaceholder("admin@wargain.id").fill(ACCOUNTS.warga.email);
    await page.locator('input[type="password"]').fill(ACCOUNTS.warga.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 15_000 });
  });
});
