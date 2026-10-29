import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications/server";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { publishFeedPost, updateFeedPostByEntity } from "@/lib/feed/server";
import { loadCommunityContext, CommunityContext } from "@/lib/community/context";
import {
  ACTIVE_LOAN, Attendee, CONTACT_META, Contact, Decision, Donation, FUND_META, Fundraiser, FundraiserWithStats, INVENTORY_META, InventoryItem,
  KABAR_META, KabarCategory, Loan, Meeting, MeetingWithStats, Poll, PollWithResult, fmtDate, fmtDateTime, rupiah,
} from "./types";

export class BalaiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface Actor {
  id: string;
  fullName: string;
  role: string;
  communityId: string;
  houseBlock: string | null;
  phone: string | null;
  citizenId: string | null;
}

export async function loadActor(userId?: string | null): Promise<Actor> {
  if (!userId) throw new BalaiError("Silakan login dulu.", 401);
  const { data } = await supabaseAdmin.from("users").select("id, fullName, role, communityId, houseBlock, phone, citizenId").eq("id", userId).maybeSingle();
  if (!data) throw new BalaiError("Akun tidak ditemukan.", 401);
  return data as Actor;
}

export const isPengurus = (a: { role: string }) => PENGURUS_ROLES.includes(a.role);
function requirePengurus(a: Actor) {
  if (!isPengurus(a)) throw new BalaiError("Hanya pengurus RT yang dapat melakukan ini.", 403);
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const author = (a: Actor) => ({ id: a.id, name: a.fullName, role: a.role, block: a.houseBlock });
const houseCount = (ctx: CommunityContext) => new Set(ctx.users.map((u) => u.houseKey).filter(Boolean)).size;
const clean = (s: unknown, max = 2000) => String(s ?? "").trim().slice(0, max);

async function scoped<T>(table: string, id: string, communityId: string, label: string): Promise<T> {
  const { data } = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
  if (!data || data.communityId !== communityId) throw new BalaiError(`${label} tidak ditemukan.`, 404);
  return data as T;
}

// Kas RT integration (financial_records is the ledger read by /kas).
async function recordIncome(communityId: string, category: string, title: string, amount: number, by: string, proofUrl?: string | null, notes?: string) {
  const id = uid("fin");
  const { error } = await supabaseAdmin.from("financial_records").insert({
    id, communityId, type: "INCOME", category, title, amount, recordedBy: by, proofUrl: proofUrl ?? null, notes: notes ?? null, transactionDate: now(),
  });
  if (error) throw new BalaiError(`Gagal mencatat ke Kas: ${error.message}`, 500);
  return id;
}

// ─────────────────────────────── KABAR TERBARU ───────────────────────────────

export async function postKabar(actor: Actor, body: any) {
  const category = (body.category in KABAR_META ? body.category : "INFO") as KabarCategory;
  const title = clean(body.title, 140);
  if (!title) throw new BalaiError("Judul kabar wajib diisi.");
  const meta = KABAR_META[category];
  const pengurus = isPengurus(actor);
  const kabarId = uid("kabar");
  const details = {
    person: clean(body.person, 120) || null,
    eventDate: body.eventDate || null,
    location: clean(body.location, 200) || null,
    contactPhone: clean(body.contactPhone, 30) || actor.phone || null,
  };
  const pinDays = pengurus && body.pinDays ? Math.min(14, Math.max(1, Number(body.pinDays))) : 0;
  const postId = await publishFeedPost({
    communityId: actor.communityId,
    module: "BALAI",
    type: "KABAR",
    title,
    content: clean(body.content, 4000),
    images: Array.isArray(body.images) ? body.images.slice(0, 4) : [],
    payload: { category, ...details, official: pengurus },
    entity: { type: "KABAR", id: kabarId },
    author: author(actor),
    pinnedUntil: pinDays ? new Date(Date.now() + pinDays * 86_400_000).toISOString() : category === "DUKA" ? new Date(Date.now() + 3 * 86_400_000).toISOString() : null,
  });
  if (!postId) throw new BalaiError("Gagal menerbitkan kabar.", 500);

  // Official news & kabar duka/gangguan reach everyone; other resident posts only appear in the feed.
  if (pengurus || category === "DUKA" || category === "SAKIT" || category === "PEMADAMAN") {
    await notify({
      communityId: actor.communityId,
      type: category === "DUKA" ? "BALAI_KABAR_DUKA" : "BALAI_KABAR",
      title: `${meta.emoji} ${meta.label}: ${title}`,
      body: clean(body.content, 160) || details.person || "",
      link: `/feed?post=${postId}`,
      entity: { type: "KABAR", id: kabarId },
      target: { all: true },
      excludeUserIds: [actor.id],
      actorName: actor.fullName,
      priority: meta.priority,
    });
  }

  // Kabar duka: optionally open a santunan fundraiser right away.
  let fundraiser: Fundraiser | null = null;
  if (category === "DUKA" && body.openSantunan && pengurus) {
    fundraiser = await createFundraiser(actor, {
      title: `Santunan duka ${details.person ?? title}`,
      story: `Mari bersama meringankan beban keluarga yang ditinggalkan. ${clean(body.content, 600)}`,
      category: "DUKA",
      beneficiary: details.person ? `Keluarga alm. ${details.person}` : null,
      targetAmount: Number(body.santunanTarget) || 0,
      deadline: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      silent: true,
    });
  }
  return { postId, fundraiser };
}

// ─────────────────────────────── POLLING ───────────────────────────────

function pollAudienceUsers(ctx: CommunityContext, p: Pick<Poll, "audience">) {
  return p.audience === "PENGURUS" ? ctx.users.filter((u) => PENGURUS_ROLES.includes(u.role)) : ctx.users;
}

export async function createPoll(actor: Actor, body: any) {
  requirePengurus(actor);
  const title = clean(body.title, 200);
  const labels: string[] = (Array.isArray(body.options) ? body.options : []).map((o: any) => clean(typeof o === "string" ? o : o?.label, 120)).filter(Boolean);
  if (!title) throw new BalaiError("Pertanyaan polling wajib diisi.");
  if (labels.length < 2) throw new BalaiError("Minimal 2 pilihan jawaban.");
  if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) throw new BalaiError("Pilihan jawaban tidak boleh sama.");
  const closesAt = new Date(body.closesAt);
  if (isNaN(closesAt.getTime()) || closesAt.getTime() < Date.now() + 5 * 60_000) throw new BalaiError("Batas waktu minimal 5 menit dari sekarang.");
  const options = labels.slice(0, 10).map((label, i) => ({ id: `o${i + 1}`, label }));
  const poll: Poll = {
    id: uid("poll"),
    communityId: actor.communityId,
    title,
    description: clean(body.description, 2000),
    options,
    maxChoices: Math.min(options.length, Math.max(1, Number(body.maxChoices) || 1)),
    anonymous: !!body.anonymous,
    voteScope: body.voteScope === "HOUSE" ? "HOUSE" : "USER",
    audience: body.audience === "PENGURUS" ? "PENGURUS" : "SEMUA",
    closesAt: closesAt.toISOString(),
    status: "AKTIF",
    meetingId: body.meetingId || null,
    createdBy: actor.id,
    createdAt: now(),
  };
  if (poll.meetingId) await scoped<Meeting>("meetings", poll.meetingId, actor.communityId, "Musyawarah");
  const { error } = await supabaseAdmin.from("polls").insert(poll);
  if (error) throw new BalaiError(error.message, 500);

  const scopeLabel = poll.voteScope === "HOUSE" ? "1 rumah 1 suara" : "1 akun 1 suara";
  if (poll.audience === "SEMUA") {
    await publishFeedPost({
      communityId: actor.communityId, module: "BALAI", type: "POLL", title: poll.title, content: poll.description,
      payload: { pollId: poll.id, closesAt: poll.closesAt, voteScope: poll.voteScope, anonymous: poll.anonymous, options: poll.options, maxChoices: poll.maxChoices },
      entity: { type: "POLL", id: poll.id }, author: author(actor),
    });
  }
  await notify({
    communityId: actor.communityId, type: "BALAI_POLL_NEW",
    title: `🗳️ Polling baru: ${poll.title}`,
    body: `${scopeLabel}${poll.anonymous ? " · anonim" : ""} · ditutup ${fmtDateTime(poll.closesAt)}`,
    link: `/balai?tab=polling&poll=${poll.id}`, entity: { type: "POLL", id: poll.id },
    target: poll.audience === "PENGURUS" ? { roles: PENGURUS_ROLES } : { all: true }, excludeUserIds: [actor.id], actorName: actor.fullName,
  });
  return poll;
}

