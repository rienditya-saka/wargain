import { expect, loginAs, test } from "./fixtures";

// Balai Warga dari sisi warga (data demo dari scratch/seed-balai.mjs).
test.describe("Balai Warga — warga", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "warga");
  });

  test("Kabar: daftar kabar & filter kategori", async ({ page }) => {
    await page.goto("/balai");
    await expect(page.getByText("Pemadaman listrik terjadwal", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /Kabar Duka/ }).click();
    await expect(page.getByText("Kabar duka dari keluarga Blok C")).toBeVisible();
    await expect(page.getByText("Pemadaman listrik terjadwal", { exact: false })).toHaveCount(0);
    await expect(page.getByText(/Innalillahi/).first()).toBeVisible();
  });

  test("Polling: vote / ubah pilihan lalu hasil tampil", async ({ page }) => {
    await page.goto("/balai?tab=polling");
    const card = page.locator('[id^="poll-"]').filter({ hasText: "iuran keamanan" });
    await expect(card).toBeVisible();
    await expect(card.getByText("1 rumah 1 suara")).toBeVisible();
    const change = card.getByRole("button", { name: "Ubah pilihan" });
    if (await change.isVisible()) await change.click();
    await card.getByRole("button", { name: "Setuju", exact: true }).click();
    await card.getByRole("button", { name: /Kirim suara|Simpan pilihan baru/ }).click();
    await expect(page.getByText(/Suara Anda tercatat|Pilihan diperbarui/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Ubah pilihan" })).toBeVisible();
    await expect(card.getByText(/\d+%/).first()).toBeVisible();
    await expect(card.getByText(/dari \d+ rumah memilih/)).toBeVisible();
  });

  test("Polling: arsip hasil menampilkan pemenang", async ({ page }) => {
    await page.goto("/balai?tab=polling");
    await page.getByRole("button", { name: "Hasil polling" }).click();
    const card = page.locator('[id^="poll-"]').filter({ hasText: "portal otomatis" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Selesai")).toBeVisible();
    await expect(card.getByText(/🏆/)).toBeVisible();
    await expect(card.getByRole("button", { name: /Kirim suara/ })).toHaveCount(0);
  });

  test("Warga tidak melihat tombol buat polling / jadwalkan musyawarah", async ({ page }) => {
    await page.goto("/balai?tab=polling");
    await expect(page.getByRole("button", { name: "Buat polling" })).toHaveCount(0);
    await page.goto("/balai?tab=musyawarah");
    await expect(page.getByRole("button", { name: "Jadwalkan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tulis kabar" })).toHaveCount(0); // FAB hanya di tab Kabar
  });

  test("Musyawarah: detail, agenda & konfirmasi hadir", async ({ page }) => {
    await page.goto("/balai?tab=musyawarah");
    await page.getByRole("button", { name: /Rapat Warga Bulanan/ }).last().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Agenda")).toBeVisible();
    await expect(dialog.getByText("Usulan penambahan satpam malam")).toBeVisible();
    await expect(dialog.getByText("PANEL PENGURUS")).toHaveCount(0);
    await dialog.getByRole("button", { name: /Hadir/ }).first().click();
    await expect(page.getByText("Sampai jumpa di musyawarah!")).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Simpan ke kalender/ })).toHaveAttribute("href", /calendar\.google\.com/);
  });

  test("Musyawarah selesai: notulen & keputusan terbaca", async ({ page }) => {
    await page.goto("/balai?tab=musyawarah");
    await page.getByRole("button", { name: /Persiapan HUT Cluster Madrid/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Selesai").first()).toBeVisible();
    await expect(dialog.getByText(/Festival Kuliner Nusantara/).first()).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Bagikan notulen ke grup WA/ })).toHaveAttribute("href", /wa\.me/);
  });

  test("Galang dana: progres & form donasi", async ({ page }) => {
    await page.goto("/balai?tab=donasi");
    await page.getByRole("button", { name: /Renovasi Pos Ronda/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/donatur/).first()).toBeVisible();
    await expect(dialog.getByText("REKENING / QRIS")).toBeVisible();
    await dialog.getByRole("button", { name: "100rb" }).click();
    await expect(dialog.getByRole("button", { name: "Donasi Rp 100.000" })).toBeVisible();
    await expect(dialog.getByText(/VERIFIKASI BENDAHARA/)).toHaveCount(0);
  });

  test("Pinjam inventaris: cek ketersediaan tanggal", async ({ page }) => {
    await page.goto("/balai?tab=inventaris");
    const item = page.locator("div.rounded-2xl", { has: page.getByText("Tenda Sarnafil 4x6 m", { exact: true }) }).last();
    await item.getByRole("button", { name: "Pinjam" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Tersedia \d+ unit|terpinjam penuh/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Ajukan pinjam" })).toBeVisible();
  });

  test("Kontak penting: tombol telepon & WA", async ({ page }) => {
    await page.goto("/balai?tab=kontak");
    await expect(page.getByText("Pos Satpam Cluster Madrid")).toBeVisible();
    await expect(page.getByText("Pengurus RT")).toBeVisible();
    expect(await page.locator('a[href^="tel:"]').count()).toBeGreaterThan(10);
    await expect(page.locator('a[href="tel:112"], a[href="tel:110"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Darurat di lingkungan/ })).toHaveAttribute("href", "/keamanan?tab=darurat");
  });
});
