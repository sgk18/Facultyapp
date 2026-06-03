-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.departments (
  id uuid NOT NULL,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  supabase_user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'FACULTY'::role_type,
  department_id uuid NOT NULL,
  avatar_url text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL,
  employee_code text,
  is_suspended boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.deadlines (
  id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  due_date timestamp without time zone NOT NULL,
  owner_id uuid NOT NULL,
  department_id uuid NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL,
  priority USER-DEFINED NOT NULL DEFAULT 'MEDIUM'::"Priority",
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  visibility USER-DEFINED NOT NULL DEFAULT 'PRIVATE'::"Visibility",
  CONSTRAINT deadlines_pkey PRIMARY KEY (id),
  CONSTRAINT deadlines_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT deadlines_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'DEADLINE'::character varying,
  is_read boolean NOT NULL DEFAULT false,
  related_deadline_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_related_deadline_id_fkey FOREIGN KEY (related_deadline_id) REFERENCES public.deadlines(id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  fcm_token text NOT NULL UNIQUE,
  platform text NOT NULL,
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.google_accounts (
  id uuid NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  google_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  sync_gmail boolean NOT NULL DEFAULT false,
  sync_calendar boolean NOT NULL DEFAULT false,
  connected_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL,
  CONSTRAINT google_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT google_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.calendar_events (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  google_event_id text UNIQUE,
  title text NOT NULL,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  source text NOT NULL DEFAULT 'APP'::text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'GENERAL'::text,
  deadline_id uuid,
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT calendar_events_deadline_id_fkey FOREIGN KEY (deadline_id) REFERENCES public.deadlines(id)
);
CREATE TABLE public.reminders (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  reminder_time timestamp without time zone NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL,
  repeat_type text NOT NULL DEFAULT 'NONE'::text,
  deadline_id uuid,
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reminders_deadline_id_fkey FOREIGN KEY (deadline_id) REFERENCES public.deadlines(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user text,
  timestamp timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);