import type { Locator, Page } from "@playwright/test";
import { expect, isMobile, loginAs, test, type Role } from "./fixtures";

// Dialog behaviour across the app:
//  • tablet/laptop: medium dialog centred on screen, animating up from below
//  • phone: bottom sheet, drag handle to full screen, vertical scroll bar
interface Case {
  name: string;
  role: Role;
  path: string;
  open: (page: Page) => Promise<void>;
  maxWidth: number; // expected desktop max width of this dialog
}

const CASES: Case[] = [
  { name: "Feed · buat post", role: "warga", path: "/feed", open: (p) => p.getByRole("button", { name: /Apa kabar/ }).click(), maxWidth: 560 },
  { name: "Balai · tulis kabar", role: "warga", path: "/balai", open: (p) => p.getByRole("button", { name: "Tulis kabar" }).click(), maxWidth: 560 },
  { name: "Balai · detail musyawarah", role: "warga", path: "/balai?tab=musyawarah", open: (p) => p.getByRole("button", { name: /Rapat Warga Bulanan/ }).last().click(), maxWidth: 760 },
  {
    name: "Pasar · detail produk",
    role: "warga",
    path: "/pasar",
    open: async (p) => {
      await p.getByPlaceholder("Cari nasi uduk, servis AC, kue...").fill("nasi uduk");
      await p.getByRole("button", { name: /Nasi Uduk Komplit/ }).first().click();
    },
    maxWidth: 560,
  },
  { name: "Surat · ajukan surat", role: "warga", path: "/surat", open: (p) => p.getByRole("button", { name: /Ajukan Surat Baru/ }).first().click(), maxWidth: 760 },
  {
    name: "Kas · catat pengeluaran",
    role: "ketua",
    path: "/kas",
    open: async (p) => {
      // tab Buku Kas: text tab on wide screens, icon bar ("Buku Kas RT") on phones
      await p.getByRole("button", { name: /Riwayat Transaksi Kas|Buku Kas RT/ }).filter({ visible: true }).first().click();
      await p.getByRole("button", { name: /Catat Pengeluaran/ }).filter({ visible: true }).first().click();
    },
    maxWidth: 560,
  },
];

const dialog = (page: Page) => page.locator("[data-app-sheet-root] [role=dialog]").last();

async function openCase(page: Page, c: Case) {
  await loginAs(page, c.role);
  await page.goto(c.path);
  await page.waitForLoadState("networkidle");
  await c.open(page);
  const d = dialog(page);
  await expect(d).toBeVisible();
  await page.waitForTimeout(700); // let the spring settle
  return d;
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error("dialog has no box");
  return b;
}

test.describe("Dialog — laptop & tablet", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "khusus layar lebar"));

  for (const c of CASES) {
    test(`${c.name}: dialog medium di tengah layar`, async ({ page }) => {
      const d = await openCase(page, c);
      const b = await box(d);
      const vp = page.viewportSize()!;
      expect(Math.abs(b.x + b.width / 2 - vp.width / 2), "tengah horizontal").toBeLessThan(2);
      expect(Math.abs(b.y + b.height / 2 - vp.height / 2), "tengah vertikal").toBeLessThan(2);
      expect(b.width).toBeLessThanOrEqual(c.maxWidth + 1);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
    });
  }

  test("tablet (iPad portrait) juga memakai dialog tengah", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    const d = await openCase(page, CASES[1]);
    const b = await box(d);
    expect(Math.abs(b.y + b.height / 2 - 590)).toBeLessThan(2);
    expect(b.width).toBeLessThanOrEqual(561);
  });

  test("animasi masuk: naik dari bawah ke tengah", async ({ page }) => {
    await loginAs(page, "warga");
    await page.goto("/balai");
    await page.waitForLoadState("networkidle");
    // record the dialog's vertical position on every frame while it animates in
    await page.evaluate(() => {
      (window as any).__tops = [];
      const tick = () => {
        const el = document.querySelector("[data-app-sheet-root] [role=dialog]");
        if (el) (window as any).__tops.push(el.getBoundingClientRect().top);
        if ((window as any).__tops.length < 40) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole("button", { name: "Tulis kabar" }).click();
    await page.waitForTimeout(900);
    const tops: number[] = await page.evaluate(() => (window as any).__tops);
    expect(tops.length).toBeGreaterThan(3);
    expect(tops[0], "mulai lebih bawah").toBeGreaterThan(tops[tops.length - 1] + 15);
  });

  test("scroll bar vertikal saat isi panjang", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 620 });
    const d = await openCase(page, CASES[1]);
    const body = d.locator(".app-sheet-body");
    const s = await body.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, oy: getComputedStyle(el).overflowY, sw: getComputedStyle(el).scrollbarWidth }));
    expect(s.sh).toBeGreaterThan(s.ch);
    expect(s.oy).toBe("auto");
    expect(s.sw).toBe("thin");
  });

  test("Esc hanya menutup dialog paling atas", async ({ page }) => {
    await loginAs(page, "ketua");
    await page.goto("/balai?tab=musyawarah");
    await page.getByRole("button", { name: /Rapat Warga Bulanan/ }).last().click();
    await page.getByRole("button", { name: /QR absen/ }).click();
    await expect(page.getByAltText("QR absen")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByAltText("QR absen")).toHaveCount(0);
    await expect(page.getByText("PANEL PENGURUS")).toBeVisible();
  });
});

