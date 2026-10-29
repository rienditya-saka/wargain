import { expect, loginAs, serviceEnv, test } from "./fixtures";

// Balai Warga dari sisi pengurus (Ketua RT). Data uji ditandai "[E2E]" dan dihapus setelah selesai.
// Tag per project: mobile & desktop run in parallel and must not clean up each other's data.
const tagOf = (project: string) => `[E2E-${project}]`;

test.describe("Balai Warga — pengurus", () => {
  test.describe.configure({ mode: "serial" });

  test.afterAll(async ({}, info) => {
    const TAG = tagOf(info.project.name);
    const { url, key } = serviceEnv();
    if (!url || !key) return;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=representation" };
    const res = await fetch(`${url}/rest/v1/polls?title=like.${encodeURIComponent(`${TAG}*`)}`, { method: "DELETE", headers });
    const deleted = (await res.json().catch(() => [])) as { id: string }[];
    if (deleted.length) await fetch(`${url}/rest/v1/notifications?entityId=in.(${deleted.map((p) => p.id).join(",")})`, { method: "DELETE", headers });
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "ketua");
  });

  test("buat polling khusus pengurus → vote → tutup → hasil", async ({ page }, info) => {
    const title = `${tagOf(info.project.name)} Uji polling ${Date.now()}`;
    page.on("dialog", (d) => d.accept());
    await page.goto("/balai?tab=polling");
    await page.getByRole("button", { name: "Buat polling" }).click();
    const form = page.getByRole("dialog");
    await form.getByPlaceholder(/Setuju iuran keamanan naik/).fill(title);
    await form.getByText("Khusus pengurus RT").click();
    await form.getByRole("button", { name: "Buka polling" }).click();
    await expect(page.getByText("Polling dibuka & warga diberi notifikasi.")).toBeVisible();

    const card = page.locator('[id^="poll-"]').filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByText("Khusus pengurus")).toBeVisible();
    await card.getByRole("button", { name: "Setuju", exact: true }).click();
    await card.getByRole("button", { name: "Kirim suara" }).click();
    await expect(page.getByText("Suara Anda tercatat. Terima kasih!")).toBeVisible();
    await expect(card.getByText("100%")).toBeVisible();

    await card.getByRole("button", { name: "Tutup" }).click();
    await expect(page.getByText("Polling ditutup, hasil diumumkan.")).toBeVisible();
    await page.getByRole("button", { name: "Hasil polling" }).click();
    const closed = page.locator('[id^="poll-"]').filter({ hasText: title });
    await expect(closed.getByText(/🏆/)).toBeVisible();
  });

  test("validasi form polling (pilihan kembar ditolak)", async ({ page }, info) => {
    await page.goto("/balai?tab=polling");
    await page.getByRole("button", { name: "Buat polling" }).click();
    const form = page.getByRole("dialog");
    await form.getByPlaceholder(/Setuju iuran keamanan naik/).fill(`${tagOf(info.project.name)} kembar`);
    await form.getByPlaceholder("Pilihan 2").fill("Setuju");
    await form.getByRole("button", { name: "Buka polling" }).click();
    await expect(page.getByText("Pilihan jawaban tidak boleh sama.")).toBeVisible();
  });

  test("musyawarah: panel pengurus, QR absen & daftar hadir", async ({ page }) => {
    await page.goto("/balai?tab=musyawarah");
    await page.getByRole("button", { name: /Rapat Warga Bulanan/ }).last().click();
    const detail = page.getByRole("dialog").last();
    await expect(detail.getByText("PANEL PENGURUS")).toBeVisible();
    await expect(detail.getByRole("button", { name: /Mulai/ })).toBeVisible();
    await detail.getByRole("button", { name: /QR absen/ }).click();
    await expect(page.getByAltText("QR absen")).toBeVisible();
    await page.keyboard.press("Escape");
    await detail.getByRole("button", { name: /Daftar hadir/ }).click();
    await expect(page.getByPlaceholder("Cari nama atau blok...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tandai hadir" }).first()).toBeVisible();
  });

  test("galang dana: panel verifikasi bendahara terlihat", async ({ page }) => {
    await page.goto("/balai?tab=donasi");
    await page.getByRole("button", { name: /Renovasi Pos Ronda/ }).click();
    await expect(page.getByRole("dialog").getByText(/VERIFIKASI BENDAHARA/)).toBeVisible();
  });

  test("inventaris: kelola pinjaman menampilkan pengajuan", async ({ page }) => {
    await page.goto("/balai?tab=inventaris");
    await page.getByRole("button", { name: /Kelola pinjaman/ }).click();
    await expect(page).toHaveURL(/manage=1/);
    await expect(page.getByText(/Arisan keluarga|Pengajian rutin/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Setujui" }).first()).toBeVisible();
  });
});
