import { Schema, model, models } from 'mongoose';

const TicketSchema = new Schema({
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const WishlistSchema = new Schema({
  content: { type: String, required: true },
  createdBy: { type: String, required: true },
});

const PlanSchema = new Schema({
  content: { type: String, required: true },
  createdBy: { type: String, required: true },
});

const DateSchema = new Schema({
  event: { type: String, required: true },
  date: { type: String, required: true },
  createdBy: { type: String, required: true },
});

const MessageSchema = new Schema({
  text: { type: String, required: false },
  imageUrl: { type: String, required: false },
  imageUrls: [{ type: String }],
  videoUrl: { type: String, required: false },
  videoUrls: [{ type: String }],
  audioUrl: { type: String, required: false },
  audioUrls: [{ type: String }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  repliedTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  deletedFor: [{ type: String }],
  savedBy: [{ type: String }],
  pinnedBy: [{ type: String }],
  reactions: [{
    user: { type: String, required: true },
    type: { type: String, enum: ['love', 'adore', 'kiss', 'hearteyes', 'hug', 'rose', 'fire', 'sparkle', 'funny', 'missyou', 'sad', 'confused', 'angry'], required: true },
  }],
  // Structured call-log metadata (preferred over parsing [CALL_LOG:...] text)
  kind: { type: String, enum: ['message', 'call-log'], default: 'message' },
  relatedCallId: { type: String, default: null },
  callMeta: {
    from: String,
    to: String,
    status: String,
    duration: Number,
  },
});

MessageSchema.index({ createdAt: -1 });
MessageSchema.index(
  { relatedCallId: 1 },
  { unique: true, partialFilterExpression: { relatedCallId: { $type: 'string' } } }
);

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  lastSeen: { type: Date, default: Date.now },
  lastReadAt: { type: Date },
  chatBackgroundColor: { type: String, default: "bg-zinc-900/50" },
  chatBubbleColor: { type: String, default: "bg-indigo-600" },
  chatWallpaper: { type: String, default: "" },
  themeName: { type: String, default: "Midnight (Default)" },
  // Legacy call fields kept for migration compatibility
  callStatus: { type: String, enum: ['idle', 'ringing', 'on-call'], default: 'idle' },
  callerId: { type: String, default: null },
  signalData: { type: String, default: null },
  callSignals: {
    type: [{ kind: { type: String }, payload: { type: String } }],
    default: [],
  },
  lastCallEndReason: { type: String, default: null },
  // Canonical claim for the active CallSession
  activeCallId: { type: String, default: null },
});

const CallLogSchema = new Schema({
  callId: { type: String, required: true, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  status: {
    type: String,
    enum: ['missed', 'completed', 'rejected', 'cancelled', 'timeout', 'failed', 'disconnected'],
    required: true,
  },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const CallSessionSchema = new Schema({
  callId: { type: String, required: true, unique: true },
  startRequestId: { type: String, required: true },
  caller: { type: String, required: true },
  callee: { type: String, required: true },
  state: {
    type: String,
    enum: ['ringing', 'connecting', 'active', 'ended'],
    default: 'ringing',
    required: true,
  },
  ringExpiresAt: { type: Date, required: true },
  answeredAt: { type: Date, default: null },
  connectedAtByParticipant: {
    type: Map,
    of: Date,
    default: {},
  },
  activeAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  endedBy: { type: String, default: null },
  endReason: {
    type: String,
    enum: ['rejected', 'timeout', 'cancelled', 'hangup', 'failed', 'disconnected', 'completed', 'missed'],
    default: null,
  },
  nextSignalSeq: { type: Number, default: 1 },
  lastHeartbeatByParticipant: {
    type: Map,
    of: Date,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CallSessionSchema.index({ caller: 1, startRequestId: 1 }, { unique: true });
CallSessionSchema.index({ state: 1, ringExpiresAt: 1 });
CallSessionSchema.index({ state: 1, updatedAt: 1 });

const CallSignalSchema = new Schema({
  callId: { type: String, required: true, index: true },
  signalId: { type: String, required: true },
  seq: { type: Number, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  type: {
    type: String,
    enum: ['offer', 'answer', 'ice-candidate', 'ice-complete', 'ice-restart-offer', 'ice-restart-answer'],
    required: true,
  },
  revision: { type: Number, default: 0 },
  iceGeneration: { type: Number, default: 0 },
  payload: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

CallSignalSchema.index({ callId: 1, signalId: 1 }, { unique: true });
CallSignalSchema.index({ callId: 1, seq: 1 }, { unique: true });
CallSignalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AppSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceEnabledAt: { type: Date },
  maintenanceEnabledBy: { type: String },
});

export const Ticket = models.Ticket || model('Ticket', TicketSchema);
export const Wishlist = models.Wishlist || model('Wishlist', WishlistSchema);
export const Plan = models.Plan || model('Plan', PlanSchema);
export const TimelineDate = models.TimelineDate || model('TimelineDate', DateSchema);
export const Message = models.Message || model('Message', MessageSchema);
export const User = models.User || model('User', UserSchema);
export const CallLog = models.CallLog || model('CallLog', CallLogSchema);
export const CallSession = models.CallSession || model('CallSession', CallSessionSchema);
export const CallSignal = models.CallSignal || model('CallSignal', CallSignalSchema);
export const AppSettings = models.AppSettings || model('AppSettings', AppSettingsSchema);
