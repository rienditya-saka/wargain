import { NextResponse } from "next/server";
import {
  BalaiError, availability, closePoll, createFundraiser, createMeeting, createPoll, deleteContact, fundAction, fundDonations, loadActor,
  isPengurus, loadOverview, loanAction, pollResults, meetingAction, meetingAttendees, postKabar, requestLoan, saveContact, saveItem, votePoll,
} from "@/lib/balai/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { InventoryItem, Poll } from "@/lib/balai/types";

const fail = (e: any) => NextResponse.json({ error: e.message || "Internal server error" }, { status: e instanceof BalaiError ? e.status : 500 });

// GET ?userId[&view=overview|attendees|donations|availability][&meetingId|&fundraiserId|&itemId&start&end]
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const actor = await loadActor(sp.get("userId"));
    switch (sp.get("view") ?? "overview") {
      case "attendees":
        return NextResponse.json(await meetingAttendees(actor, sp.get("meetingId") ?? ""));
      case "poll": {
        const { data: poll } = await supabaseAdmin.from("polls").select("*").eq("id", sp.get("pollId") ?? "").maybeSingle();
        if (!poll || poll.communityId !== actor.communityId) throw new BalaiError("Polling tidak ditemukan.", 404);
        const [res] = await pollResults(actor, [poll as Poll]);
        return NextResponse.json({ poll: res, isPengurus: isPengurus(actor) });
      }
      case "donations":
        return NextResponse.json({ donations: await fundDonations(actor, sp.get("fundraiserId") ?? "") });
      case "availability": {
        const { data: item } = await supabaseAdmin.from("inventory_items").select("*").eq("id", sp.get("itemId") ?? "").maybeSingle();
        if (!item || item.communityId !== actor.communityId) throw new BalaiError("Barang tidak ditemukan.", 404);
        const start = sp.get("start") ?? "";
        const end = sp.get("end") ?? start;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) throw new BalaiError("Tanggal tidak valid.");
        return NextResponse.json({ available: await availability(item as InventoryItem, start, end) });
      }
      default:
        return NextResponse.json(await loadOverview(actor));
    }
  } catch (e: any) {
    return fail(e);
  }
}

// POST { userId, action, ...payload }
export async function POST(req: Request) {
  try {
    const { userId, action, ...body } = await req.json();
    const actor = await loadActor(userId);
    switch (action) {
      case "KABAR":
        return NextResponse.json({ success: true, ...(await postKabar(actor, body)) });
      case "POLL_CREATE":
        return NextResponse.json({ success: true, poll: await createPoll(actor, body) });
      case "POLL_VOTE":
        return NextResponse.json({ success: true, poll: await votePoll(actor, body.pollId, body.optionIds) });
      case "POLL_CLOSE":
        return NextResponse.json({ success: true, poll: await closePoll(actor, body.pollId) });
      case "MEETING_CREATE":
        return NextResponse.json({ success: true, meeting: await createMeeting(actor, body) });
      case "MEETING":
        return NextResponse.json({ success: true, meeting: await meetingAction(actor, body.meetingId, body.op, body) });
      case "FUND_CREATE":
        return NextResponse.json({ success: true, fundraiser: await createFundraiser(actor, body) });
      case "FUND":
        return NextResponse.json({ success: true, ...(await fundAction(actor, { ...body, action: body.op })) });
      case "ITEM_SAVE":
        return NextResponse.json({ success: true, item: await saveItem(actor, body) });
      case "LOAN_REQUEST":
        return NextResponse.json({ success: true, loan: await requestLoan(actor, body) });
      case "LOAN":
        return NextResponse.json({ success: true, loan: await loanAction(actor, { ...body, action: body.op }) });
      case "CONTACT_SAVE":
        return NextResponse.json({ success: true, contact: await saveContact(actor, body) });
      case "CONTACT_DELETE":
        await deleteContact(actor, body.id);
        return NextResponse.json({ success: true });
      default:
        throw new BalaiError("Aksi tidak dikenal.");
    }
  } catch (e: any) {
    return fail(e);
  }
}