test.describe("Bottom sheet — HP", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "khusus HP"));

  const handle = (page: Page) => page.locator("[data-app-sheet-root] .app-sheet-handle").last();

  async function dragHandle(page: Page, toY: number, steps = 12) {
    const h = await box(handle(page));
    const x = h.x + h.width / 2;
    const y = h.y + h.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, toY, { steps });
    await page.mouse.up();
    await page.waitForTimeout(700);
  }

  for (const c of CASES) {
    test(`${c.name}: menempel di bawah, lebar penuh, tidak melebihi 72% layar`, async ({ page }) => {
      const d = await openCase(page, c);
      expect(isMobile(page)).toBe(true);
      const b = await box(d);
      const vp = page.viewportSize()!;
      expect(Math.abs(b.y + b.height - vp.height), "menempel di bawah").toBeLessThan(2);
      expect(Math.abs(b.width - vp.width)).toBeLessThan(2);
      expect(b.height).toBeLessThanOrEqual(vp.height * 0.72 + 2);
      await expect(handle(page)).toBeVisible();
    });
  }

  test("tarik handle ke atas → layar penuh, tarik ke bawah → kembali, tarik jauh → tertutup", async ({ page }) => {
    const d = await openCase(page, CASES[1]);
    const vp = page.viewportSize()!;
    const before = (await box(d)).height;

    await dragHandle(page, 20);
    const full = await box(d);
    expect(full.height, "layar penuh").toBeGreaterThan(vp.height - 12);
    expect(full.y).toBeLessThan(12);

    await dragHandle(page, vp.height * 0.45);
    expect(Math.abs((await box(d)).height - before), "kembali ke tinggi awal").toBeLessThan(4);

    await dragHandle(page, vp.height - 5, 8);
    await expect(dialog(page)).toHaveCount(0);
  });

  test("ketuk handle → layar penuh ↔ kembali", async ({ page }) => {
    const d = await openCase(page, CASES[2]);
    const vp = page.viewportSize()!;
    await handle(page).click();
    await page.waitForTimeout(700);
    expect((await box(d)).height).toBeGreaterThan(vp.height - 12);
    await handle(page).click();
    await page.waitForTimeout(700);
    expect((await box(d)).height).toBeLessThanOrEqual(vp.height * 0.72 + 2);
  });

  test("scroll bar vertikal terlihat & bergerak saat isi di-scroll", async ({ page }) => {
    const d = await openCase(page, CASES[1]);
    const bar = d.getByTestId("sheet-scrollbar");
    await expect(bar).toBeVisible();
    const thumb = bar.locator("div");
    const t0 = (await box(thumb)).y;
    await d.locator(".app-sheet-body [class*=overflow-y-auto]").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(200);
    expect((await box(thumb)).y, "thumb turun saat di-scroll").toBeGreaterThan(t0 + 10);
  });

  test("halaman di belakang tidak ikut ter-scroll saat sheet terbuka", async ({ page }) => {
    await openCase(page, CASES[0]);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });
});