export async function votePoll(actor: Actor, pollId: string, optionIds: string[]) {
  const poll = await scoped<Poll>("polls", pollId, actor.communityId, "Polling");
  if (poll.status !== "AKTIF" || new Date(poll.closesAt).getTime() <= Date.now()) throw new BalaiError("Polling sudah ditutup.", 409);
  if (poll.audience === "PENGURUS" && !isPengurus(actor)) throw new BalaiError("Polling ini khusus pengurus.", 403);
  const valid = new Set(poll.options.map((o) => o.id));
  const picks = Array.from(new Set((optionIds ?? []).filter((id) => valid.has(id))));
  if (!picks.length) throw new BalaiError("Pilih minimal satu jawaban.");
  if (picks.length > poll.maxChoices) throw new BalaiError(`Maksimal ${poll.maxChoices} pilihan.`);

  let voterKey = actor.id;
  if (poll.voteScope === "HOUSE") {
    const ctx = await loadCommunityContext(actor.communityId);
    const me = ctx.users.find((u) => u.id === actor.id);
    if (!me?.houseKey) throw new BalaiError("Akun Anda belum terhubung ke rumah/KK. Hubungi sekretaris RT.", 409);
    voterKey = me.houseKey;
  }
  const { error } = await supabaseAdmin.from("poll_votes").upsert(
    { pollId, communityId: actor.communityId, userId: actor.id, voterKey, voterName: actor.fullName, houseBlock: actor.houseBlock, optionIds: picks, updatedAt: now() },
    { onConflict: "pollId,voterKey" }
  );
  if (error) throw new BalaiError(error.message, 500);
  // touch the poll so Realtime subscribers refresh results
  await supabaseAdmin.from("polls").update({ updatedAt: now() }).eq("id", pollId);
  return pollResults(actor, [poll]).then((r) => r[0]);
}

export async function closePoll(actor: Actor, pollId: string) {
  requirePengurus(actor);
  const poll = await scoped<Poll>("polls", pollId, actor.communityId, "Polling");
  await supabaseAdmin.from("polls").update({ status: "DITUTUP", closesAt: poll.status === "AKTIF" && new Date(poll.closesAt) > new Date() ? now() : poll.closesAt, updatedAt: now() }).eq("id", pollId);
  const [res] = await pollResults(actor, [{ ...poll, status: "DITUTUP" }]);
  await announcePollResult(res);
  return res;
}

async function announcePollResult(p: PollWithResult) {
  const total = p.result.totalVoters;
  const ranked = [...p.options].sort((a, b) => (p.result.counts[b.id] ?? 0) - (p.result.counts[a.id] ?? 0));
  const top = ranked[0];
  const topCount = p.result.counts[top.id] ?? 0;
  const tie = ranked.length > 1 && (p.result.counts[ranked[1].id] ?? 0) === topCount && topCount > 0;
  const summary = total === 0 ? "Tidak ada suara masuk." : tie ? `Hasil seri di ${topCount} suara.` : `Terbanyak: "${top.label}" (${topCount} dari ${total} suara, ${Math.round((topCount / total) * 100)}%).`;
  await updateFeedPostByEntity(p.communityId, "BALAI", { type: "POLL", id: p.id }, { payload: { closed: true, summary } });
  await notify({
    communityId: p.communityId, type: "BALAI_POLL_CLOSED",
    title: `📊 Hasil polling: ${p.title}`, body: `${summary} Partisipasi ${total}/${p.result.eligible}.`,
    link: `/balai?tab=polling&poll=${p.id}`, entity: { type: "POLL", id: p.id },
    target: p.audience === "PENGURUS" ? { roles: PENGURUS_ROLES } : { all: true }, dedupeKey: `poll-closed:${p.id}`,
  });
}

// Close expired polls (called lazily on read and by cron).
export async function closeExpiredPolls(communityId?: string) {
  let q = supabaseAdmin.from("polls").select("*").eq("status", "AKTIF").lte("closesAt", now());
  if (communityId) q = q.eq("communityId", communityId);
  const { data } = await q;
  for (const p of (data ?? []) as Poll[]) {
    const { data: flipped } = await supabaseAdmin.from("polls").update({ status: "DITUTUP", updatedAt: now() }).eq("id", p.id).eq("status", "AKTIF").select("id");
    if (!flipped?.length) continue; // another request already closed it
    const [res] = await pollResults(null, [{ ...p, status: "DITUTUP" }]);
    await announcePollResult(res);
  }
  return data?.length ?? 0;
}

