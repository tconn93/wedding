import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ReplyBook } from "@/components/reply-book";
import { RsvpForm } from "@/components/rsvp-form";
import { GalleryPanel } from "@/components/gallery-panel";
import { RegistryPanel } from "@/components/registry-panel";
import { GoogleSignIn } from "@/components/google-sign-in";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  couple,
  decodeReply,
  loadBook,
  MINE_KEY,
  monogram,
  photos,
  removeReply,
  RSVP_BY_LABEL,
  takeReplyToken,
  upsertReply,
  WEDDING_AT,
  WEDDING_DATE_LABEL,
  type Reply,
} from "@/lib/wedding";

const schedule = [
  { title: "Ceremony", detail: "Vows with the water behind us." },
  { title: "Cocktails", detail: "Cold drinks. Warm sand. Speeches can wait." },
  { title: "Dinner", detail: "A long table. Stay through dessert." },
  { title: "Dancing", detail: "The good songs. Shoes are optional." },
];

const facts = [
  { label: "When", value: WEDDING_DATE_LABEL },
  { label: "Where", value: "Gulf Coast" },
  { label: "Reply by", value: RSVP_BY_LABEL },
];

function partsUntil(now: number) {
  const diff = Math.max(0, WEDDING_AT.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

export function WeddingPage() {
  const [now, setNow] = useState<number | null>(null);
  const [book, setBook] = useState<Reply[]>([]);
  const [mine, setMine] = useState<Reply | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const token = takeReplyToken();
    let next = loadBook();
    let filed: string | null = null;
    if (token) {
      const reply = decodeReply(token);
      if (reply) {
        next = upsertReply(reply);
        filed = `${reply.name} is filed in the book on this phone.`;
      } else {
        filed = "That link didn’t include a reply we could read.";
      }
    }
    const mineId = localStorage.getItem(MINE_KEY);
    setBook(next);
    setMine(mineId ? (next.find((reply) => reply.id === mineId) ?? null) : null);
    setNotice(filed);
    if (filed && token) {
      window.setTimeout(() => {
        document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, []);

  function save(reply: Reply) {
    const next = upsertReply(reply);
    localStorage.setItem(MINE_KEY, reply.id);
    setBook(next);
    setMine(reply);
  }

  function remove(id: string) {
    const next = removeReply(id);
    if (localStorage.getItem(MINE_KEY) === id) localStorage.removeItem(MINE_KEY);
    setBook(next);
    setMine((current) => (current?.id === id ? null : current));
  }

  const countdown = now === null ? null : partsUntil(now);
  const host = couple.second ? `${couple.first} & ${couple.second}` : couple.first;

  return (
    <div id="top" className="min-h-svh bg-sand text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-sand">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
          <a href="#top" className="font-display text-xl tracking-tight" aria-label="Back to the top">
            {monogram()}
          </a>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Page">
            <a className="text-sm text-mist transition-colors duration-150 hover:text-ink" href="#day">
              Invitation
            </a>
            <a className="text-sm text-mist transition-colors duration-150 hover:text-ink" href="#plan">
              The day
            </a>
            <a className="text-sm text-mist transition-colors duration-150 hover:text-ink" href="#coast">
              The coast
            </a>
            <a className="text-sm text-mist transition-colors duration-150 hover:text-ink" href="#registry">
              Registry
            </a>
            <a className="text-sm text-mist transition-colors duration-150 hover:text-ink" href="#gallery">
              Gallery
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <AccountSlot />
            <a
              href="#rsvp"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-tide px-5 text-sm text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96]"
            >
              Reply
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="grid lg:grid-cols-2">
          <div className="relative aspect-square bg-ink sm:aspect-video lg:aspect-auto lg:min-h-[40rem]">
            <img
              src={photos.aisle}
              alt="Empty wooden chairs lined toward the Gulf at golden hour"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:order-first lg:px-14 lg:py-16">
            <p className="rise text-xs uppercase tracking-widest text-mist">You’re invited</p>
            <h1 className="rise rise-2 mt-4 font-display text-5xl leading-none text-ink sm:text-6xl">
              <span className="block">{couple.first}</span>
              <span className="mt-2 block">& {couple.second}</span>
            </h1>
            <p className="rise rise-3 mt-4 font-display text-3xl italic text-tide">are getting married</p>
            <p className="mt-6 font-display text-4xl leading-none text-ink">
              April 10
              <span className="ml-3 align-middle text-xl text-mist">2027</span>
            </p>
            <p className="mt-2 text-mist">Gulf Coast</p>
            <div className="mt-8 grid min-h-16 max-w-sm grid-cols-3 border-y border-line">
              {countdown ? (
                <>
                  <Count value={countdown.days} label="Days" />
                  <Count value={countdown.hours} label="Hours" />
                  <Count value={countdown.minutes} label="Minutes" />
                </>
              ) : (
                <p className="col-span-3 py-4 text-mist">{WEDDING_DATE_LABEL}</p>
              )}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#rsvp"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-tide px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96]"
              >
                Send your reply
              </a>
              <a
                href="#day"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                Read the invitation
              </a>
            </div>
          </div>
        </section>

        <dl className="border-y border-line">
          <div className="mx-auto grid max-w-5xl sm:grid-cols-3">
            {facts.map((fact, index) => (
              <div
                key={fact.label}
                className={index > 0 ? "border-t border-line px-5 py-6 sm:border-t-0 sm:border-l" : "px-5 py-6"}
              >
                <dt className="text-xs uppercase tracking-widest text-mist">{fact.label}</dt>
                <dd className="mt-2 font-display text-3xl text-ink">{fact.value}</dd>
              </div>
            ))}
          </div>
        </dl>

        <section id="day" className="scroll-mt-20 mx-auto max-w-xl px-5 py-16 sm:py-24">
          <h2 className="font-display text-4xl text-ink sm:text-5xl">The invitation</h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink">
            <p>
              You are invited to a wedding on the Gulf on Saturday, {WEDDING_DATE_LABEL}. There
              will be a ceremony near the water, a long dinner, and dancing after.
            </p>
            <p>
              The exact address travels with your invitation. Plan on the Pensacola coast: warm
              days, a light layer once the sun drops, and shoes you can walk in sand with.
            </p>
            <p>
              If you can come, tell us below. If you can’t, tell us that too. We want the table
              set for the people who will actually be in the chairs.
            </p>
          </div>
          <p className="mt-8 font-display text-3xl italic text-tide">{host}</p>
        </section>

        <section id="plan" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">The day</h2>
            <p className="mt-4 text-mist">The order of the day. Hours are not set yet.</p>
            <ol className="mt-8">
              {schedule.map((item) => (
                <li key={item.title} className="border-t border-line py-6">
                  <h3 className="font-display text-3xl text-ink">{item.title}</h3>
                  <p className="mt-1 text-mist">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-label="Photographs" className="grid grid-cols-2 gap-1 bg-sand">
          <figure className="col-span-2 bg-ink">
            <img
              src={photos.lights}
              alt="A long empty dinner table under string lights at dusk, facing the water"
              className="aspect-video w-full object-cover"
            />
          </figure>
          <figure className="bg-ink">
            <img
              src={photos.bouquet}
              alt="A loose white bouquet with olive leaves on driftwood"
              className="aspect-square w-full object-cover"
            />
          </figure>
          <figure className="bg-ink">
            <img
              src={photos.table}
              alt="A linen place setting with an olive sprig and a small glass candle"
              className="aspect-square w-full object-cover"
            />
          </figure>
        </section>

        <section id="coast" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 sm:py-24 md:grid-cols-3">
            <div>
              <h2 className="font-display text-4xl text-ink">The coast</h2>
              <p className="mt-4 text-mist">
                Fly into Pensacola International, PNS. The beach is a short drive from the airport.
              </p>
            </div>
            <div>
              <h3 className="font-display text-2xl text-ink">What to wear</h3>
              <p className="mt-3 text-mist">
                Coastal cocktail. Breathable fabric, a soft color, a jacket if you run cold. If we
                are standing in sand, leave the spindly heels at the hotel.
              </p>
            </div>
            <div>
              <h3 className="font-display text-2xl text-ink">Children</h3>
              <p className="mt-3 text-mist">
                They are welcome. Put their names on your reply so a chair, and maybe a smaller
                plate, is waiting.
              </p>
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-5 pb-16 sm:pb-24">
            <h3 className="font-display text-2xl text-ink">If you make a weekend of it</h3>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <p>
                <span className="block text-xs uppercase tracking-widest text-mist">Friday</span>
                <span className="mt-2 block text-ink">
                  Downtown Pensacola. Palafox if you want a long dinner the night before.
                </span>
              </p>
              <p>
                <span className="block text-xs uppercase tracking-widest text-mist">Saturday</span>
                <span className="mt-2 block text-ink">The wedding. Hours still to come. Stay late.</span>
              </p>
              <p>
                <span className="block text-xs uppercase tracking-widest text-mist">Sunday</span>
                <span className="mt-2 block text-ink">
                  Coffee and a walk on the beach, if you are not flying out at dawn.
                </span>
              </p>
            </div>
          </div>
        </section>

        <section id="registry" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">Registry</h2>
            <p className="mt-4 text-mist">
              The gift is that you come. If you want to send something, these are the links we have picked.
            </p>
            <div className="mt-8">
              <RegistryPanel />
            </div>
          </div>
        </section>

        <section id="rsvp" className="scroll-mt-20 border-t border-line bg-foam">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">Your reply</h2>
            <p className="mt-4 text-mist">
              Sign in with Google, then answer by {RSVP_BY_LABEL}. One reply covers your whole party.
            </p>
            <div className="mt-8">
              <ReplyAccess mine={mine} onSave={save} />
            </div>
            <p className="mt-6 text-sm text-mist">
              A card is plenty. The registry is above, if you would rather send a gift.
            </p>
          </div>
        </section>

        <section id="gallery" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">Gallery</h2>
            <p className="mt-4 text-mist">
              Pictures from the day. Anyone can look. Sign in only if you want to add one.
            </p>
            <div className="mt-8">
              <GalleryPanel />
            </div>
          </div>
        </section>

        <section id="book" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">The book</h2>
            <p className="mt-4 text-mist">
              Replies kept on this phone. Open a filing link here and it adds itself.
            </p>
            <div className="mt-8">
              <ReplyBook book={book} notice={notice} onRemove={remove} />
            </div>
          </div>
        </section>

        <section id="questions" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
            <h2 className="font-display text-4xl text-ink sm:text-5xl">Questions</h2>
            <div className="mt-8 border-t border-line">
              <Faq q="Where exactly?" a="On the Gulf, around Pensacola. The street address goes out with the invitation and will be added here once it is final." />
              <Faq q="What time should we arrive?" a="The hours are not set yet. They will be added here, and in a note, once we know them. Plan on the day itself." />
              <Faq q="Can I bring someone?" a="The reply is for the household on your invitation. Add every name in your party so we set enough places." />
              <Faq q="What will we eat?" a="Gulf fish, herb chicken, or a garden plate. Tell us which, and mention allergies in the note." />
              <Faq q="Is there a room block?" a="Not yet. Stay near Pensacola Beach if you can. We will post a block here if we reserve one." />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-2xl italic text-tide">{host}</p>
          <p className="text-sm text-mist">{WEDDING_DATE_LABEL} · Gulf Coast</p>
        </div>
      </footer>
    </div>
  );
}

function AccountSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-11 animate-pulse rounded-full bg-line" aria-hidden />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center px-2 text-sm text-ink underline-offset-4 hover:underline"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="max-w-[9.5rem] overflow-hidden sm:max-w-none [&_.font-medium]:truncate">
      <UserButton />
    </div>
  );
}

function ReplyAccess({ mine, onSave }: { mine: Reply | null; onSave: (reply: Reply) => void }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-48 animate-pulse border border-line bg-paper" />;
  }
  if (!user) {
    return (
      <div className="border border-line bg-paper px-5 py-8 sm:px-8">
        <h3 className="font-display text-3xl text-ink">Sign in to reply</h3>
        <p className="mt-3 text-mist">
          Google confirms it’s you. Your name goes on the card. We never see your password.
        </p>
        <div className="mt-6">
          <GoogleSignIn callbackURL="/#rsvp" />
        </div>
      </div>
    );
  }
  return <ReplyForUser mine={mine} onSave={onSave} />;
}

function ReplyForUser({ mine, onSave }: { mine: Reply | null; onSave: (reply: Reply) => void }) {
  const user = useCurrentUser();
  return <RsvpForm initial={mine} onSave={onSave} suggestedName={user?.displayName} />;
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="py-4">
      <p className="font-display text-3xl tabular-nums text-ink">{value}</p>
      <p className="text-xs uppercase tracking-widest text-mist">{label}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex list-none items-center justify-between gap-4 py-4 font-display text-2xl text-ink">
        {q}
        <span className="text-mist transition-transform duration-200 group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <p className="pb-5 text-mist">{a}</p>
    </details>
  );
}
