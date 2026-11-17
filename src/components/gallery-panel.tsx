import { useEffect, useState, type FormEvent } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addGalleryPhoto,
  listGallery,
  removeGalleryPhoto,
  type GalleryPhoto,
} from "@/lib/wedding-data";

const fieldClass =
  "mt-2 w-full border-b border-line bg-transparent py-3 text-base text-ink outline-none focus:border-tide";

function problem(error: unknown) {
  if (error instanceof Error && error.message && error.message !== "Unauthorized") return error.message;
  return "That photo didn’t save. Try again.";
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function toJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser couldn’t read that photo.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let quality = 0.72;
  let image = canvas.toDataURL("image/jpeg", quality);
  while (image.length > 900_000 && quality > 0.45) {
    quality -= 0.1;
    image = canvas.toDataURL("image/jpeg", quality);
  }
  if (image.length > 1_000_000) throw new Error("That photo is still too large.");
  return image;
}

export function GalleryPanel() {
  const { user, isPending } = useCurrentUserState();
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [guestName, setGuestName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) setGuestName((current) => current || user.displayName || "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    listGallery()
      .then((next) => {
        if (!cancel) setPhotos(next);
      })
      .catch(() => {
        if (!cancel) setError("The gallery didn’t load.");
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  if (isPending) return <div className="h-40 animate-pulse border border-line bg-paper" />;

  if (!user) {
    return (
      <div className="border border-line bg-paper px-5 py-8 sm:px-8">
        <h3 className="font-display text-3xl text-ink">Sign in to add a photo</h3>
        <p className="mt-3 text-mist">
          Google keeps the album to people who were invited. Your name stays on the picture you add.
        </p>
        <div className="mt-6">
          <GoogleSignIn callbackURL="/#gallery" />
        </div>
      </div>
    );
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const image = await toJpeg(file);
      const photo = await addGalleryPhoto({
        data: { guestName, caption, fileName: file.name, image },
      });
      setPhotos((current) => [photo, ...(current ?? [])]);
      setCaption("");
      setFile(null);
    } catch (err) {
      setError(problem(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const result = await removeGalleryPhoto({ data: id });
      if (result.removed) setPhotos((current) => (current ?? []).filter((photo) => photo.id !== id));
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={(event) => void upload(event)} className="border border-line bg-paper px-5 py-8 sm:px-8" noValidate>
        <h3 className="font-display text-3xl text-ink">Add a photo</h3>
        <p className="mt-2 text-mist">We keep the picture, your name, the file name, and the size.</p>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">Your name</span>
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            className={fieldClass}
            maxLength={80}
            required
          />
        </label>
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-widest text-mist">Caption</span>
          <input value={caption} onChange={(event) => setCaption(event.target.value)} className={fieldClass} maxLength={160} />
        </label>
        <label className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-line px-6 text-ink transition-transform duration-150 ease-out active:scale-[0.96]">
          {file ? file.name : "Choose a photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {error && (
          <p role="alert" className="mt-4 text-sm text-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-tide px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink active:scale-[0.96] disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save to the gallery"}
        </button>
      </form>

      {photos === null ? (
        <div className="h-40 animate-pulse bg-line" />
      ) : photos.length === 0 ? (
        <p className="text-mist">No photos yet. After the wedding, this is where they go.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <li key={photo.id} className="bg-paper">
              <img
                src={photo.image.startsWith("data:image/jpeg;base64,") ? photo.image : ""}
                alt={photo.caption || `Photo from ${photo.guestName}`}
                className="aspect-square w-full object-cover"
              />
              <div className="px-3 py-3">
                <p className="font-display text-xl text-ink">{photo.guestName}</p>
                {photo.caption && <p className="mt-1 text-sm text-ink">{photo.caption}</p>}
                <p className="mt-2 text-xs text-mist">
                  {photo.fileName} · {sizeLabel(photo.byteSize)}
                </p>
                {photo.mine && (
                  <button
                    type="button"
                    className="mt-2 text-sm text-tide underline-offset-4 hover:underline"
                    onClick={() => void remove(photo.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