export async function pollResults(actor: Actor | null, polls: Poll[], ctx?: CommunityContext): Promise<PollWithResult[]> {
  if (!polls.length) return [];
  const { data: votes } = await supabaseAdmin.from("poll_votes").select("pollId, userId, voterKey, voterName, houseBlock, optionIds").in("pollId", polls.map((p) => p.id));
  const context = ctx ?? (await loadCommunityContext(polls[0].communityId));
  const me = actor ? context.users.find((u) => u.id === actor.id) : null;
  const creators = new Map(context.users.map((u) => [u.id, u.fullName]));
  return polls.map((p) => {
    const vs = (votes ?? []).filter((v) => v.pollId === p.id);
    const counts: Record<string, number> = {};
    p.options.forEach((o) => (counts[o.id] = 0));
    vs.forEach((v) => (v.optionIds as string[]).forEach((id) => (counts[id] = (counts[id] ?? 0) + 1)));
    const myKey = p.voteScope === "HOUSE" ? me?.houseKey : actor?.id;
    const mine = myKey ? vs.find((v) => v.voterKey === myKey) : undefined;
    const audience = pollAudienceUsers(context, p);
    const eligible = p.voteScope === "HOUSE" ? new Set(audience.map((u) => u.houseKey).filter(Boolean)).size : audience.length;
    return {
      ...p,
      creatorName: p.createdBy ? creators.get(p.createdBy) ?? null : null,
      result: {
        counts,
        totalVoters: vs.length,
        eligible,
        myChoice: mine ? (mine.optionIds as string[]) : null,
        votedBy: mine && mine.userId !== actor?.id ? mine.voterName : null,
        voters: p.anonymous ? undefined : vs.map((v) => ({ name: v.voterName, houseBlock: v.houseBlock, optionIds: v.optionIds as string[] })),
      },
    };
  });
}

// ─────────────────────────────── MUSYAWARAH ───────────────────────────────

const meetingLink = (id: string) => `/balai?tab=musyawarah&meeting=${id}`;
const AUDIENCE_LABEL = { SEMUA: "Seluruh warga", KEPALA_KELUARGA: "Perwakilan tiap KK", PENGURUS: "Pengurus RT" } as const;

export function checkinCode(meetingId: string) {
  return createHash("sha256").update(`${meetingId}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "wargain"}`).digest("hex").slice(0, 10);
}

function meetingTarget(m: Pick<Meeting, "audience">) {
  return m.audience === "PENGURUS" ? { roles: PENGURUS_ROLES } : { all: true };
}

function parseAgenda(raw: any): Meeting["agenda"] {
  return (Array.isArray(raw) ? raw : [])
    .map((a: any, i: number) => ({ id: a?.id || `a${i + 1}`, title: clean(typeof a === "string" ? a : a?.title, 200), presenter: clean(a?.presenter, 80) || undefined }))
    .filter((a) => a.title)
    .slice(0, 20);
}

function meetingFeedPayload(m: Meeting) {
  return { meetingId: m.id, startAt: m.startAt, endAt: m.endAt, location: m.location, onlineUrl: m.onlineUrl, agenda: m.agenda, audience: m.audience, status: m.status, decisions: m.decisions };
}

export async function createMeeting(actor: Actor, body: any) {
  requirePengurus(actor);
  const title = clean(body.title, 200);
  const location = clean(body.location, 200);
  const startAt = new Date(body.startAt);
  if (!title || !location) throw new BalaiError("Judul dan lokasi wajib diisi.");
  if (isNaN(startAt.getTime())) throw new BalaiError("Waktu mulai tidak valid.");
  const endAt = body.endAt ? new Date(body.endAt) : null;
  if (endAt && endAt <= startAt) throw new BalaiError("Waktu selesai harus setelah waktu mulai.");
  const m: Meeting = {
    id: uid("mtg"), communityId: actor.communityId, title, description: clean(body.description, 3000),
    startAt: startAt.toISOString(), endAt: endAt?.toISOString() ?? null, location, onlineUrl: clean(body.onlineUrl, 400) || null,
    agenda: parseAgenda(body.agenda), audience: ["SEMUA", "KEPALA_KELUARGA", "PENGURUS"].includes(body.audience) ? body.audience : "SEMUA",
    status: "TERJADWAL", minutes: null, decisions: [], cancelReason: null, createdBy: actor.id, createdAt: now(),
  };
  const { error } = await supabaseAdmin.from("meetings").insert(m);
  if (error) throw new BalaiError(error.message, 500);
  if (m.audience !== "PENGURUS") {
    await publishFeedPost({
      communityId: m.communityId, module: "BALAI", type: "MEETING", title: m.title, content: m.description,
      payload: meetingFeedPayload(m), entity: { type: "MEETING", id: m.id }, author: author(actor),
    });
  }
  await notify({
    communityId: m.communityId, type: "BALAI_MEETING_NEW",
    title: `🏛️ Undangan musyawarah: ${m.title}`,
    body: `${fmtDateTime(m.startAt)} WIB · ${m.location} · ${AUDIENCE_LABEL[m.audience]}. Konfirmasi kehadiran Anda.`,
    link: meetingLink(m.id), entity: { type: "MEETING", id: m.id }, target: meetingTarget(m), excludeUserIds: [actor.id], actorName: actor.fullName,
  });
  return m;
}

