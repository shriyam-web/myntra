import { randomUUID } from "crypto";
import mongoose from "mongoose";
import dbConnect from "../mongodb";
import { CallLog, CallSession, CallSignal, Message, User } from "../../models/schemas";
import { partnerOf, type AuthUser } from "../auth/passwords";
import { publishCallWake } from "./realtime";
import { disappearingCreateFields } from "../disappearing-messages";
import {
  HEARTBEAT_STALE_MS,
  RING_TIMEOUT_MS,
  SIGNAL_TTL_MS,
  type CallEndReason,
  type CallLogStatus,
  type CallSessionDTO,
  type CallSignalDTO,
  type CallSignalType,
} from "./types";

function toDTO(session: Record<string, unknown>, me: string): CallSessionDTO {
  const caller = String(session.caller);
  const callee = String(session.callee);
  const role = me === caller ? "caller" : "callee";
  return {
    callId: String(session.callId),
    startRequestId: String(session.startRequestId),
    caller,
    callee,
    state: session.state as CallSessionDTO["state"],
    ringExpiresAt: new Date(session.ringExpiresAt as string | Date).toISOString(),
    answeredAt: session.answeredAt ? new Date(session.answeredAt as string | Date).toISOString() : null,
    activeAt: session.activeAt ? new Date(session.activeAt as string | Date).toISOString() : null,
    endedAt: session.endedAt ? new Date(session.endedAt as string | Date).toISOString() : null,
    endedBy: session.endedBy ? String(session.endedBy) : null,
    endReason: (session.endReason as CallSessionDTO["endReason"]) ?? null,
    nextSignalSeq: Number(session.nextSignalSeq || 1),
    createdAt: new Date(session.createdAt as string | Date).toISOString(),
    updatedAt: new Date(session.updatedAt as string | Date).toISOString(),
    role,
    partner: role === "caller" ? callee : caller,
  };
}

function signalToDTO(doc: Record<string, unknown>): CallSignalDTO {
  return {
    callId: String(doc.callId),
    signalId: String(doc.signalId),
    seq: Number(doc.seq),
    from: String(doc.from),
    to: String(doc.to),
    type: doc.type as CallSignalType,
    revision: Number(doc.revision || 0),
    iceGeneration: Number(doc.iceGeneration || 0),
    payload: String(doc.payload),
    createdAt: new Date(doc.createdAt as string | Date).toISOString(),
  };
}

async function ensureUser(username: string) {
  await User.findOneAndUpdate(
    { username },
    { $setOnInsert: { username, lastSeen: new Date() } },
    { upsert: true, new: true }
  );
}

function mapEndReasonToLogStatus(reason: CallEndReason, hadActive: boolean): CallLogStatus {
  if (reason === "hangup" || reason === "completed") return hadActive ? "completed" : "cancelled";
  if (reason === "rejected") return "rejected";
  if (reason === "timeout" || reason === "missed") return "missed";
  if (reason === "cancelled") return "cancelled";
  if (reason === "failed") return "failed";
  return "disconnected";
}

