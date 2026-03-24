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
  text: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Ticket = models.Ticket || model('Ticket', TicketSchema);
export const Wishlist = models.Wishlist || model('Wishlist', WishlistSchema);
export const Plan = models.Plan || model('Plan', PlanSchema);
export const TimelineDate = models.TimelineDate || model('TimelineDate', DateSchema);
export const Message = models.Message || model('Message', MessageSchema);
