import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  couple,
  meals,
  replyLink,
  replyPlainText,
  type Attendance,
  type Meal,
  type Reply,
} from "@/lib/wedding";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const fieldClass =
  "mt-2 w-full border-b border-line bg-transparent py-3 text-base text-ink outline-none focus:border-tide";

export function RsvpForm({
  initial,
  onSave,
  suggestedName,
}: {
  initial: Reply | null;
  onSave: (reply: Reply) => void;
  suggestedName?: string | null;
}) {
  const idRef = useRef(initial?.id ?? crypto.randomUUID());
  const [name, setName] = useState(initial?.name ?? "");
  const [attending, setAttending] = useState<Attendance | "">(initial?.attending ?? "");
  const [seats, setSeats] = useState(initial?.seats || 1);
  const [party, setParty] = useState(initial?.party ?? "");
  const [meal, setMeal] = useState<Meal | "">(initial?.meal ?? "");
  const [song, setSong] = useState(initial?.song ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Reply | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!initial) return;
    idRef.current = initial.id;
    setName(initial.name);
    setAttending(initial.attending);
    setSeats(initial.seats || 1);
    setParty(initial.party);
    setMeal(initial.meal);
    setSong(initial.song);
    setNote(initial.note);
  }, [initial]);

  useEffect(() => {
    if (!suggestedName) return;
    setName((current) => (current.trim() ? current : suggestedName));
  }, [suggestedName]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      setCopied(key);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setManual(text);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please tell us your name.");
      return;
    }
    if (attending !== "yes" && attending !== "no") {
      setError("Let us know if you can come.");
      return;
    }
    if (attending === "yes" && !meal) {
      setError("Choose a dinner so we can set the table.");
      return;
    }
    const reply: Reply = {
      id: idRef.current,
      name: trimmed.slice(0, 80),
      attending,
      seats: attending === "yes" ? seats : 0,
      party: attending === "yes" ? (party.trim() || trimmed).slice(0, 240) : "",
      meal: attending === "yes" ? meal : "",
      song: attending === "yes" ? song.trim().slice(0, 80) : "",
      note: note.trim().slice(0, 320),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    setError("");
    setDone(reply);
    onSave(reply);
  }

  if (done) {
    const host = couple.second ? `${couple.first} and ${couple.second}` : couple.first;
    return (
      <div className="border border-line bg-paper px-5 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-widest text-mist">
          {coupleTitleLine()} · {done.attending === "yes" ? "The reply" : "With regrets"}
        </p>
        <h3 className="mt-4 font-display text-4xl leading-tight text-ink">{done.name}</h3>
        <p className="mt-2 font-display text-2xl italic text-tide">
          {done.attending === "yes" ? "accepts with pleasure" : "regretfully declines"}
        </p>
        {done.attending === "yes" && (
          <p className="mt-4 text-mist">
            {done.seats} {done.seats === 1 ? "seat" : "seats"}
            {done.meal ? ` · ${meals.find((item) => item.id === done.meal)?.label}` : ""}
          </p>
        )}
        {done.note && <p className="mt-4 text-ink">{done.note}</p>}
        <p className="mt-6 text-mist">
          Saved on this phone. Text {host} the note, or send the link and open it on the phone
          that should keep the guest book.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-tide px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96]"
            onClick={() => copy("note", replyPlainText(done))}
          >
            {copied === "note" ? "Copied" : "Copy a note to send"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
            onClick={() => copy("link", replyLink(done))}
          >
            {copied === "link" ? "Copied" : "Copy the filing link"}
          </button>
        </div>
        {manual && (
          <textarea readOnly value={manual} className="mt-4 w-full border border-line bg-sand p-3 text-base" rows={5} />
        )}
        <button
          type="button"
          className="mt-6 text-sm text-tide underline-offset-4 hover:underline"
          onClick={() => setDone(null)}
        >
          Edit this reply
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line bg-paper px-5 py-8 sm:px-8" noValidate>
      {initial && (
        <p className="mb-6 text-mist">This updates the reply already saved on this phone.</p>
      )}
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-mist">Your name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
          id="guest-name"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={80}
          placeholder="The name on the invitation"
        />
      </label>

      <fieldset className="mt-8">
        <legend className="text-xs uppercase tracking-widest text-mist">Will you be there?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["yes", "Accepts with pleasure"],
              ["no", "Regretfully declines"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex min-h-14 cursor-pointer items-center border px-4",
                attending === value ? "border-tide bg-foam" : "border-line",
              )}
            >
              <input
                type="radio"
                name="attending"
                value={value}
                checked={attending === value}
                onChange={() => setAttending(value)}
                className="size-4 accent-tide"
              />
              <span className="ml-3 font-display text-xl">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {attending === "yes" && (
        <div className="mt-8 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-mist">Seats</p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                className="grid size-12 place-items-center rounded-full border border-line text-xl transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
                onClick={() => setSeats((count) => Math.max(1, count - 1))}
                disabled={seats <= 1}
                aria-label="Fewer seats"
              >
                −
              </button>
              <p className="w-8 text-center font-display text-3xl tabular-nums">{seats}</p>
              <button
                type="button"
                className="grid size-12 place-items-center rounded-full border border-line text-xl transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
                onClick={() => setSeats((count) => Math.min(8, count + 1))}
                disabled={seats >= 8}
                aria-label="More seats"
              >
                +
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-mist">Names for the place cards</span>
            <textarea
              value={party}
              onChange={(event) => setParty(event.target.value)}
              className={fieldClass}
              rows={2}
              maxLength={240}
              placeholder="Everyone in your party, including you"
            />
          </label>

          <fieldset>
            <legend className="text-xs uppercase tracking-widest text-mist">Dinner</legend>
            <div className="mt-3 grid gap-3">
              {meals.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center justify-between gap-4 border px-4 py-3",
                    meal === item.id ? "border-tide bg-foam" : "border-line",
                  )}
                >
                  <span>
                    <span className="block font-display text-xl">{item.label}</span>
                    <span className="text-sm text-mist">{item.detail}</span>
                  </span>
                  <input
                    type="radio"
                    name="meal"
                    value={item.id}
                    checked={meal === item.id}
                    onChange={() => setMeal(item.id)}
                    className="size-4 accent-tide"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-mist">A song</span>
            <input
              value={song}
              onChange={(event) => setSong(event.target.value)}
              className={fieldClass}
              maxLength={80}
              placeholder="One you will actually dance to"
            />
          </label>
        </div>
      )}

      <label className="mt-8 block">
        <span className="text-xs uppercase tracking-widest text-mist">A note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
          rows={3}
          maxLength={320}
          placeholder="Allergies, a high chair, a hello"
        />
      </label>

      {error && (
        <p role="alert" className="mt-6 font-medium text-ink">
          {error}
        </p>
      )}

      <button
        id="send-reply"
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tide px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96] sm:w-auto"
      >
        {initial ? "Update the reply" : "Send your reply"}
      </button>
    </form>
  );
}

function coupleTitleLine() {
  return couple.second ? `${couple.first} & ${couple.second}` : couple.first;
}
