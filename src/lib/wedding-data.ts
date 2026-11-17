import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type RegistryItem = {
  id: string;
  title: string;
  url: string;
  shop: string;
  note: string;
  mine: boolean;
};

export type GalleryPhoto = {
  id: string;
  guestName: string;
  caption: string;
  fileName: string;
  byteSize: number;
  image: string;
  mine: boolean;
};

const MAX_PHOTOS = 80;
const MAX_PHOTO_BYTES = 750_000;

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function asBool(value: unknown) {
  return value === true || value === "t" || value === "true";
}

function cleanUrl(value: unknown) {
  const raw = clip(value, 400);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That link doesn’t look complete.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Use a normal web link.");
  }
  return url.toString();
}

function jpegBytes(image: string) {
  const prefix = "data:image/jpeg;base64,";
  if (!image.startsWith(prefix)) throw new Error("Send a JPEG photo.");
  const base64 = image.slice(prefix.length);
  if (base64.length < 32 || base64.length > 1_100_000) throw new Error("That photo is too large.");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("That photo could not be read.");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  if (bytes < 100 || bytes > MAX_PHOTO_BYTES) throw new Error("That photo is too large.");
  return bytes;
}

export const listRegistry = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      url: string;
      shop: string;
      note: string;
      mine: unknown;
    }>`
      select id, title, url, shop, note, (user_id = ${context.userId}) as mine
      from registry_items
      order by created_at asc
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      shop: row.shop,
      note: row.note,
      mine: asBool(row.mine),
    })) satisfies RegistryItem[];
  });

export const addRegistryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: string; url?: string; shop?: string; note?: string }) => {
    const title = clip(input?.title, 80);
    if (!title) throw new Error("Name the gift.");
    return {
      title,
      url: cleanUrl(input?.url),
      shop: clip(input?.shop, 40),
      note: clip(input?.note, 160),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into registry_items (id, user_id, title, url, shop, note)
      values (${id}, ${context.userId}, ${data.title}, ${data.url}, ${data.shop}, ${data.note})
    `;
    return { id, ...data, mine: true } satisfies RegistryItem;
  });

export const removeRegistryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    if (typeof id !== "string" || id.length < 8 || id.length > 80) throw new Error("Missing gift.");
    return id;
  })
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from registry_items
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    return { removed: rows.length > 0 };
  });

export const listGallery = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      guest_name: string;
      caption: string;
      file_name: string;
      byte_size: number;
      image_data: string;
      mine: unknown;
    }>`
      select id, guest_name, caption, file_name, byte_size, image_data,
             (user_id = ${context.userId}) as mine
      from gallery_photos
      order by created_at desc
      limit ${MAX_PHOTOS}
    `;
    return rows.map((row) => ({
      id: row.id,
      guestName: row.guest_name,
      caption: row.caption,
      fileName: row.file_name,
      byteSize: Number(row.byte_size),
      image: row.image_data,
      mine: asBool(row.mine),
    })) satisfies GalleryPhoto[];
  });

export const addGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { guestName?: string; caption?: string; fileName?: string; image?: string }) => {
    const guestName = clip(input?.guestName, 80);
    if (!guestName) throw new Error("Add your name.");
    const image = typeof input?.image === "string" ? input.image : "";
    const byteSize = jpegBytes(image);
    const fileName = clip(input?.fileName, 120).replace(/[^\w.\- ]+/g, "") || "photo.jpg";
    return {
      guestName,
      caption: clip(input?.caption, 160),
      fileName,
      image,
      byteSize,
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const counts = await sql<{ count: number }>`select count(*)::int as count from gallery_photos`;
    if (Number(counts[0]?.count ?? 0) >= MAX_PHOTOS) {
      throw new Error("The gallery is full.");
    }
    const id = crypto.randomUUID();
    await sql`
      insert into gallery_photos (
        id, user_id, guest_name, caption, file_name, content_type, byte_size, image_data
      ) values (
        ${id},
        ${context.userId},
        ${data.guestName},
        ${data.caption},
        ${data.fileName},
        ${"image/jpeg"},
        ${data.byteSize},
        ${data.image}
      )
    `;
    return {
      id,
      guestName: data.guestName,
      caption: data.caption,
      fileName: data.fileName,
      byteSize: data.byteSize,
      image: data.image,
      mine: true,
    } satisfies GalleryPhoto;
  });

export const removeGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    if (typeof id !== "string" || id.length < 8 || id.length > 80) throw new Error("Missing photo.");
    return id;
  })
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from gallery_photos
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    return { removed: rows.length > 0 };
  });
