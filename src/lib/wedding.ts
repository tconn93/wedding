export const couple: { first: string; second: string } = {
  first: "Tyler Conner",
  second: "Rose Abrao",
};

/** Start of the wedding day. The hour is not set yet. */
export const WEDDING_AT = new Date("2027-04-10T00:00:00-05:00");
export const WEDDING_DATE_LABEL = "April 10, 2027";
export const RSVP_BY_LABEL = "March 10, 2027";

export const photos = {
  aisle: "/photos/aisle.jpg",
  table: "/photos/table.jpg",
  bouquet: "/photos/bouquet.jpg",
  lights: "/photos/lights.jpg",
} as const;

export type Attendance = "yes" | "no";
export type Meal = "fish" | "chicken" | "garden";

export type Reply = {
  id: string;
  name: string;
  attending: Attendance;
  seats: number;
  party: string;
  meal: Meal | "";
  song: string;
  note: string;
  createdAt: string;
};

export const meals: { id: Meal; label: string; detail: string }[] = [
  { id: "fish", label: "Gulf fish", detail: "Caught-that-week, simply done" },
  { id: "chicken", label: "Herb chicken", detail: "Roasted, lemon, olive oil" },
  { id: "garden", label: "Garden plate", detail: "Vegetables, grains, no meat" },
];

export function coupleTitle() {
  return couple.second ? `${couple.first} & ${couple.second}` : couple.first;
}

export function monogram() {
  return couple.second
    ? `${couple.first.charAt(0)}&${couple.second.charAt(0)}`
    : couple.first.charAt(0);
}

export function mealLabel(meal: Meal | "") {
  return meals.find((item) => item.id === meal)?.label ?? "";
}

export function replyPlainText(reply: Reply) {
  const lines = [
    `Reply for ${WEDDING_DATE_LABEL}`,
    reply.attending === "yes"
      ? `${reply.name} — accepts with pleasure, ${reply.seats} ${reply.seats === 1 ? "seat" : "seats"}`
      : `${reply.name} — regretfully declines`,
  ];
  if (reply.attending === "yes" && reply.party) lines.push(`Party: ${reply.party}`);
  if (reply.meal) lines.push(`Dinner: ${mealLabel(reply.meal)}`);
  if (reply.song) lines.push(`Song: ${reply.song}`);
  if (reply.note) lines.push(`Note: ${reply.note}`);
  return lines.join("\n");
}

export function bookPlainText(book: Reply[]) {
  if (book.length === 0) return "No replies on this phone yet.";
  const coming = book.filter((reply) => reply.attending === "yes");
  const seats = coming.reduce((total, reply) => total + reply.seats, 0);
  const regrets = book.length - coming.length;
  const head = `${coming.length} coming · ${regrets} ${regrets === 1 ? "regret" : "regrets"} · ${seats} ${seats === 1 ? "seat" : "seats"}`;
  return [head, "", ...book.map(replyPlainText)].join("\n\n");
}

const BOOK_KEY = "tenth-of-april-book";
export const MINE_KEY = "tenth-of-april-mine";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isReply(value: unknown): value is Reply {
  if (!value || typeof value !== "object") return false;
  const reply = value as Partial<Reply>;
  return (
    typeof reply.id === "string" &&
    typeof reply.name === "string" &&
    (reply.attending === "yes" || reply.attending === "no")
  );
}

export function loadBook(): Reply[] {
  const raw = readJson(BOOK_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isReply);
}

export function saveBook(book: Reply[]) {
  localStorage.setItem(BOOK_KEY, JSON.stringify(book));
}

export function upsertReply(reply: Reply): Reply[] {
  const book = [reply, ...loadBook().filter((item) => item.id !== reply.id)];
  saveBook(book);
  return book;
}

export function removeReply(id: string): Reply[] {
  const book = loadBook().filter((item) => item.id !== id);
  saveBook(book);
  return book;
}

function clampInt(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function encodeReply(reply: Reply) {
  const bytes = new TextEncoder().encode(JSON.stringify(reply));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeReply(token: string): Reply | null {
  try {
    const pad = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Reply>;
    if (typeof json.name !== "string" || !json.name.trim()) return null;
    if (json.attending !== "yes" && json.attending !== "no") return null;
    const meal =
      json.meal === "fish" || json.meal === "chicken" || json.meal === "garden" ? json.meal : "";
    return {
      id: typeof json.id === "string" && json.id.length < 80 ? json.id : crypto.randomUUID(),
      name: json.name.trim().slice(0, 80),
      attending: json.attending,
      seats: json.attending === "yes" ? clampInt(json.seats, 1, 8) : 0,
      party: typeof json.party === "string" ? json.party.trim().slice(0, 240) : "",
      meal: json.attending === "yes" ? meal : "",
      song: typeof json.song === "string" ? json.song.trim().slice(0, 80) : "",
      note: typeof json.note === "string" ? json.note.trim().slice(0, 320) : "",
      createdAt:
        typeof json.createdAt === "string" ? json.createdAt.slice(0, 40) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

let cachedToken: string | null | undefined;

export function takeReplyToken(): string | null {
  if (cachedToken !== undefined) return cachedToken;
  const hash = window.location.hash;
  const prefix = "#reply=";
  let token: string | null = null;
  if (hash.startsWith(prefix)) {
    try {
      token = decodeURIComponent(hash.slice(prefix.length));
    } catch {
      token = null;
    }
  }
  cachedToken = token;
  if (token) {
    const next = `${window.location.pathname}${window.location.search}#book`;
    window.history.replaceState(null, "", next);
  }
  return token;
}

export function replyLink(reply: Reply) {
  const token = encodeURIComponent(encodeReply(reply));
  return `${window.location.origin}${window.location.pathname}#reply=${token}`;
}
