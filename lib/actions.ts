"use server";

import dbConnect from "./mongodb";
import { Ticket, Wishlist, Plan, TimelineDate, Message, User } from "../models/schemas";
import { revalidatePath } from "next/cache";

// FETCH ALL DATA
export async function fetchData(messageLimit = 50) {
  try {
    await dbConnect();

    const [tickets, wishlist, plans, dates, messages, users] = await Promise.all([
      Ticket.find({}).sort({ createdAt: -1 }),
      Wishlist.find({}),
      Plan.find({}),
      TimelineDate.find({}),
      Message.find({}).sort({ createdAt: -1 }).limit(messageLimit),
      User.find({})
    ]);

    // Reverse messages to show chronological order (oldest to newest)
    const sortedMessages = messages.reverse();

    return {
      tickets: JSON.parse(JSON.stringify(tickets)),
      wishlist: JSON.parse(JSON.stringify(wishlist)),
      plans: JSON.parse(JSON.stringify(plans)),
      dates: JSON.parse(JSON.stringify(dates)),
      messages: JSON.parse(JSON.stringify(sortedMessages)),
      users: JSON.parse(JSON.stringify(users))
    };
  } catch (error) {
    console.error('Database fetch error:', error);
    throw new Error('Unable to connect to database. Please check your MongoDB connection and try again.');
  }
}

// TICKETS (Complaints)
export async function createTicket(data: { description: string; createdBy: string }) {
  try {
    await dbConnect();
    const ticket = await Ticket.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to create ticket:', error);
    throw new Error('Failed to submit complaint. Database connection error.');
  }
}

export async function updateTicket(id: string, updates: Record<string, unknown>) {
  try {
    await dbConnect();
    const ticket = await Ticket.findByIdAndUpdate(id, updates, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to update ticket:', error);
    throw new Error('Failed to update ticket status. Database connection error.');
  }
}

export async function deleteTicket(id: string) {
  try {
    await dbConnect();
    await Ticket.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    throw new Error('Failed to delete ticket. Database connection error.');
  }
}

// WISHLIST
export async function createWish(data: { content: string; createdBy: string }) {
  try {
    await dbConnect();
    const wish = await Wishlist.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(wish));
  } catch (error) {
    console.error('Failed to create wish:', error);
    throw new Error('Failed to add to wishlist. Database connection error.');
  }
}

export async function updateWish(id: string, content: string) {
  try {
    await dbConnect();
    const wish = await Wishlist.findByIdAndUpdate(id, { content }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(wish));
  } catch (error) {
    console.error('Failed to update wish:', error);
    throw new Error('Failed to update wishlist item. Database connection error.');
  }
}

export async function deleteWish(id: string) {
  try {
    await dbConnect();
    await Wishlist.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete wish:', error);
    throw new Error('Failed to delete wishlist item. Database connection error.');
  }
}

// PLANS
export async function createPlan(data: { content: string; createdBy: string }) {
  try {
    await dbConnect();
    const plan = await Plan.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to create plan:', error);
    throw new Error('Failed to add plan. Database connection error.');
  }
}

export async function updatePlan(id: string, content: string) {
  try {
    await dbConnect();
    const plan = await Plan.findByIdAndUpdate(id, { content }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to update plan:', error);
    throw new Error('Failed to update plan. Database connection error.');
  }
}

export async function deletePlan(id: string) {
  try {
    await dbConnect();
    await Plan.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete plan:', error);
    throw new Error('Failed to delete plan. Database connection error.');
  }
}

// TIMELINE DATES
export async function createDate(data: { event: string; date: string; createdBy: string }) {
  try {
    await dbConnect();
    const dateEntry = await TimelineDate.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(dateEntry));
  } catch (error) {
    console.error('Failed to create date:', error);
    throw new Error('Failed to add timeline event. Database connection error.');
  }
}

export async function updateDate(id: string, updates: Record<string, unknown>) {
  try {
    await dbConnect();
    const dateEntry = await TimelineDate.findByIdAndUpdate(id, updates, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(dateEntry));
  } catch (error) {
    console.error('Failed to update date:', error);
    throw new Error('Failed to update timeline event. Database connection error.');
  }
}

export async function deleteDate(id: string) {
  try {
    await dbConnect();
    await TimelineDate.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete date:', error);
    throw new Error('Failed to delete timeline event. Database connection error.');
  }
}

// MESSAGES
async function sendTelegramNotification(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notification skipped: Credentials missing.');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

export async function createMessage(data: { text: string; createdBy: string }) {
  try {
    await dbConnect();
    const message = await Message.create(data);

    // Send Telegram notification if alpha 1 sends a message
    if (data.createdBy === "alpha 1") {
      sendTelegramNotification(`Alpha 1 sent a new message: ${data.text.substring(0, 100)}${data.text.length > 100 ? "..." : ""}`);
    }

    revalidatePath('/');
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.error('Failed to create message:', error);
    throw new Error('Failed to create message. Database connection error.');
  }
}

export async function updateMessage(id: string, text: string) {
  try {
    await dbConnect();
    const message = await Message.findByIdAndUpdate(id, { text }, { new: true });
    revalidatePath('/');
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.error('Failed to update message:', error);
    throw new Error('Failed to update message. Database connection error.');
  }
}

export async function deleteMessage(id: string) {
  try {
    await dbConnect();
    await Message.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw new Error('Failed to delete message. Database connection error.');
  }
}

export async function updatePresence(username: string) {
  try {
    await dbConnect();
    await User.findOneAndUpdate(
      { username },
      { lastSeen: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
}

export async function markAllAsRead(username: string) {
  try {
    await dbConnect();
    await User.findOneAndUpdate(
      { username },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to mark as read:', error);
    throw new Error('Failed to mark as read. Database connection error.');
  }
}