async function finalizeEndedSession(session: Record<string, unknown>, endedBy: string | null) {
  const callId = String(session.callId);
  const caller = String(session.caller);
  const callee = String(session.callee);
  const endReason = (session.endReason as CallEndReason) || "disconnected";
  const activeAt = session.activeAt ? new Date(session.activeAt as string | Date) : null;
  const endedAt = session.endedAt ? new Date(session.endedAt as string | Date) : new Date();
  const duration = activeAt ? Math.max(0, Math.floor((endedAt.getTime() - activeAt.getTime()) / 1000)) : 0;
  const status = mapEndReasonToLogStatus(endReason, Boolean(activeAt));

  const disappearing = await disappearingCreateFields();

  await CallLog.findOneAndUpdate(
    { callId },
    {
      $setOnInsert: {
        callId,
        from: caller,
        to: callee,
        status,
        duration,
        createdAt: endedAt,
      },
    },
    { upsert: true }
  );

  await Message.findOneAndUpdate(
    { relatedCallId: callId },
    {
      $setOnInsert: {
        text: `[CALL_LOG:${status}:${duration}:${caller}:${callee}]`,
        createdBy: caller,
        createdAt: endedAt,
        kind: "call-log",
        relatedCallId: callId,
        callMeta: { from: caller, to: callee, status, duration },
        ...disappearing,
      },
    },
    { upsert: true }
  );

  // Release claims only if still pointing at this call.
  await User.updateMany(
    { activeCallId: callId },
    {
      $set: {
        activeCallId: null,
        callStatus: "idle",
        callerId: null,
        signalData: null,
        callSignals: [],
        lastCallEndReason: status,
      },
    }
  );

  await publishCallWake([caller, callee], {
    type: "call.ended",
    callId,
    state: "ended",
    latestSeq: Number(session.nextSignalSeq || 1) - 1,
  });

  void endedBy;
}

let lastExpireAt = 0;

