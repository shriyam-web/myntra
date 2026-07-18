export type CallState = "ringing" | "connecting" | "active" | "ended";

export type CallEndReason =
  | "rejected"
  | "timeout"
  | "cancelled"
  | "hangup"
  | "failed"
  | "disconnected"
  | "completed"
  | "missed";

export type CallSignalType =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "ice-complete"
  | "ice-restart-offer"
  | "ice-restart-answer";

export type CallLogStatus =
  | "missed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "timeout"
  | "failed"
  | "disconnected";

export interface CallSessionDTO {
  callId: string;
  startRequestId: string;
  caller: string;
  callee: string;
  state: CallState;
  ringExpiresAt: string;
  answeredAt: string | null;
  activeAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  endReason: CallEndReason | null;
  nextSignalSeq: number;
  createdAt: string;
  updatedAt: string;
  role: "caller" | "callee";
  partner: string;
}

export interface CallSignalDTO {
  callId: string;
  signalId: string;
  seq: number;
  from: string;
  to: string;
  type: CallSignalType;
  revision: number;
  iceGeneration: number;
  payload: string;
  createdAt: string;
}

export const RING_TIMEOUT_MS = 40_000;
export const HEARTBEAT_STALE_MS = 45_000;
export const SIGNAL_TTL_MS = 2 * 60 * 60 * 1000;
