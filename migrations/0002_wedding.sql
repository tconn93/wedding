-- Shared wedding records. Signed-in guests can read the registry and the
-- gallery. Each row is stamped with the verified user who added it.

create table if not exists registry_items (
  id text primary key,
  user_id text not null,
  title text not null,
  url text not null,
  shop text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists registry_items_created_idx on registry_items (created_at);

create table if not exists gallery_photos (
  id text primary key,
  user_id text not null,
  guest_name text not null,
  caption text not null,
  file_name text not null,
  content_type text not null,
  byte_size integer not null,
  image_data text not null,
  created_at timestamptz not null default now()
);

create index if not exists gallery_photos_created_idx on gallery_photos (created_at desc);
create index if not exists gallery_photos_user_idx on gallery_photos (user_id);
