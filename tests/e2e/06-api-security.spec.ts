import { apiLogin, expect, serviceEnv, test } from "./fixtures";

// Aturan akses di server (cukup dijalankan sekali, tidak perlu per ukuran layar).
test.describe("Keamanan API", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "cukup sekali"));

  test("cron hanya bisa dipanggil dengan CRON_SECRET", async ({ request }) => {
    expect((await request.post("/api/cron/reminders?job=events")).status()).toBe(401);
    expect((await request.post("/api/cron/reminders?job=events", { headers: { Authorization: "Bearer salah" } })).status()).toBe(401);
    const { cronSecret } = serviceEnv();
    test.skip(!cronSecret, "CRON_SECRET tidak tersedia");
    const ok = await request.post("/api/cron/reminders?job=events", { headers: { Authorization: `Bearer ${cronSecret}` } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).success).toBe(true);
  });

  test("Balai: tanpa login ditolak", async ({ request }) => {
    expect((await request.get("/api/balai")).status()).toBe(401);
    expect((await request.post("/api/balai", { data: { action: "KABAR", title: "x" } })).status()).toBe(401);
  });

  test("Balai: warga tidak bisa aksi pengurus", async ({ request }) => {
    const w = await apiLogin(request, "warga");
    const post = (action: string, body: object) => request.post("/api/balai", { data: { userId: w.userId, action, ...body } });
    expect((await post("POLL_CREATE", { title: "x", options: ["a", "b"], closesAt: new Date(Date.now() + 86_400_000).toISOString() })).status()).toBe(403);
    expect((await post("MEETING_CREATE", { title: "x", location: "y", startAt: new Date().toISOString() })).status()).toBe(403);
    expect((await post("FUND_CREATE", { title: "x" })).status()).toBe(403);
    expect((await post("ITEM_SAVE", { name: "x" })).status()).toBe(403);
    expect((await post("CONTACT_SAVE", { name: "x", phone: "1" })).status()).toBe(403);

    const overview = await (await request.get(`/api/balai?userId=${w.userId}`)).json();
    const pending = overview.fundraisers.flatMap((f: any) => f.myDonations).find((d: any) => d.status === "MENUNGGU");
    if (pending) expect((await post("FUND", { op: "VERIFY", donationId: pending.id })).status()).toBe(403);
  });

  test("Musyawarah: kode absen palsu ditolak & kode tidak bocor ke warga", async ({ request }) => {
    const w = await apiLogin(request, "warga");
    const overview = await (await request.get(`/api/balai?userId=${w.userId}`)).json();
    const m = overview.meetings.find((x: any) => x.status === "TERJADWAL");
    test.skip(!m, "tidak ada musyawarah terjadwal");
    const bad = await request.post("/api/balai", { data: { userId: w.userId, action: "MEETING", op: "CHECKIN", meetingId: m.id, code: "palsu" } });
    expect(bad.status()).toBe(403);
    const att = await (await request.get(`/api/balai?userId=${w.userId}&view=attendees&meetingId=${m.id}`)).json();
    expect(att.checkinCode).toBeNull();
    expect(att.roster).toEqual([]);
  });

  test("Polling anonim tidak mengirim daftar pemilih", async ({ request }) => {
    const w = await apiLogin(request, "warga");
    const overview = await (await request.get(`/api/balai?userId=${w.userId}`)).json();
    for (const p of overview.polls.filter((x: any) => x.anonymous)) expect(p.result.voters).toBeUndefined();
  });

  test("Kartu: verifikasi butuh login", async ({ request }) => {
    const w = await apiLogin(request, "warga");
    const { token } = await (await request.get(`/api/kartu?userId=${w.userId}`)).json();
    expect((await request.get(`/api/kartu?token=${token}`)).status()).toBe(401);
  });

  test("Pesan error API memakai Bahasa Indonesia", async ({ request }) => {
    const r = await request.post("/api/balai", { data: { action: "POLL_CREATE" } });
    expect((await r.json()).error).toBe("Silakan login dulu.");
  });
});
