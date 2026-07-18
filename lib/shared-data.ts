import dbConnect from "./mongodb";
import { Plan, TimelineDate, Reminder, MoodCheckIn } from "../models/schemas";

/** Compact fingerprint for SSE — changes when any shared couple collection mutates. */
export async function getSharedDataFingerprint(): Promise<string> {
  await dbConnect();
  const [planAgg, dateAgg, remAgg, moodAgg] = await Promise.all([
    Plan.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          maxAt: { $max: "$createdAt" },
          done: { $sum: { $cond: ["$done", 1, 0] } },
        },
      },
    ]),
    TimelineDate.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, maxAt: { $max: "$createdAt" } } },
    ]),
    Reminder.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          maxDue: { $max: "$dueAt" },
          done: { $sum: { $cond: ["$done", 1, 0] } },
        },
      },
    ]),
    MoodCheckIn.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, maxAt: { $max: "$updatedAt" } } },
    ]),
  ]);
  return JSON.stringify({
    p: planAgg[0] || null,
    d: dateAgg[0] || null,
    r: remAgg[0] || null,
    m: moodAgg[0] || null,
  });
}
