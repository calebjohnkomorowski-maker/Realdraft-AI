-- RealDraft AI — Supabase Schema
-- Run this in your Supabase SQL editor

-- Agents (one row per real estate agent)
create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  license_number text,
  brokerage   text,
  email       text unique not null,
  phone       text,
  created_at  timestamptz default now()
);

-- Clients (buyers and sellers linked to an agent)
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text not null,          -- FK to agents.id (text for demo; swap to uuid FK in production)
  name        text not null,
  email       text,
  phone       text,
  role        text check (role in ('buyer','seller')) not null,
  created_at  timestamptz default now(),
  unique (agent_id, email)
);

-- Properties
create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  address         text not null,
  municipality    text,
  county          text,
  property_zip    text,
  school_district text,
  tax_id          text,
  created_at      timestamptz default now(),
  unique (address, property_zip)
);

-- Offers (core table — all ASR fields stored as JSON for flexibility)
create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text not null,
  property_id uuid references properties(id),
  buyer_id    uuid references clients(id),
  seller_id   uuid references clients(id),
  status      text default 'draft' check (status in ('draft','sent','pending_signature','executed','cancelled')),
  fields      jsonb not null default '{}',   -- all ASR field values
  envelope_id text,                           -- DocuSign/HelloSign envelope ID
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger offers_updated_at before update on offers
  for each row execute procedure update_updated_at();

-- Documents (PDFs linked to an offer)
create table if not exists documents (
  id               uuid primary key default gen_random_uuid(),
  offer_id         uuid references offers(id) on delete cascade,
  type             text not null,   -- 'offer', 'disclosure', 'lead_paint', etc.
  pdf_url          text,
  signature_status text default 'pending' check (signature_status in ('pending','sent','viewed','signed','executed')),
  created_at       timestamptz default now()
);

-- Call Scripts
create table if not exists call_scripts (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid references offers(id) on delete cascade,
  script_text text not null,
  created_at  timestamptz default now()
);

-- Storage bucket for PDFs (run separately in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', true);

-- Row Level Security (enable in production with Supabase Auth)
-- alter table agents enable row level security;
-- alter table clients enable row level security;
-- alter table offers enable row level security;
-- alter table documents enable row level security;
-- alter table call_scripts enable row level security;
