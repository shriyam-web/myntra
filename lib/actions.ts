"use server";

import dbConnect from "./mongodb";
import { Ticket, Wishlist, Plan, TimelineDate, Message } from "../models/schemas";
import { revalidatePath } from "next/cache";

// FETCH ALL DATA
export async function fetchData() {
  try {
    await dbConnect();

    const [tickets, wishlist, plans, dates, messages] = await Promise.all([
      Ticket.find({}).sort({ createdAt: -1 }),
      Wishlist.find({}),
      Plan.find({}),
      TimelineDate.find({}),
      Message.find({}).sort({ createdAt: 1 })
    ]);

    return {
      tickets: JSON.parse(JSON.stringify(tickets)),
      wishlist: JSON.parse(JSON.stringify(wishlist)),
      plans: JSON.parse(JSON.stringify(plans)),
      dates: JSON.parse(JSON.stringify(dates)),
      messages: JSON.parse(JSON.stringify(messages))
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
export async function createMessage(data: { text: string; createdBy: string }) {
  try {
    await dbConnect();
    const message = await Message.create(data);
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
