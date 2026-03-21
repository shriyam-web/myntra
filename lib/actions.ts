"use server";

import dbConnect, { inMemoryStorage } from "./mongodb";
import { Ticket, Wishlist, Plan, TimelineDate, Message } from "../models/schemas";
import { revalidatePath } from "next/cache";

// FETCH ALL DATA
export async function fetchData() {
  try {
    const connection = await dbConnect();

    // Use in-memory storage if no database connection
    if (connection.inMemory) {
      return {
        tickets: inMemoryStorage.tickets.map(t => ({ ...t, _id: t.id })),
        wishlist: inMemoryStorage.wishlist.map(w => ({ ...w, _id: w.id })),
        plans: inMemoryStorage.plans.map(p => ({ ...p, _id: p.id })),
        dates: inMemoryStorage.dates.map(d => ({ ...d, _id: d.id })),
        messages: inMemoryStorage.messages.map(m => ({ ...m, _id: m._id }))
      };
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const ticket = {
        id: Date.now().toString(),
        description: data.description,
        createdBy: data.createdBy,
        status: "open",
        createdAt: new Date().toISOString()
      };
      inMemoryStorage.tickets.push(ticket);
      revalidatePath('/');
      return ticket;
    }

    const ticket = await Ticket.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(ticket));
  } catch (error) {
    console.error('Failed to create ticket:', error);
    throw new Error('Failed to submit complaint. Database connection error.');
  }
}

export async function updateTicket(id: string, updates: any) {
  try {
    const connection = await dbConnect();

    if (connection.inMemory) {
      const ticketIndex = inMemoryStorage.tickets.findIndex(t => t.id === id);
      if (ticketIndex !== -1) {
        inMemoryStorage.tickets[ticketIndex] = { ...inMemoryStorage.tickets[ticketIndex], ...updates };
        revalidatePath('/');
        return inMemoryStorage.tickets[ticketIndex];
      }
      throw new Error('Ticket not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const ticketIndex = inMemoryStorage.tickets.findIndex(t => t.id === id);
      if (ticketIndex !== -1) {
        inMemoryStorage.tickets.splice(ticketIndex, 1);
        revalidatePath('/');
        return;
      }
      throw new Error('Ticket not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const wish = {
        id: Date.now().toString(),
        content: data.content,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString()
      };
      inMemoryStorage.wishlist.push(wish);
      revalidatePath('/');
      return wish;
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const wishIndex = inMemoryStorage.wishlist.findIndex(w => w.id === id);
      if (wishIndex !== -1) {
        inMemoryStorage.wishlist[wishIndex].content = content;
        revalidatePath('/');
        return inMemoryStorage.wishlist[wishIndex];
      }
      throw new Error('Wish not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const wishIndex = inMemoryStorage.wishlist.findIndex(w => w.id === id);
      if (wishIndex !== -1) {
        inMemoryStorage.wishlist.splice(wishIndex, 1);
        revalidatePath('/');
        return;
      }
      throw new Error('Wish not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const plan = {
        id: Date.now().toString(),
        content: data.content,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString()
      };
      inMemoryStorage.plans.push(plan);
      revalidatePath('/');
      return plan;
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const planIndex = inMemoryStorage.plans.findIndex(p => p.id === id);
      if (planIndex !== -1) {
        inMemoryStorage.plans[planIndex].content = content;
        revalidatePath('/');
        return inMemoryStorage.plans[planIndex];
      }
      throw new Error('Plan not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const planIndex = inMemoryStorage.plans.findIndex(p => p.id === id);
      if (planIndex !== -1) {
        inMemoryStorage.plans.splice(planIndex, 1);
        revalidatePath('/');
        return;
      }
      throw new Error('Plan not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const dateEntry = {
        id: Date.now().toString(),
        event: data.event,
        date: data.date,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString()
      };
      inMemoryStorage.dates.push(dateEntry);
      revalidatePath('/');
      return dateEntry;
    }

    const dateEntry = await TimelineDate.create(data);
    revalidatePath('/');
    return JSON.parse(JSON.stringify(dateEntry));
  } catch (error) {
    console.error('Failed to create date:', error);
    throw new Error('Failed to add timeline event. Database connection error.');
  }
}

export async function updateDate(id: string, updates: any) {
  try {
    const connection = await dbConnect();

    if (connection.inMemory) {
      const dateIndex = inMemoryStorage.dates.findIndex(d => d.id === id);
      if (dateIndex !== -1) {
        inMemoryStorage.dates[dateIndex] = { ...inMemoryStorage.dates[dateIndex], ...updates };
        revalidatePath('/');
        return inMemoryStorage.dates[dateIndex];
      }
      throw new Error('Date not found');
    }

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
    const connection = await dbConnect();

    if (connection.inMemory) {
      const dateIndex = inMemoryStorage.dates.findIndex(d => d.id === id);
      if (dateIndex !== -1) {
        inMemoryStorage.dates.splice(dateIndex, 1);
        revalidatePath('/');
        return;
      }
      throw new Error('Date not found');
    }

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
    const connection = await dbConnect();
    if (connection.inMemory) {
      const message = {
        _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: data.text,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
        __v: 0
      };
      inMemoryStorage.messages.push(message);
      revalidatePath('/');
      return message;
    }

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
    const connection = await dbConnect();
    if (connection.inMemory) {
      const messageIndex = inMemoryStorage.messages.findIndex(msg => msg._id === id);
      if (messageIndex !== -1) {
        inMemoryStorage.messages[messageIndex].text = text;
        revalidatePath('/');
        return inMemoryStorage.messages[messageIndex];
      }
      throw new Error('Message not found');
    }

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
    const connection = await dbConnect();
    if (connection.inMemory) {
      const messageIndex = inMemoryStorage.messages.findIndex(msg => msg._id === id);
      if (messageIndex !== -1) {
        inMemoryStorage.messages.splice(messageIndex, 1);
        revalidatePath('/');
        return;
      }
      throw new Error('Message not found');
    }

    await Message.findByIdAndDelete(id);
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw new Error('Failed to delete message. Database connection error.');
  }
}
