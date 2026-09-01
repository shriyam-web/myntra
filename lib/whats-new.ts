/**
 * What's New releases.
 *
 * To announce a change: prepend a new object with a unique `id`.
 * Alpha 1 and delta 1 each mark read separately; a new `id` shows again
 * on their next login until they mark that release read.
 */
export type WhatsNewRelease = {
  id: string;
  date: string;
  title: string;
  items: string[];
};

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    id: "2026-09-02-whats-new",
    date: "2 Sep 2026",
    title: "What's New is here",
    items: [
      "This board pops up after login whenever something new ships.",
      "Every chat bubble shows its own time and ticks again.",
      "Long-press a message → Info for sent and seen times.",
      "Chrome incognito opens the site again (Google had blocked the old check).",
      "Gallery photos send as the full original, not a cropped preview.",
    ],
  },
];

export function latestWhatsNewId(releases: WhatsNewRelease[] = WHATS_NEW_RELEASES): string | null {
  return releases[0]?.id ?? null;
}

/** Releases the user has not marked yet, newest first. */
export function getUnreadWhatsNew(
  seenId?: string | null,
  releases: WhatsNewRelease[] = WHATS_NEW_RELEASES
): WhatsNewRelease[] {
  if (!releases.length) return [];
  if (!seenId) return releases.slice();
  const seenIndex = releases.findIndex((release) => release.id === seenId);
  if (seenIndex === -1) return releases.slice();
  return releases.slice(0, seenIndex);
}