export async function meetingAction(actor: Actor, meetingId: string, action: string, body: any) {
  const m = await scoped<Meeting>("meetings", meetingId, actor.communityId, "Musyawarah");
  const patch: Partial<Meeting> & { updatedAt: string } = { updatedAt: now() };

  switch (action) {
    case "RSVP": {
      if (m.status === "SELESAI" || m.status === "DIBATALKAN") throw new BalaiError("Musyawarah sudah tidak menerima konfirmasi.", 409);
      const rsvp = ["HADIR", "MUNGKIN", "TIDAK"].includes(body.rsvp) ? body.rsvp : "HADIR";
      await supabaseAdmin.from("meeting_attendees").upsert(
        { meetingId, communityId: m.communityId, userId: actor.id, name: actor.fullName, houseBlock: actor.houseBlock, rsvp, updatedAt: now() },
        { onConflict: "meetingId,userId" }
      );
      break;
    }
    case "CHECKIN": {
      // self check-in by scanning the QR shown by the pengurus
      if (body.code !== checkinCode(m.id)) throw new BalaiError("Kode absen tidak valid. Scan ulang QR dari pengurus.", 403);
      const start = new Date(m.startAt).getTime();
      const end = m.endAt ? new Date(m.endAt).getTime() : start + 4 * 3_600_000;
      if (m.status === "DIBATALKAN" || Date.now() < start - 3_600_000 || Date.now() > end + 2 * 3_600_000) throw new BalaiError("Absen hanya bisa saat musyawarah berlangsung.", 409);
      await checkIn(m, { id: actor.id, name: actor.fullName, houseBlock: actor.houseBlock });
      break;
    }
    case "CHECKIN_USER": {
      requirePengurus(actor);
      const { data: u } = await supabaseAdmin.from("users").select("id, fullName, houseBlock, communityId").eq("id", body.targetUserId).maybeSingle();
      if (!u || u.communityId !== m.communityId) throw new BalaiError("Warga tidak ditemukan.", 404);
      if (body.undo) await supabaseAdmin.from("meeting_attendees").update({ checkedInAt: null, updatedAt: now() }).eq("meetingId", m.id).eq("userId", u.id);
      else await checkIn(m, { id: u.id, name: u.fullName, houseBlock: u.houseBlock });
      break;
    }
    case "UPDATE": {
      requirePengurus(actor);
      if (m.status === "SELESAI" || m.status === "DIBATALKAN") throw new BalaiError("Musyawarah sudah ditutup.", 409);
      const startAt = body.startAt ? new Date(body.startAt).toISOString() : m.startAt;
      const location = clean(body.location ?? m.location, 200);
      Object.assign(patch, {
        title: clean(body.title ?? m.title, 200), description: clean(body.description ?? m.description, 3000), startAt,
        endAt: body.endAt ? new Date(body.endAt).toISOString() : body.endAt === null ? null : m.endAt, location,
        onlineUrl: body.onlineUrl !== undefined ? clean(body.onlineUrl, 400) || null : m.onlineUrl,
        agenda: body.agenda ? parseAgenda(body.agenda) : m.agenda,
      });
      if (startAt !== m.startAt || location !== m.location) {
        await notify({
          communityId: m.communityId, type: "BALAI_MEETING_UPDATED", title: `🔁 Jadwal musyawarah berubah: ${patch.title}`,
          body: `Sekarang ${fmtDateTime(startAt)} WIB · ${location}.`, link: meetingLink(m.id), entity: { type: "MEETING", id: m.id },
          target: meetingTarget(m), excludeUserIds: [actor.id],
        });
      }
      break;
    }
    case "START":
      requirePengurus(actor);
      if (m.status !== "TERJADWAL") throw new BalaiError("Musyawarah tidak dalam status terjadwal.", 409);
      patch.status = "BERLANGSUNG";
      await notify({
        communityId: m.communityId, type: "BALAI_MEETING_REMINDER", title: `🔴 Musyawarah dimulai: ${m.title}`,
        body: `${m.location}${m.onlineUrl ? " · bisa ikut online" : ""}. Jangan lupa absen dengan scan QR.`,
        link: meetingLink(m.id), entity: { type: "MEETING", id: m.id }, target: meetingTarget(m), dedupeKey: `mtg-start:${m.id}`, priority: "HIGH",
      });
      break;
    case "CANCEL":
      requirePengurus(actor);
      if (m.status === "SELESAI") throw new BalaiError("Musyawarah sudah selesai.", 409);
      patch.status = "DIBATALKAN";
      patch.cancelReason = clean(body.reason, 400) || null;
      await notify({
        communityId: m.communityId, type: "BALAI_MEETING_UPDATED", title: `❌ Musyawarah dibatalkan: ${m.title}`,
        body: patch.cancelReason ?? "Informasi jadwal pengganti menyusul.", link: meetingLink(m.id), entity: { type: "MEETING", id: m.id },
        target: meetingTarget(m), excludeUserIds: [actor.id], priority: "HIGH",
      });
      break;
    case "SAVE_MINUTES":
    case "FINISH": {
      requirePengurus(actor);
      if (m.status === "DIBATALKAN") throw new BalaiError("Musyawarah dibatalkan.", 409);
      patch.minutes = clean(body.minutes ?? m.minutes, 20000) || null;
      if (Array.isArray(body.decisions)) {
        patch.decisions = body.decisions
          .map((d: any, i: number): Decision => ({ id: d.id || `d${i + 1}_${Date.now().toString(36)}`, text: clean(d.text, 400), pic: clean(d.pic, 80) || undefined, dueDate: d.dueDate || null, done: !!d.done }))
          .filter((d: Decision) => d.text)
          .slice(0, 30);
      }
      if (action === "FINISH") {
        if (m.status === "SELESAI") throw new BalaiError("Musyawarah sudah selesai.", 409);
        patch.status = "SELESAI";
        if (!m.endAt) patch.endAt = now();
        const decisions = patch.decisions ?? m.decisions;
        const { count } = await supabaseAdmin.from("meeting_attendees").select("id", { count: "exact", head: true }).eq("meetingId", m.id).not("checkedInAt", "is", null);
        await notify({
          communityId: m.communityId, type: "BALAI_MEETING_MINUTES", title: `📝 Notulen & hasil musyawarah: ${m.title}`,
          body: `${decisions.length} keputusan · ${count ?? 0} warga hadir. Baca selengkapnya.`, link: meetingLink(m.id), entity: { type: "MEETING", id: m.id },
          target: { all: true }, dedupeKey: `mtg-minutes:${m.id}`,
        });
        // close polls opened during the meeting
        const { data: open } = await supabaseAdmin.from("polls").select("id").eq("meetingId", m.id).eq("status", "AKTIF");
        for (const p of open ?? []) await closePoll(actor, p.id);
      }
      break;
    }
    case "TOGGLE_DECISION": {
      requirePengurus(actor);
      patch.decisions = m.decisions.map((d) => (d.id === body.decisionId ? { ...d, done: !d.done } : d));
      break;
    }
    default:
      throw new BalaiError("Aksi tidak dikenal.");
  }

  // attendees table isn't in Realtime; touching the meeting row refreshes everyone's view
  const { data: updated, error } = await supabaseAdmin.from("meetings").update(patch).eq("id", m.id).select("*").single();
  if (error) throw new BalaiError(error.message, 500);
  const u = updated as Meeting;
  if (u.audience !== "PENGURUS") {
    await updateFeedPostByEntity(u.communityId, "BALAI", { type: "MEETING", id: u.id }, { title: u.title, content: u.description, payload: meetingFeedPayload(u) });
  }
  return u;
}

async function checkIn(m: Meeting, who: { id: string; name: string; houseBlock: string | null }) {
  const { data: existing } = await supabaseAdmin.from("meeting_attendees").select("id, checkedInAt").eq("meetingId", m.id).eq("userId", who.id).maybeSingle();
  if (existing?.checkedInAt) return;
  await supabaseAdmin.from("meeting_attendees").upsert(
    { meetingId: m.id, communityId: m.communityId, userId: who.id, name: who.name, houseBlock: who.houseBlock, rsvp: "HADIR", checkedInAt: now(), updatedAt: now() },
    { onConflict: "meetingId,userId" }
  );
}

