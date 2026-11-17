import { useRef, useState } from "react";
import { bookPlainText, mealLabel, type Reply } from "@/lib/wedding";

export function ReplyBook({
  book,
  notice,
  onRemove,
}: {
  book: Reply[];
  notice: string | null;
  onRemove: (id: string) => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const coming = book.filter((reply) => reply.attending === "yes");
  const seats = coming.reduce((total, reply) => total + reply.seats, 0);
  const regrets = book.length - coming.length;

  async function copyBook() {
    const text = bookPlainText(book);
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setManual(text);
    }
  }

  return (
    <div>
      {notice && <p className="mb-6 border border-tide bg-foam px-4 py-3 text-ink">{notice}</p>}
      {book.length === 0 ? (
        <p className="text-mist">
          Nothing filed on this phone yet. A reply lives here after it’s written on this phone, or
          after you open someone’s filing link here.
        </p>
      ) : (
        <>
          <p className="font-display text-2xl tabular-nums text-ink">
            {coming.length} coming
            <span className="text-mist"> · </span>
            {regrets} {regrets === 1 ? "regret" : "regrets"}
            <span className="text-mist"> · </span>
            {seats} {seats === 1 ? "seat" : "seats"}
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {book.map((reply) => (
              <li key={reply.id} className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl text-ink">{reply.name}</p>
                    <p className="mt-1 text-mist">
                      {reply.attending === "yes"
                        ? `Coming · ${reply.seats} ${reply.seats === 1 ? "seat" : "seats"}${reply.meal ? ` · ${mealLabel(reply.meal)}` : ""}`
                        : "Can’t make it"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm text-mist underline-offset-4 hover:text-ink hover:underline"
                    onClick={() => {
                      if (armed === reply.id) onRemove(reply.id);
                      else setArmed(reply.id);
                    }}
                  >
                    {armed === reply.id ? "Confirm remove" : "Remove"}
                  </button>
                </div>
                {reply.attending === "yes" && reply.party && (
                  <p className="mt-2 text-ink">{reply.party}</p>
                )}
                {reply.song && <p className="mt-1 text-mist">Song · {reply.song}</p>}
                {reply.note && <p className="mt-1 text-ink">{reply.note}</p>}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
            onClick={copyBook}
          >
            {copied ? "Copied" : "Copy the book"}
          </button>
          {manual && (
            <textarea readOnly value={manual} className="mt-4 w-full border border-line bg-paper p-3 text-base" rows={8} />
          )}
        </>
      )}
    </div>
  );
}
