-- ==========================================
-- Supabase Schema for Internship Tracker
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Applications Table
create table if not exists public.applications (
  id text primary key,
  "companyName" text not null,
  role text not null,
  "dateApplied" text not null,
  status text not null,
  notes text,
  "portalLink" text,
  "createdAt" bigint not null
);

-- Enable Row Level Security (RLS)
alter table public.applications enable row level security;

-- Allow read, insert, update, delete
drop policy if exists "Allow public access to applications" on public.applications;
create policy "Allow public access to applications" 
  on public.applications 
  for all 
  using (true) 
  with check (true);

-- 2. NeetCode 150 State Table
create table if not exists public.neetcode_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.neetcode_state enable row level security;

-- Allow read, insert, update, delete
drop policy if exists "Allow public access to neetcode_state" on public.neetcode_state;
create policy "Allow public access to neetcode_state" 
  on public.neetcode_state 
  for all 
  using (true) 
  with check (true);