export async function meetingsWithStats(actor: Actor, meetings: Meeting[], ctx: CommunityContext, polls: PollWithResult[]): Promise<MeetingWithStats[]> {
  if (!meetings.length) return [];
  const { data: atts } = await supabaseAdmin.from("meeting_attendees").select("*").in("meetingId", meetings.map((m) => m.id));
  const houseOf = new Map(ctx.users.map((u) => [u.id, u.houseKey]));
  const totalHouses = houseCount(ctx);
  return meetings.map((m) => {
    const list = ((atts ?? []) as Attendee[]).filter((a) => a.meetingId === m.id);
    const present = list.filter((a) => a.checkedInAt);
    return {
      ...m,
      stats: {
        hadir: list.filter((a) => a.rsvp === "HADIR").length,
        mungkin: list.filter((a) => a.rsvp === "MUNGKIN").length,
        tidak: list.filter((a) => a.rsvp === "TIDAK").length,
        checkedIn: present.length,
        houses: new Set(present.map((a) => houseOf.get(a.userId)).filter(Boolean)).size,
        totalHouses,
      },
      myRsvp: list.find((a) => a.userId === actor.id) ?? null,
      polls: polls.filter((p) => p.meetingId === m.id),
    };
  });
}

export async function meetingAttendees(actor: Actor, meetingId: string) {
  const m = await scoped<Meeting>("meetings", meetingId, actor.communityId, "Musyawarah");
  const [{ data }, ctx] = await Promise.all([supabaseAdmin.from("meeting_attendees").select("*").eq("meetingId", m.id).order("name"), loadCommunityContext(actor.communityId)]);
  const pengurus = isPengurus(actor);
  return {
    attendees: (data ?? []) as Attendee[],
    // roster for manual check-in (pengurus only)
    roster: pengurus ? ctx.users.map((u) => ({ id: u.id, name: u.fullName, houseBlock: u.houseBlock })).sort((a, b) => (a.houseBlock ?? "").localeCompare(b.houseBlock ?? "", "id", { numeric: true })) : [],
    checkinCode: pengurus ? checkinCode(m.id) : null,
  };
}

// Cron: H-1 and 1-hour-before reminders for scheduled meetings.
export async function runMeetingReminders(at = new Date()) {
  const { data } = await supabaseAdmin
    .from("meetings").select("*").eq("status", "TERJADWAL")
    .gte("startAt", at.toISOString()).lte("startAt", new Date(at.getTime() + 24 * 3_600_000).toISOString());
  let sent = 0;
  for (const m of (data ?? []) as Meeting[]) {
    const soon = new Date(m.startAt).getTime() - at.getTime() <= 90 * 60_000;
    const { data: declined } = await supabaseAdmin.from("meeting_attendees").select("userId").eq("meetingId", m.id).eq("rsvp", "TIDAK");
    sent += await notify({
      communityId: m.communityId, type: "BALAI_MEETING_REMINDER",
      title: soon ? `⏰ Musyawarah 1 jam lagi: ${m.title}` : `⏰ Besok musyawarah: ${m.title}`,
      body: `${fmtDateTime(m.startAt)} WIB · ${m.location}${m.agenda.length ? ` · ${m.agenda.length} agenda` : ""}`,
      link: meetingLink(m.id), entity: { type: "MEETING", id: m.id }, target: meetingTarget(m),
      excludeUserIds: (declined ?? []).map((d) => d.userId), dedupeKey: `mtg-rem:${m.id}:${soon ? "1h" : "h1"}`,
    });
  }
  const closed = await closeExpiredPolls();
  const loans = await runLoanReminders(at);
  return { meetings: data?.length ?? 0, sent, pollsClosed: closed, loans };
}

// ─────────────────────────────── GALANG DANA ───────────────────────────────

const fundLink = (id: string) => `/balai?tab=donasi&fund=${id}`;

export async function createFundraiser(actor: Actor, body: any) {
  requirePengurus(actor);
  const title = clean(body.title, 200);
  if (!title) throw new BalaiError("Judul penggalangan wajib diisi.");
  const f: Fundraiser = {
    id: uid("fund"), communityId: actor.communityId, title, story: clean(body.story, 5000),
    category: body.category in FUND_META ? body.category : "LAINNYA", beneficiary: clean(body.beneficiary, 200) || null,
    targetAmount: Math.max(0, Math.round(Number(body.targetAmount) || 0)), deadline: body.deadline || null, coverUrl: body.coverUrl || null,
    paymentInfo: clean(body.paymentInfo, 600) || null, status: "AKTIF", createdBy: actor.id, createdAt: now(),
  };
  const { error } = await supabaseAdmin.from("fundraisers").insert(f);
  if (error) throw new BalaiError(error.message, 500);
  await publishFeedPost({
    communityId: f.communityId, module: "BALAI", type: "FUNDRAISER", title: f.title, content: f.story, images: f.coverUrl ? [f.coverUrl] : [],
    payload: { fundId: f.id, category: f.category, targetAmount: f.targetAmount, collected: 0, donors: 0, deadline: f.deadline, beneficiary: f.beneficiary },
    entity: { type: "FUNDRAISER", id: f.id }, author: author(actor),
  });
  // silent: opened together with a kabar duka, which already notified everyone
  if (!body.silent) await notify({
    communityId: f.communityId, type: "BALAI_FUND_NEW", title: `${FUND_META[f.category].emoji} Galang dana: ${f.title}`,
    body: f.targetAmount ? `Target ${rupiah(f.targetAmount)}${f.deadline ? ` hingga ${fmtDate(f.deadline)}` : ""}. Setiap bantuan berarti.` : "Setiap bantuan berarti.",
    link: fundLink(f.id), entity: { type: "FUNDRAISER", id: f.id }, target: { all: true }, excludeUserIds: [actor.id], actorName: actor.fullName,
  });
  return f;
}

async function refreshFundFeed(f: Fundraiser) {
  const { data } = await supabaseAdmin.from("donations").select("amount").eq("fundraiserId", f.id).eq("status", "DITERIMA");
  const collected = (data ?? []).reduce((n, d) => n + d.amount, 0);
  await updateFeedPostByEntity(f.communityId, "BALAI", { type: "FUNDRAISER", id: f.id }, { payload: { collected, donors: data?.length ?? 0, status: f.status } });
  await supabaseAdmin.from("fundraisers").update({ updatedAt: now() }).eq("id", f.id);
  return collected;
}

