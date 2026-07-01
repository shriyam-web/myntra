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
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  repliedTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  deletedFor: [{ type: String }],
  savedBy: [{ type: String }],
  reactions: [{
    user: { type: String, required: true },
    type: { type: String, enum: ['sad', 'love', 'funny', 'confused', 'angry'], required: true },
  }],
});

MessageSchema.index({ createdAt: -1 });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  lastSeen: { type: Date, default: Date.now },
  lastReadAt: { type: Date },
  chatBackgroundColor: { type: String, default: "bg-zinc-900/50" }, // Changed to string for flexibility
  chatBubbleColor: { type: String, default: "bg-indigo-600" },
  chatWallpaper: { type: String, default: "" },
  themeName: { type: String, default: "Midnight (Default)" },
  callStatus: { type: String, enum: ['idle', 'ringing', 'on-call'], default: 'idle' },
  callerId: { type: String, default: null },
  signalData: { type: String, default: null }, // Store WebRTC offer/answer/candidates
  lastCallEndReason: { type: String, default: null }, // 'missed', 'rejected', 'completed', 'ended'
});

const CallLogSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: String, enum: ['missed', 'completed', 'rejected'], required: true },
  duration: { type: Number, default: 0 }, // in seconds
  createdAt: { type: Date, default: Date.now },
});

export const Ticket = models.Ticket || model('Ticket', TicketSchema);
export const Wishlist = models.Wishlist || model('Wishlist', WishlistSchema);
export const Plan = models.Plan || model('Plan', PlanSchema);
export const TimelineDate = models.TimelineDate || model('TimelineDate', DateSchema);
export const Message = models.Message || model('Message', MessageSchema);
export const User = models.User || model('User', UserSchema);
export const CallLog = models.CallLog || model('CallLog', CallLogSchema);
