import { apiLogin, expect, loginAs, seedActivePoll, test } from "./fixtures";

test.describe("Kartu Warga Digital", () => {
  test("kartu saya menampilkan QR, nama & anggota KK", async ({ page }) => {
    const me = await loginAs(page, "warga");
    await page.goto("/kartu");
    await expect(page.getByAltText("QR kartu warga")).toBeVisible();
    await expect(page.getByText(me.fullName).first()).toBeVisible();
    await expect(page.getByText(/Anggota keluarga \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/WIB$/).first()).toBeVisible();
  });

  test("satpam/pengurus scan QR → WARGA TERVERIFIKASI", async ({ page, request }) => {
    const warga = await apiLogin(request, "warga");
    const { token } = await (await request.get(`/api/kartu?userId=${warga.userId}`)).json();
    await loginAs(page, "ketua");
    await page.goto(`/kartu?v=${token}`);
    await expect(page.getByText("WARGA TERVERIFIKASI")).toBeVisible();
    await expect(page.getByText(warga.fullName)).toBeVisible();
  });

  test("QR palsu → TIDAK VALID", async ({ page }) => {
    await loginAs(page, "ketua");
    await page.goto(`/kartu?v=${Buffer.from("user_x.2026-01-01.AAAAAAAAAAAAAAAA").toString("base64url")}`);
    await expect(page.getByText("TIDAK VALID")).toBeVisible();
    await expect(page.getByText(/palsu|tidak dikenal/i)).toBeVisible();
  });
});

test.describe("Feed terhubung ke Balai Warga", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "warga");
  });

  test("filter Musyawarah & Polling menampilkan kartu polling, musyawarah, galang dana", async ({ page }) => {
    await page.goto("/feed?filter=BALAI");
    await expect(page.getByText("🗳️ POLLING WARGA").first()).toBeVisible();
    await expect(page.getByText("🏛️ MUSYAWARAH WARGA").first()).toBeVisible();
    await expect(page.getByText(/GALANG DANA ·/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ikut berdonasi/ }).first()).toHaveAttribute("href", /\/balai\?tab=donasi&fund=/);
  });

  test("polling bisa dijawab langsung dari Feed", async ({ page }, info) => {
    const seeded = await seedActivePoll({ tag: `${info.project.name}-feed`, title: "Acara 17-an paling seru?", options: ["Lomba anak", "Jalan sehat"], maxChoices: 2 });
    try {
      await page.goto("/feed?filter=BALAI");
      const poll = page.locator("div.rounded-2xl", { hasText: "🗳️ POLLING WARGA" }).filter({ hasText: seeded.title }).first();
      await expect(poll).toBeVisible();
      await expect(poll.getByRole("button", { name: /Kirim suara|Ubah pilihan/ })).toBeVisible();
    } finally {
      await seeded.cleanup();
    }
  });

  test("filter Pengumuman memuat kabar warga", async ({ page }) => {
    await page.goto("/feed?filter=ANNOUNCEMENT");
    await expect(page.getByText(/KABAR DUKA|GANGGUAN LAYANAN|INFO WARGA/).first()).toBeVisible();
  });
});

test.describe("Pasar Warga", () => {
  test("katalog tampil & detail produk terbuka", async ({ page }) => {
    await loginAs(page, "warga");
    await page.goto("/pasar");
    await expect(page.getByPlaceholder("Cari nasi uduk, servis AC, kue...")).toBeVisible();
    await page.getByPlaceholder("Cari nasi uduk, servis AC, kue...").fill("nasi uduk");
    await page.getByRole("button", { name: /Nasi Uduk Komplit/ }).first().click();
    await expect(page.getByRole("dialog").getByText("Nasi Uduk Komplit").first()).toBeVisible();
  });
});