export async function fundAction(actor: Actor, body: any) {
  switch (body.action) {
    case "DONATE": {
      const f = await scoped<Fundraiser>("fundraisers", body.fundraiserId, actor.communityId, "Penggalangan");
      if (f.status !== "AKTIF") throw new BalaiError("Penggalangan dana sudah ditutup.", 409);
      const amount = Math.round(Number(body.amount));
      if (!amount || amount < 1000) throw new BalaiError("Minimal donasi Rp 1.000.");
      const method = body.method === "TUNAI" ? "TUNAI" : "TRANSFER";
      if (method === "TRANSFER" && !body.proofUrl) throw new BalaiError("Unggah bukti transfer terlebih dulu.");
      const d: Donation = {
        id: uid("don"), fundraiserId: f.id, donorId: actor.id, donorName: actor.fullName, anonymous: !!body.anonymous, amount,
        message: clean(body.message, 300) || null, method, proofUrl: body.proofUrl || null, status: "MENUNGGU", createdAt: now(),
      };
      const { error } = await supabaseAdmin.from("donations").insert({ ...d, communityId: f.communityId });
      if (error) throw new BalaiError(error.message, 500);
      await supabaseAdmin.from("fundraisers").update({ updatedAt: now() }).eq("id", f.id);
      await notify({
        communityId: f.communityId, type: "BALAI_DONATION_NEW", title: `💸 Donasi masuk ${rupiah(amount)} · perlu verifikasi`,
        body: `${actor.fullName}${actor.houseBlock ? ` (${actor.houseBlock})` : ""} untuk "${f.title}" · ${method === "TUNAI" ? "tunai, serahkan ke bendahara" : "transfer"}`,
        link: fundLink(f.id), entity: { type: "FUNDRAISER", id: f.id }, target: { roles: ["BENDAHARA", "KETUA", "TENANT_ADMIN"] }, excludeUserIds: [actor.id],
      });
      return { donation: d };
    }
    case "VERIFY":
    case "REJECT": {
      requirePengurus(actor);
      const { data: d } = await supabaseAdmin.from("donations").select("*").eq("id", body.donationId).maybeSingle();
      if (!d || d.communityId !== actor.communityId) throw new BalaiError("Donasi tidak ditemukan.", 404);
      if (d.status !== "MENUNGGU") throw new BalaiError("Donasi ini sudah diproses.", 409);
      const f = await scoped<Fundraiser>("fundraisers", d.fundraiserId, actor.communityId, "Penggalangan");
      // claim the row first so a double tap can't book it into Kas twice
      const { data: claimed } = await supabaseAdmin.from("donations").update({ status: body.action === "VERIFY" ? "DITERIMA" : "DITOLAK", verifiedBy: actor.fullName, updatedAt: now() }).eq("id", d.id).eq("status", "MENUNGGU").select("id");
      if (!claimed?.length) throw new BalaiError("Donasi ini sudah diproses.", 409);
      if (body.action === "VERIFY") {
        const finId = await recordIncome(f.communityId, "SOSIAL", `Donasi: ${f.title}`, d.amount, actor.fullName, d.proofUrl, `${d.anonymous ? "Hamba Allah" : d.donorName} · ${d.method} · galang dana ${f.id}`);
        await supabaseAdmin.from("donations").update({ financialRecordId: finId }).eq("id", d.id);
      }
      const collected = await refreshFundFeed(f);
      if (d.donorId) {
        await notify({
          communityId: f.communityId, type: "BALAI_DONATION_RESULT",
          title: body.action === "VERIFY" ? `🙏 Terima kasih! Donasi ${rupiah(d.amount)} diterima` : `⚠️ Donasi ${rupiah(d.amount)} belum dapat diverifikasi`,
          body: body.action === "VERIFY" ? `Untuk "${f.title}". Terkumpul ${rupiah(collected)}${f.targetAmount ? ` dari ${rupiah(f.targetAmount)}` : ""}.` : clean(body.note, 200) || "Silakan hubungi bendahara RT.",
          link: fundLink(f.id), entity: { type: "FUNDRAISER", id: f.id }, target: { userIds: [d.donorId] },
        });
      }
      if (body.action === "VERIFY" && f.targetAmount && collected >= f.targetAmount && collected - d.amount < f.targetAmount) {
        await notify({
          communityId: f.communityId, type: "BALAI_FUND_NEW", title: `🎉 Target tercapai: ${f.title}`,
          body: `Terkumpul ${rupiah(collected)}. Terima kasih atas kepedulian seluruh warga!`, link: fundLink(f.id), entity: { type: "FUNDRAISER", id: f.id },
          target: { all: true }, dedupeKey: `fund-target:${f.id}`,
        });
      }
      return { collected };
    }
    case "CLOSE": {
      requirePengurus(actor);
      const f = await scoped<Fundraiser>("fundraisers", body.fundraiserId, actor.communityId, "Penggalangan");
      await supabaseAdmin.from("fundraisers").update({ status: "SELESAI", updatedAt: now() }).eq("id", f.id);
      const collected = await refreshFundFeed({ ...f, status: "SELESAI" });
      return { collected };
    }
    default:
      throw new BalaiError("Aksi tidak dikenal.");
  }
}

export async function fundraisersWithStats(actor: Actor, funds: Fundraiser[]): Promise<FundraiserWithStats[]> {
  if (!funds.length) return [];
  const { data } = await supabaseAdmin.from("donations").select("*").in("fundraiserId", funds.map((f) => f.id)).order("createdAt", { ascending: false });
  const all = (data ?? []) as Donation[];
  return funds.map((f) => {
    const list = all.filter((d) => d.fundraiserId === f.id);
    const ok = list.filter((d) => d.status === "DITERIMA");
    return {
      ...f,
      collected: ok.reduce((n, d) => n + d.amount, 0),
      donors: ok.length,
      pending: list.filter((d) => d.status === "MENUNGGU").length,
      recent: ok.slice(0, 8).map((d) => ({ name: d.anonymous ? "Hamba Allah" : d.donorName, amount: d.amount, message: d.message, createdAt: d.createdAt })),
      myDonations: list.filter((d) => d.donorId === actor.id),
    };
  });
}

export async function fundDonations(actor: Actor, fundraiserId: string) {
  requirePengurus(actor);
  await scoped<Fundraiser>("fundraisers", fundraiserId, actor.communityId, "Penggalangan");
  const { data } = await supabaseAdmin.from("donations").select("*").eq("fundraiserId", fundraiserId).order("createdAt", { ascending: false });
  return (data ?? []) as Donation[];
}

// ─────────────────────────────── INVENTARIS RT ───────────────────────────────

const dayCount = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000) + 1;