export async function expireDueCalls(): Promise<number> {
  const nowMs = Date.now();
  if (nowMs - lastExpireAt < 4_000) return 0;
  lastExpireAt = nowMs;

  await dbConnect();
  const now = new Date();
  let count = 0;

  const ringing = await CallSession.find({
    state: "ringing",
    ringExpiresAt: { $lte: now },
  }).lean();

  for (const session of ringing) {
    const updated = await CallSession.findOneAndUpdate(
      { callId: session.callId, state: "ringing" },
      {
        $set: {
          state: "ended",
          endedAt: now,
          endedBy: null,
          endReason: "timeout",
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();
    if (updated) {
      await finalizeEndedSession(updated as Record<string, unknown>, null);
      count += 1;
    }
  }

  const stale = await CallSession.find({
    state: { $in: ["connecting", "active"] },
    updatedAt: { $lte: new Date(Date.now() - HEARTBEAT_STALE_MS) },
  }).lean();

  for (const session of stale) {
    const updated = await CallSession.findOneAndUpdate(
      { callId: session.callId, state: { $in: ["connecting", "active"] } },
      {
        $set: {
          state: "ended",
          endedAt: now,
          endedBy: null,
          endReason: "disconnected",
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();
    if (updated) {
      await finalizeEndedSession(updated as Record<string, unknown>, null);
      count += 1;
    }
  }

  return count;
}

export async function startCall(
  me: AuthUser,
  startRequestId: string,
  offerPayload: string
): Promise<{ ok: true; session: CallSessionDTO } | { ok: false; error: string; code?: string; session?: CallSessionDTO }> {
  await dbConnect();
  await expireDueCalls();

  const caller = me;
  const callee = partnerOf(me);
  await ensureUser(caller);
  await ensureUser(callee);

  const existing = await CallSession.findOne({ caller, startRequestId }).lean();
  if (existing) {
    return { ok: true, session: toDTO(existing as Record<string, unknown>, me) };
  }

  const callId = randomUUID();
  const now = new Date();
  const ringExpiresAt = new Date(now.getTime() + RING_TIMEOUT_MS);
  const signalId = randomUUID();

  const users = [caller, callee].sort();
  const mongoSession = await mongoose.startSession();
  try {
    let created: Record<string, unknown> | null = null;
    const runCreate = async (txnSession: mongoose.ClientSession | null) => {
      const opts = txnSession ? { session: txnSession } : {};
      const claimA = await User.findOneAndUpdate(
        { username: users[0], $or: [{ activeCallId: null }, { activeCallId: { $exists: false } }] },
        { $set: { activeCallId: callId } },
        { ...opts, new: true }
      );
      if (!claimA) throw Object.assign(new Error("BUSY"), { code: "BUSY" });

      const claimB = await User.findOneAndUpdate(
        { username: users[1], $or: [{ activeCallId: null }, { activeCallId: { $exists: false } }] },
        { $set: { activeCallId: callId } },
        { ...opts, new: true }
      );
      if (!claimB) {
        await User.updateOne({ username: users[0], activeCallId: callId }, { $set: { activeCallId: null } }, opts);
        throw Object.assign(new Error("BUSY"), { code: "BUSY" });
      }

      const docs = await CallSession.create(
        [
          {
            callId,
            startRequestId,
            caller,
            callee,
            state: "ringing",
            ringExpiresAt,
            nextSignalSeq: 2,
            lastHeartbeatByParticipant: { [caller]: now },
            createdAt: now,
            updatedAt: now,
          },
        ],
        opts.session ? { session: opts.session } : undefined
      );
      const doc = Array.isArray(docs) ? docs[0] : docs;

      await CallSignal.create(
        [
          {
            callId,
            signalId,
            seq: 1,
            from: caller,
            to: callee,
            type: "offer",
            revision: 0,
            iceGeneration: 0,
            payload: offerPayload,
            createdAt: now,
            expiresAt: new Date(now.getTime() + SIGNAL_TTL_MS),
          },
        ],
        opts.session ? { session: opts.session } : undefined
      );

      await User.updateOne(
        { username: callee },
        { $set: { callStatus: "ringing", callerId: caller, lastCallEndReason: null } },
        opts
      );
      await User.updateOne(
        { username: caller },
        { $set: { callStatus: "on-call", callerId: callee, lastCallEndReason: null } },
        opts
      );

      created = (doc as { toObject: () => Record<string, unknown> }).toObject();
    };

    try {
      await mongoSession.withTransaction(async () => {
        await runCreate(mongoSession);
      });
    } catch (txnError) {
      // Standalone MongoDB / transaction-unavailable fallback
      if ((txnError as { code?: string })?.code === "BUSY" || (txnError instanceof Error && txnError.message === "BUSY")) {
        throw txnError;
      }
      console.warn("Call start transaction unavailable, using non-transactional fallback:", txnError);
      await runCreate(null);
    }

    if (!created) throw new Error("Failed to create call");

    await publishCallWake([caller, callee], {
      type: "call.wake",
      callId,
      latestSeq: 1,
      state: "ringing",
    });

    return { ok: true, session: toDTO(created, me) };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "BUSY" || (error instanceof Error && error.message === "BUSY")) {
      const mine = await getActiveCallForUser(me);
      return { ok: false, error: "Busy", code: "BUSY", session: mine ?? undefined };
    }
    // Duplicate startRequestId race
    const again = await CallSession.findOne({ caller, startRequestId }).lean();
    if (again) return { ok: true, session: toDTO(again as Record<string, unknown>, me) };
    console.error("startCall failed:", error);
    return { ok: false, error: "Failed to start call" };
  } finally {
    await mongoSession.endSession();
  }
}

export async function acceptCall(
  me: AuthUser,
  callId: string,
  answerPayload: string
): Promise<{ ok: true; session: CallSessionDTO } | { ok: false; error: string; code?: string }> {
  await dbConnect();
  await expireDueCalls();

  const now = new Date();
  const updated = await CallSession.findOneAndUpdate(
    {
      callId,
      callee: me,
      state: "ringing",
      ringExpiresAt: { $gt: now },
    },
    {
      $set: {
        state: "connecting",
        answeredAt: now,
        updatedAt: now,
        [`lastHeartbeatByParticipant.${me}`]: now,
      },
      $inc: { nextSignalSeq: 1 },
    },
    { new: true }
  ).lean();

  if (!updated) {
    return { ok: false, error: "Call not available", code: "NOT_AVAILABLE" };
  }

  const seq = Number(updated.nextSignalSeq) - 1;
  await CallSignal.create({
    callId,
    signalId: randomUUID(),
    seq,
    from: me,
    to: String(updated.caller),
    type: "answer",
    revision: 0,
    iceGeneration: 0,
    payload: answerPayload,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SIGNAL_TTL_MS),
  });

  await User.updateOne({ username: me }, { $set: { callStatus: "on-call" } });

  await publishCallWake([String(updated.caller), me], {
    type: "call.updated",
    callId,
    latestSeq: seq,
    state: "connecting",
  });

  return { ok: true, session: toDTO(updated as Record<string, unknown>, me) };
}

export async function rejectCall(
  me: AuthUser,
  callId: string
): Promise<{ ok: true; session: CallSessionDTO } | { ok: false; error: string }> {
  await dbConnect();
  const now = new Date();
  const updated = await CallSession.findOneAndUpdate(
    { callId, callee: me, state: "ringing" },
    {
      $set: {
        state: "ended",
        endedAt: now,
        endedBy: me,
        endReason: "rejected",
        updatedAt: now,
      },
    },
    { new: true }
  ).lean();

  if (!updated) return { ok: false, error: "Call not available" };
  await finalizeEndedSession(updated as Record<string, unknown>, me);
  return { ok: true, session: toDTO(updated as Record<string, unknown>, me) };
}

export async function endCall(
  me: AuthUser,
  callId: string,
  reason: CallEndReason = "hangup"
): Promise<{ ok: true; session: CallSessionDTO } | { ok: false; error: string }> {
  await dbConnect();
  const now = new Date();

  const current = await CallSession.findOne({ callId }).lean();
  if (!current) return { ok: false, error: "Not found" };
  if (current.caller !== me && current.callee !== me) return { ok: false, error: "Forbidden" };

  if (current.state === "ended") {
    return { ok: true, session: toDTO(current as Record<string, unknown>, me) };
  }

  const mappedReason: CallEndReason =
    current.state === "ringing"
      ? me === current.caller
        ? "cancelled"
        : "rejected"
      : reason === "hangup"
        ? "hangup"
        : reason;

  const updated = await CallSession.findOneAndUpdate(
    { callId, state: { $ne: "ended" } },
    {
      $set: {
        state: "ended",
        endedAt: now,
        endedBy: me,
        endReason: mappedReason,
        updatedAt: now,
      },
    },
    { new: true }
  ).lean();

  if (!updated) {
    const again = await CallSession.findOne({ callId }).lean();
    if (again) return { ok: true, session: toDTO(again as Record<string, unknown>, me) };
    return { ok: false, error: "Not found" };
  }

  await finalizeEndedSession(updated as Record<string, unknown>, me);
  return { ok: true, session: toDTO(updated as Record<string, unknown>, me) };
}

export async function pushSignal(
  me: AuthUser,
  input: {
    callId: string;
    signalId: string;
    type: CallSignalType;
    payload: string;
    revision?: number;
    iceGeneration?: number;
  }
): Promise<{ ok: true; seq: number } | { ok: false; error: string }> {
  await dbConnect();
  const session = await CallSession.findOne({ callId: input.callId }).lean();
  if (!session) return { ok: false, error: "Not found" };
  if (session.caller !== me && session.callee !== me) return { ok: false, error: "Forbidden" };
  if (session.state === "ended") return { ok: false, error: "Ended" };

  const to = me === session.caller ? String(session.callee) : String(session.caller);
  const now = new Date();

  try {
    const updated = await CallSession.findOneAndUpdate(
      { callId: input.callId, state: { $ne: "ended" } },
      {
        $inc: { nextSignalSeq: 1 },
        $set: { updatedAt: now, [`lastHeartbeatByParticipant.${me}`]: now },
      },
      { new: true }
    ).lean();
    if (!updated) return { ok: false, error: "Ended" };

    const seq = Number(updated.nextSignalSeq) - 1;
    await CallSignal.create({
      callId: input.callId,
      signalId: input.signalId,
      seq,
      from: me,
      to,
      type: input.type,
      revision: input.revision ?? 0,
      iceGeneration: input.iceGeneration ?? 0,
      payload: input.payload,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SIGNAL_TTL_MS),
    });

    await publishCallWake([session.caller as string, session.callee as string], {
      type: "call.wake",
      callId: input.callId,
      latestSeq: seq,
      state: String(updated.state),
    });

    return { ok: true, seq };
  } catch (error) {
    // Idempotent retry on duplicate signalId
    const existing = await CallSignal.findOne({ callId: input.callId, signalId: input.signalId }).lean();
    if (existing) return { ok: true, seq: Number(existing.seq) };
    console.error("pushSignal failed:", error);
    return { ok: false, error: "Failed to push signal" };
  }
}

export async function pushSignalBatch(
  me: AuthUser,
  callId: string,
  items: Array<{
    signalId: string;
    type: CallSignalType;
    payload: string;
    revision?: number;
    iceGeneration?: number;
  }>
): Promise<{ ok: true; lastSeq: number } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: true, lastSeq: 0 };
  if (items.length === 1) {
    const res = await pushSignal(me, { callId, ...items[0] });
    return res.ok ? { ok: true, lastSeq: res.seq } : res;
  }

  await dbConnect();
  const session = await CallSession.findOne({ callId }).lean();
  if (!session) return { ok: false, error: "Not found" };
  if (session.caller !== me && session.callee !== me) return { ok: false, error: "Forbidden" };
  if (session.state === "ended") return { ok: false, error: "Ended" };

  const to = me === session.caller ? String(session.callee) : String(session.caller);
  const now = new Date();

  try {
    const updated = await CallSession.findOneAndUpdate(
      { callId, state: { $ne: "ended" } },
      {
        $inc: { nextSignalSeq: items.length },
        $set: { updatedAt: now, [`lastHeartbeatByParticipant.${me}`]: now },
      },
      { new: true }
    ).lean();
    if (!updated) return { ok: false, error: "Ended" };

    const lastSeq = Number(updated.nextSignalSeq) - 1;
    const firstSeq = lastSeq - items.length + 1;
    try {
      await CallSignal.insertMany(
        items.map((item, i) => ({
          callId,
          signalId: item.signalId,
          seq: firstSeq + i,
          from: me,
          to,
          type: item.type,
          revision: item.revision ?? 0,
          iceGeneration: item.iceGeneration ?? 0,
          payload: item.payload,
          createdAt: now,
          expiresAt: new Date(now.getTime() + SIGNAL_TTL_MS),
        })),
        { ordered: false }
      );
    } catch (insertError) {
      const code = (insertError as { code?: number }).code;
      const hasDupes = Boolean((insertError as { writeErrors?: Array<{ code?: number }> }).writeErrors);
      if (code !== 11000 && !hasDupes) throw insertError;
    }

    await publishCallWake([session.caller as string, session.callee as string], {
      type: "call.wake",
      callId,
      latestSeq: lastSeq,
      state: String(updated.state),
    });

    return { ok: true, lastSeq };
  } catch (error) {
    console.error("pushSignalBatch failed:", error);
    return { ok: false, error: "Failed to push signals" };
  }
}

export async function fetchSignals(
  me: AuthUser,
  callId: string,
  afterSeq = 0
): Promise<{ ok: true; signals: CallSignalDTO[]; session: CallSessionDTO } | { ok: false; error: string }> {
  await dbConnect();
  await expireDueCalls();

  const session = await CallSession.findOne({ callId }).lean();
  if (!session) return { ok: false, error: "Not found" };
  if (session.caller !== me && session.callee !== me) return { ok: false, error: "Forbidden" };

  const signals = await CallSignal.find({ callId, seq: { $gt: afterSeq } })
    .sort({ seq: 1 })
    .limit(200)
    .lean();

  return {
    ok: true,
    signals: signals.map((s) => signalToDTO(s as Record<string, unknown>)),
    session: toDTO(session as Record<string, unknown>, me),
  };
}

export async function getActiveCallForUser(me: AuthUser): Promise<CallSessionDTO | null> {
  await dbConnect();
  await expireDueCalls();

  const user = await User.findOne({ username: me }).select("activeCallId").lean();
  if (user?.activeCallId) {
    const session = await CallSession.findOne({
      callId: user.activeCallId,
      state: { $ne: "ended" },
    }).lean();
    if (session) return toDTO(session as Record<string, unknown>, me);
    await User.updateOne(
      { username: me, activeCallId: user.activeCallId },
      { $set: { activeCallId: null, callStatus: "idle", callerId: null } }
    );
  }

  const session = await CallSession.findOne({
    $or: [{ caller: me }, { callee: me }],
    state: { $in: ["ringing", "connecting", "active"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return session ? toDTO(session as Record<string, unknown>, me) : null;
}

export async function reportConnected(
  me: AuthUser,
  callId: string
): Promise<{ ok: true; session: CallSessionDTO } | { ok: false; error: string }> {
  await dbConnect();
  const now = new Date();
  const session = await CallSession.findOne({ callId }).lean();
  if (!session) return { ok: false, error: "Not found" };
  if (session.caller !== me && session.callee !== me) return { ok: false, error: "Forbidden" };
  if (session.state === "ended") return { ok: false, error: "Ended" };

  const updated = await CallSession.findOneAndUpdate(
    { callId, state: { $in: ["connecting", "active", "ringing"] } },
    {
      $set: {
        [`connectedAtByParticipant.${me}`]: now,
        [`lastHeartbeatByParticipant.${me}`]: now,
        updatedAt: now,
        state: session.state === "ringing" ? "connecting" : session.state,
      },
    },
    { new: true }
  ).lean();

  if (!updated) return { ok: false, error: "Ended" };

  const connectedMap = (updated.connectedAtByParticipant || {}) as Record<string, Date>;
  const callerConnected = Boolean(connectedMap[String(updated.caller)]);
  const calleeConnected = Boolean(connectedMap[String(updated.callee)]);

  if (callerConnected && calleeConnected && updated.state !== "active") {
    const active = await CallSession.findOneAndUpdate(
      { callId, state: { $ne: "ended" } },
      { $set: { state: "active", activeAt: updated.activeAt || now, updatedAt: now } },
      { new: true }
    ).lean();
    if (active) {
      await publishCallWake([String(active.caller), String(active.callee)], {
        type: "call.updated",
        callId,
        state: "active",
        latestSeq: Number(active.nextSignalSeq) - 1,
      });
      return { ok: true, session: toDTO(active as Record<string, unknown>, me) };
    }
  }

  return { ok: true, session: toDTO(updated as Record<string, unknown>, me) };
}

export async function heartbeatCall(me: AuthUser, callId: string): Promise<{ ok: boolean }> {
  await dbConnect();
  const now = new Date();
  const res = await CallSession.updateOne(
    {
      callId,
      state: { $in: ["ringing", "connecting", "active"] },
      $or: [{ caller: me }, { callee: me }],
    },
    { $set: { updatedAt: now, [`lastHeartbeatByParticipant.${me}`]: now } }
  );
  return { ok: res.modifiedCount > 0 || res.matchedCount > 0 };
}

export async function getCallFingerprint(me: string): Promise<string> {
  await dbConnect();
  const session = await CallSession.findOne({
    $or: [{ caller: me }, { callee: me }],
    state: { $in: ["ringing", "connecting", "active"] },
  })
    .select("callId state nextSignalSeq updatedAt")
    .lean();
  if (!session) return "none";
  return `${session.callId}:${session.state}:${session.nextSignalSeq}:${session.updatedAt?.valueOf?.() ?? session.updatedAt}`;
}
