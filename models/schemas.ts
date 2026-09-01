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
  done: { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
  doneBy: { type: String, default: null },
  dueAt: { type: Date, default: null },
  // Groups checklist items that were shared together as one todo list
  listId: { type: String, default: null },
  listTitle: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  // Mirrored from the linked disappearing chat card (null = permanent)
  expiresAt: { type: Date, default: null },
});

const DateSchema = new Schema({
  event: { type: String, required: true },
  date: { type: String, required: true },
  createdBy: { type: String, required: true },
  recurringYearly: { type: Boolean, default: false },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const ReminderSchema = new Schema({
  title: { type: String, required: true },
  dueAt: { type: Date, required: true },
  done: { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  linkedDateId: { type: String, default: null },
  expiresAt: { type: Date, default: null },
});

const MoodCheckInSchema = new Schema({
  user: { type: String, required: true },
  mood: {
    type: String,
    enum: ['love', 'happy', 'calm', 'tired', 'sad', 'stressed', 'grateful'],
    required: true,
  },
  note: { type: String, default: '' },
  day: { type: String, required: true }, // YYYY-MM-DD local day key
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

MoodCheckInSchema.index({ user: 1, day: 1 }, { unique: true });
MoodCheckInSchema.index({ day: -1 });

const MessageSchema = new Schema({
  text: { type: String, required: false },
  imageUrl: { type: String, required: false },
  imageUrls: [{ type: String }],
  videoUrl: { type: String, required: false },
  videoUrls: [{ type: String }],
  audioUrl: { type: String, required: false },
  audioUrls: [{ type: String }],
  // Document attachments (Cloudinary raw resources) with original metadata
  documents: {
    type: [{
      url: { type: String, required: true },
      name: { type: String, required: true },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      publicId: { type: String, default: '' },
      resourceType: { type: String, default: 'raw' },
    }],
    default: undefined,
  },
  // One-time shared location
  location: {
    type: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      accuracy: { type: Number, min: 0 },
    },
    default: undefined,
  },
  // Stable client-generated id for optimistic reconciliation
  clientMessageId: { type: String, default: null },
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
  kind: { type: String, enum: ['message', 'call-log', 'location', 'poll', 'task', 'reminder'], default: 'message' },
  relatedCallId: { type: String, default: null },
  callMeta: {
    from: String,
    to: String,
    status: String,
    duration: Number,
  },
  pollMeta: {
    question: { type: String },
    options: [{
      id: { type: String },
      text: { type: String },
    }],
    votes: [{
      user: { type: String },
      optionId: { type: String },
    }],
    closed: { type: Boolean, default: false },
  },
  sharedItemMeta: {
    itemId: { type: String },
    itemIds: [{ type: String }],
    listId: { type: String },
    listTitle: { type: String },
    itemType: { type: String, enum: ['task', 'reminder', 'todo-list'] },
  },
  // Disappearing-mode snapshot (set at creation; cleared permanently if pinned)
  disappearing: { type: Boolean, default: false },
  viewedAt: { type: Date, default: null },
  seenAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
});

MessageSchema.index({ createdAt: -1 });
MessageSchema.index(
  { relatedCallId: 1 },
  { unique: true, partialFilterExpression: { relatedCallId: { $type: 'string' } } }
);
MessageSchema.index(
  { clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } }
);
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' }, disappearing: true } });
PlanSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });
ReminderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  lastSeen: { type: Date, default: Date.now },
  lastReadAt: { type: Date },
  // Typing indicator: user counts as typing while typingUntil is in the future.
  // Stored in Mongo (not memory) so it works across serverless instances.
  typingUntil: { type: Date, default: null },
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
  expiresAt: { type: Date, default: null },
});

CallLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

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
  failedLoginAttempts: { type: Number, default: 0 },
  disappearingMode: { type: Boolean, default: false },
  disappearingEnabledAt: { type: Date, default: null },
  disappearingEnabledBy: { type: String, default: null },
});

/** Deferred Cloudinary purge for expired disappearing media (runs via daily cron). */
const MediaCleanupJobSchema = new Schema({
  messageId: { type: String, required: true, index: true },
  assets: [{
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'image' },
    deliveryType: { type: String, default: 'authenticated' },
  }],
  purgeAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

MediaCleanupJobSchema.index({ purgeAt: 1 });

export const Ticket = models.Ticket || model('Ticket', TicketSchema);
export const Wishlist = models.Wishlist || model('Wishlist', WishlistSchema);
export const Plan = models.Plan || model('Plan', PlanSchema);
export const TimelineDate = models.TimelineDate || model('TimelineDate', DateSchema);
export const Reminder = models.Reminder || model('Reminder', ReminderSchema);
export const MoodCheckIn = models.MoodCheckIn || model('MoodCheckIn', MoodCheckInSchema);
export const Message = models.Message || model('Message', MessageSchema);
export const User = models.User || model('User', UserSchema);
export const CallLog = models.CallLog || model('CallLog', CallLogSchema);
export const CallSession = models.CallSession || model('CallSession', CallSessionSchema);
export const CallSignal = models.CallSignal || model('CallSignal', CallSignalSchema);
export const AppSettings = models.AppSettings || model('AppSettings', AppSettingsSchema);
export const MediaCleanupJob = models.MediaCleanupJob || model('MediaCleanupJob', MediaCleanupJobSchema);
