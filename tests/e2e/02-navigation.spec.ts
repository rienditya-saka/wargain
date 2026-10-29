import { expect, isMobile, loginAs, test } from "./fixtures";

// Every module opens for a logged-in warga without crashing and without horizontal scroll on phones.
const PAGES: { path: string; text: RegExp | string }[] = [
  { path: "/feed", text: /Feed|Beranda/ },
  { path: "/balai", text: "Suara & kabar warga, satu tempat" },
  { path: "/sosial", text: /Kegiatan/ },
  { path: "/keamanan", text: /Keamanan|Panic/ },
  { path: "/pasar", text: "Belanja & booking jasa dari tetangga" },
  { path: "/kas", text: /Kas|Tagihan|Iuran/ },
  { path: "/surat", text: /Surat/ },
  { path: "/kependudukan", text: /Kependudukan|Warga|Rumah/ },
  { path: "/kartu", text: "KARTU WARGA DIGITAL" },
];

test.describe("Navigasi semua modul (warga)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "warga");
  });

  for (const p of PAGES) {
    test(`${p.path} terbuka`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await expect(page).not.toHaveURL(/\/login/);
      // sidebar text is hidden on phones, so match only visible elements
      await expect(page.getByText(p.text).filter({ visible: true }).first()).toBeVisible();
      if (isMobile(page)) {
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, "tidak boleh ada scroll horizontal di HP").toBeLessThanOrEqual(1);
      }
    });
  }

  test("menu (drawer di HP / sidebar di laptop) berisi Balai Warga & Kartu Warga", async ({ page }) => {
    await page.goto("/pasar");
    if (isMobile(page)) await page.getByRole("button", { name: "Buka menu utama" }).click();
    const balai = page.getByRole("link", { name: /Balai Warga/ }).last();
    await expect(balai).toBeVisible();
    await expect(page.getByRole("link", { name: /Kartu Warga Digital/ }).last()).toBeVisible();
    await balai.click();
    await expect(page).toHaveURL(/\/balai/);
  });

  test("PWA: manifest & service worker tersedia", async ({ request }) => {
    const m = await request.get("/manifest.webmanifest");
    expect(m.status()).toBe(200);
    expect((await m.json()).name).toMatch(/WargaIn/);
    expect((await request.get("/sw.js")).status()).toBe(200);
  });
});
