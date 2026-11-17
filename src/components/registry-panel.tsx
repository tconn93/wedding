import { useEffect, useState, type FormEvent } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addRegistryItem,
  listRegistry,
  removeRegistryItem,
  type RegistryItem,
} from "@/lib/wedding-data";

const fieldClass =
  "mt-2 w-full border-b border-line bg-transparent py-3 text-base text-ink outline-none focus:border-tide";

function problem(error: unknown) {
  if (error instanceof Error && error.message && error.message !== "Unauthorized") return error.message;
  return "That didn’t save. Try again.";
}

export function RegistryPanel() {
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<RegistryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [shop, setShop] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    listRegistry()
      .then((next) => {
        if (!cancel) setItems(next);
      })
      .catch(() => {
        if (!cancel) setError("The registry didn’t load.");
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (isPending) return <div className="h-40 animate-pulse border border-line bg-paper" />;

  if (!user) {
    return (
      <div className="border border-line bg-paper px-5 py-8 sm:px-8">
        <h3 className="font-display text-3xl text-ink">Sign in to see the list</h3>
        <p className="mt-3 text-mist">
          The gifts live with the wedding. Google sign-in opens the list, and lets us add a link.
        </p>
        <div className="mt-6">
          <GoogleSignIn callbackURL="/#registry" />
        </div>
      </div>
    );
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const item = await addRegistryItem({ data: { title, url, shop, note } });
      setItems((current) => [...(current ?? []), item]);
      setTitle("");
      setUrl("");
      setShop("");
      setNote("");
    } catch (err) {
      setError(problem(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const result = await removeRegistryItem({ data: id });
      if (result.removed) setItems((current) => (current ?? []).filter((item) => item.id !== id));
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <div className="space-y-8">
      {items === null ? (
        <div className="h-24 animate-pulse border border-line bg-paper" />
      ) : items.length === 0 ? (
        <p className="text-mist">Nothing picked yet. A link added here shows up for every guest.</p>
      ) : (
        <ul className="border-t border-line">
          {items.map((item) => (
            <li key={item.id} className="border-b border-line py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-3xl text-ink">{item.title}</h3>
                  {item.shop && <p className="mt-1 text-sm uppercase tracking-widest text-mist">{item.shop}</p>}
                  {item.note && <p className="mt-2 text-ink">{item.note}</p>}
                </div>
                {item.mine && (
                  <button
                    type="button"
                    className="shrink-0 text-sm text-tide underline-offset-4 hover:underline"
                    onClick={() => void remove(item.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center text-tide underline-offset-4 hover:underline"
              >
                Open the link
              </a>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void add(event)} className="border border-line bg-paper px-5 py-8 sm:px-8" noValidate>
        <h3 className="font-display text-3xl text-ink">Add a link</h3>
        <p className="mt-2 text-mist">For Tyler and Rose. Guests only see what gets saved.</p>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">What it is</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} maxLength={80} required />
        </label>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">Link</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={fieldClass}
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={400}
            required
          />
        </label>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">Shop, if you want</span>
          <input value={shop} onChange={(event) => setShop(event.target.value)} className={fieldClass} maxLength={40} />
        </label>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} maxLength={160} />
        </label>
        {error && (
          <p role="alert" className="mt-4 text-sm text-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-tide px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96] disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save this gift"}
        </button>
      </form>
    </div>
  );
}