export async function availability(item: InventoryItem, startDate: string, endDate: string, excludeLoanId?: string) {
  const { data } = await supabaseAdmin
    .from("inventory_loans").select("id, qty, startDate, endDate")
    .eq("itemId", item.id).in("status", ACTIVE_LOAN).lte("startDate", endDate).gte("endDate", startDate);
  // peak usage on any single day in the range
  let peak = 0;
  const loans = (data ?? []).filter((l) => l.id !== excludeLoanId);
  for (let d = new Date(`${startDate}T00:00:00Z`); d <= new Date(`${endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    peak = Math.max(peak, loans.filter((l) => l.startDate <= key && l.endDate >= key).reduce((n, l) => n + l.qty, 0));
  }
  return Math.max(0, item.quantity - peak);
}

export async function saveItem(actor: Actor, body: any) {
  requirePengurus(actor);
  const name = clean(body.name, 120);
  if (!name) throw new BalaiError("Nama barang wajib diisi.");
  const row = {
    name, category: body.category in INVENTORY_META ? body.category : "LAINNYA", description: clean(body.description, 1000),
    quantity: Math.max(0, Math.round(Number(body.quantity) || 0)), unit: clean(body.unit, 20) || "unit", photoUrl: body.photoUrl || null,
    feePerDay: Math.max(0, Math.round(Number(body.feePerDay) || 0)), maxDays: Math.min(30, Math.max(1, Math.round(Number(body.maxDays) || 3))),
    condition: body.condition === "PERLU_PERBAIKAN" ? "PERLU_PERBAIKAN" : "BAIK", isActive: body.isActive !== false, updatedAt: now(),
  };
  if (body.id) {
    await scoped<InventoryItem>("inventory_items", body.id, actor.communityId, "Barang");
    const { data, error } = await supabaseAdmin.from("inventory_items").update(row).eq("id", body.id).select("*").single();
    if (error) throw new BalaiError(error.message, 500);
    return data as InventoryItem;
  }
  const { data, error } = await supabaseAdmin.from("inventory_items").insert({ ...row, id: uid("inv"), communityId: actor.communityId }).select("*").single();
  if (error) throw new BalaiError(error.message, 500);
  return data as InventoryItem;
}

export async function requestLoan(actor: Actor, body: any) {
  const item = await scoped<InventoryItem>("inventory_items", body.itemId, actor.communityId, "Barang");
  if (!item.isActive) throw new BalaiError("Barang sedang tidak bisa dipinjam.", 409);
  const { startDate, endDate } = body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) throw new BalaiError("Tanggal pinjam tidak valid.");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  if (startDate < today) throw new BalaiError("Tanggal mulai tidak boleh di masa lalu.");
  const days = dayCount(startDate, endDate);
  if (days > item.maxDays) throw new BalaiError(`Maksimal pinjam ${item.maxDays} hari.`);
  const qty = Math.round(Number(body.qty) || 1);
  if (qty < 1) throw new BalaiError("Jumlah minimal 1.");
  const free = await availability(item, startDate, endDate);
  if (qty > free) throw new BalaiError(free ? `Hanya tersedia ${free} ${item.unit} di tanggal tersebut.` : "Barang sudah terpinjam penuh di tanggal tersebut.", 409);
  const purpose = clean(body.purpose, 300);
  if (!purpose) throw new BalaiError("Keperluan wajib diisi.");
  const loan = {
    id: uid("loan"), communityId: actor.communityId, itemId: item.id, borrowerId: actor.id, borrowerName: actor.fullName, houseBlock: actor.houseBlock,
    qty, startDate, endDate, purpose, fee: item.feePerDay * days * qty, status: "DIAJUKAN",
  };
  const { error } = await supabaseAdmin.from("inventory_loans").insert(loan);
  if (error) throw new BalaiError(error.message, 500);
  await notify({
    communityId: actor.communityId, type: "BALAI_LOAN_REQUEST", title: `📦 Pengajuan pinjam: ${qty} ${item.unit} ${item.name}`,
    body: `${actor.fullName}${actor.houseBlock ? ` (${actor.houseBlock})` : ""} · ${fmtDate(startDate)}–${fmtDate(endDate)} · ${purpose}`,
    link: `/balai?tab=inventaris&manage=1`, entity: { type: "LOAN", id: loan.id }, target: { roles: PENGURUS_ROLES }, excludeUserIds: [actor.id],
  });
  return loan;
}

export async function loanAction(actor: Actor, body: any) {
  const { data: l } = await supabaseAdmin.from("inventory_loans").select("*, item:inventory_items(*)").eq("id", body.loanId).maybeSingle();
  if (!l || l.communityId !== actor.communityId) throw new BalaiError("Peminjaman tidak ditemukan.", 404);
  const item = l.item as InventoryItem;
  const own = l.borrowerId === actor.id;
  const flow: Record<string, { from: string[]; to: string; pengurus: boolean; msg?: string }> = {
    APPROVE: { from: ["DIAJUKAN"], to: "DISETUJUI", pengurus: true, msg: "✅ Pinjaman disetujui · silakan ambil sesuai jadwal" },
    REJECT: { from: ["DIAJUKAN"], to: "DITOLAK", pengurus: true, msg: "❌ Pengajuan pinjam ditolak" },
    HANDOVER: { from: ["DISETUJUI"], to: "DIPINJAM", pengurus: true },
    RETURN: { from: ["DIPINJAM"], to: "DIKEMBALIKAN", pengurus: true, msg: "🙏 Barang sudah diterima kembali" },
    CANCEL: { from: ["DIAJUKAN", "DISETUJUI"], to: "DIBATALKAN", pengurus: false },
  };
  const step = flow[body.action];
  if (!step) throw new BalaiError("Aksi tidak dikenal.");
  if (step.pengurus ? !isPengurus(actor) : !own && !isPengurus(actor)) throw new BalaiError("Anda tidak berhak melakukan ini.", 403);
  if (!step.from.includes(l.status)) throw new BalaiError("Status peminjaman sudah berubah. Muat ulang halaman.", 409);
  if (body.action === "APPROVE") {
    const free = await availability(item, l.startDate, l.endDate, l.id);
    if (l.qty > free) throw new BalaiError(`Bentrok: hanya tersisa ${free} ${item.unit} di tanggal itu.`, 409);
  }
  const patch: Record<string, unknown> = { status: step.to, handledBy: actor.fullName, updatedAt: now() };
  if (body.note) patch[body.action === "RETURN" ? "returnNote" : "decisionNote"] = clean(body.note, 300);
  const { data: done } = await supabaseAdmin.from("inventory_loans").update(patch).eq("id", l.id).eq("status", l.status).select("*").single();
  if (!done) throw new BalaiError("Status peminjaman sudah berubah. Muat ulang halaman.", 409);
  if (body.action === "RETURN") {
    if (l.fee > 0) await recordIncome(l.communityId, "LAINNYA", `Sewa inventaris: ${item.name}`, l.fee, actor.fullName, null, `${l.borrowerName} · ${l.qty} ${item.unit} · ${l.startDate} s/d ${l.endDate}`);
    if (body.condition === "PERLU_PERBAIKAN") await supabaseAdmin.from("inventory_items").update({ condition: "PERLU_PERBAIKAN", updatedAt: now() }).eq("id", item.id);
  }
  if (step.msg && !own) {
    await notify({
      communityId: l.communityId, type: "BALAI_LOAN_STATUS", title: `${step.msg}: ${item.name}`,
      body: `${l.qty} ${item.unit} · ${fmtDate(l.startDate)}–${fmtDate(l.endDate)}${body.note ? ` · ${clean(body.note, 120)}` : ""}${body.action === "APPROVE" && l.fee ? ` · biaya ${rupiah(l.fee)}` : ""}`,
      link: `/balai?tab=inventaris`, entity: { type: "LOAN", id: l.id }, target: { userIds: [l.borrowerId] },
    });
  }
  return done;
}

async function runLoanReminders(at: Date) {
  const today = at.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const { data } = await supabaseAdmin.from("inventory_loans").select("*, item:inventory_items(name, unit)").eq("status", "DIPINJAM").lte("endDate", today);
  let sent = 0;
  for (const l of (data ?? []) as any[]) {
    const late = l.endDate < today;
    sent += await notify({
      communityId: l.communityId, type: "BALAI_LOAN_DUE",
      title: late ? `⚠️ Terlambat kembalikan ${l.item?.name}` : `📦 Hari ini batas kembalikan ${l.item?.name}`,
      body: `${l.qty} ${l.item?.unit} · dipinjam untuk ${l.purpose}. Kembalikan ke pengurus RT ya.`,
      link: `/balai?tab=inventaris`, entity: { type: "LOAN", id: l.id }, target: { userIds: [l.borrowerId] }, dedupeKey: `loan-due:${l.id}:${today}`,
    });
  }
  return sent;
}

// ─────────────────────────────── KONTAK PENTING ───────────────────────────────

export async function saveContact(actor: Actor, body: any) {
  requirePengurus(actor);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  if (!name || !phone) throw new BalaiError("Nama dan nomor wajib diisi.");
  const row = {
    name, phone, category: body.category in CONTACT_META ? body.category : "LAYANAN", address: clean(body.address, 300) || null,
    notes: clean(body.notes, 300) || null, sortOrder: Number(body.sortOrder) || 100, updatedAt: now(),
  };
  if (body.id) {
    await scoped<Contact>("directory_contacts", body.id, actor.communityId, "Kontak");
    const { data } = await supabaseAdmin.from("directory_contacts").update(row).eq("id", body.id).select("*").single();
    return data as Contact;
  }
  const { data, error } = await supabaseAdmin.from("directory_contacts").insert({ ...row, id: uid("ct"), communityId: actor.communityId }).select("*").single();
  if (error) throw new BalaiError(error.message, 500);
  return data as Contact;
}

export async function deleteContact(actor: Actor, id: string) {
  requirePengurus(actor);
  await scoped<Contact>("directory_contacts", id, actor.communityId, "Kontak");
  await supabaseAdmin.from("directory_contacts").delete().eq("id", id);
}

// ─────────────────────────────── OVERVIEW ───────────────────────────────

export async function loadOverview(actor: Actor) {
  const cid = actor.communityId;
  await closeExpiredPolls(cid);
  const pengurus = isPengurus(actor);
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const [ctx, polls, meetings, funds, items, myLoans, allLoans, contacts, kabar, officers] = await Promise.all([
    loadCommunityContext(cid),
    supabaseAdmin.from("polls").select("*").eq("communityId", cid).gte("createdAt", since).order("createdAt", { ascending: false }).limit(60),
    supabaseAdmin.from("meetings").select("*").eq("communityId", cid).gte("startAt", since).order("startAt", { ascending: false }).limit(40),
    supabaseAdmin.from("fundraisers").select("*").eq("communityId", cid).order("createdAt", { ascending: false }).limit(30),
    supabaseAdmin.from("inventory_items").select("*").eq("communityId", cid).order("category").order("name"),
    supabaseAdmin.from("inventory_loans").select("*, item:inventory_items(name, unit, photoUrl, category)").eq("borrowerId", actor.id).order("createdAt", { ascending: false }).limit(30),
    pengurus
      ? supabaseAdmin.from("inventory_loans").select("*, item:inventory_items(name, unit, photoUrl, category)").eq("communityId", cid).in("status", ACTIVE_LOAN).order("startDate")
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin.from("directory_contacts").select("*").eq("communityId", cid).order("sortOrder").order("name"),
    supabaseAdmin.from("feed_posts").select("*").eq("communityId", cid).eq("module", "BALAI").eq("type", "KABAR").eq("status", "PUBLISHED").order("createdAt", { ascending: false }).limit(30),
    supabaseAdmin.from("users").select("id, fullName, role, phone, houseBlock").eq("communityId", cid).in("role", PENGURUS_ROLES.filter((r) => r !== "TENANT_ADMIN")),
  ]);
  const visiblePolls = ((polls.data ?? []) as Poll[]).filter((p) => p.audience === "SEMUA" || pengurus);
  const pollsR = await pollResults(actor, visiblePolls, ctx);
  const visibleMeetings = ((meetings.data ?? []) as Meeting[]).filter((m) => m.audience !== "PENGURUS" || pengurus);
  // today's upcoming meetings should come first; the list is sorted client-side
  const meetingsR = await meetingsWithStats(actor, visibleMeetings, ctx, pollsR);
  const fundsR = await fundraisersWithStats(actor, (funds.data ?? []) as Fundraiser[]);
  const pendingDonations = pengurus ? fundsR.reduce((n, f) => n + f.pending, 0) : 0;
  return {
    isPengurus: pengurus,
    polls: pollsR,
    meetings: meetingsR,
    fundraisers: fundsR,
    items: ((items.data ?? []) as InventoryItem[]).filter((i) => i.isActive || pengurus),
    myLoans: (myLoans.data ?? []) as Loan[],
    loans: (allLoans.data ?? []) as Loan[],
    contacts: (contacts.data ?? []) as Contact[],
    officers: (officers.data ?? []).map((o: any) => ({ id: o.id, name: o.fullName, role: o.role, phone: o.phone, houseBlock: o.houseBlock })),
    kabar: kabar.data ?? [],
    counts: {
      activePolls: pollsR.filter((p) => p.status === "AKTIF").length,
      unvotedPolls: pollsR.filter((p) => p.status === "AKTIF" && !p.result.myChoice).length,
      upcomingMeetings: meetingsR.filter((m) => m.status === "TERJADWAL" || m.status === "BERLANGSUNG").length,
      activeFunds: fundsR.filter((f) => f.status === "AKTIF").length,
      pendingDonations,
      pendingLoans: pengurus ? ((allLoans.data ?? []) as Loan[]).filter((l) => l.status === "DIAJUKAN").length : 0,
    },
  };
}

export type BalaiOverview = Awaited<ReturnType<typeof loadOverview>>;
