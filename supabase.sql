create table if not exists public.members (
 id text primary key, name text not null, email text not null unique,
 year integer not null check (year >= 1970), level text not null, city text not null,
 profession text not null default '', bio text not null default '', interests text not null default '[]',
 photo text, visible integer not null default 0 check(visible in (0,1)),
 token_hash text not null, created text not null
);
alter table public.members enable row level security;
-- No client policies. Access is through server-side service-role API only.
revoke all on public.members from anon, authenticated;
grant all on public.members to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('alumni-photos','alumni-photos',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create table if not exists public.payments (
 id text primary key, purpose text not null check(purpose in ('membership','donation')),
 membership_key text unique, member_id text, name text not null, email text not null,
 amount integer not null, currency text not null, mode text not null,
 named integer not null default 0, show_amount integer not null default 0,
 status text not null default 'pending', order_id text unique, payment_id text,
 lease_until bigint, created text not null, paid_at text
);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant all on public.payments to service_role;
create or replace function public.record_alumni_payment(transaction_id text,new_status text,provider_payment_id text)
returns void language sql security invoker set search_path=public as $$
 update public.payments set status=new_status,payment_id=provider_payment_id,
 paid_at=case when new_status='paid' then coalesce(paid_at,to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) else paid_at end
 where id=transaction_id and status<>'refunded' and (status<>'paid' or new_status='refunded');
$$;
revoke all on function public.record_alumni_payment(text,text,text) from public,anon,authenticated;
grant execute on function public.record_alumni_payment(text,text,text) to service_role;

-- Registration fields mirrored from the alumni Google Form; safe for existing records.
alter table public.members add column if not exists phone text;
alter table public.members add column if not exists country text;
alter table public.members add column if not exists participation text default '[]';
alter table public.members add column if not exists enrollment text default 'alumni';

alter table public.members add column if not exists verification text default 'pending';
alter table public.members add column if not exists verification_note text default '';
alter table public.members add column if not exists reviewed_by text;
alter table public.members add column if not exists reviewed_at text;
create table if not exists public.community_content (
 id text primary key,kind text not null,title text not null,summary text not null,details text not null,
 image text,year integer,phase text not null default '',status text not null default 'pending',owner_id text,created text not null,updated text not null
);
create table if not exists public.messages (
 id text primary key,name text not null,email text not null,subject text not null,message text not null,status text not null default 'new',created text not null
);
alter table public.community_content enable row level security;
alter table public.messages enable row level security;
revoke all on public.community_content,public.messages from anon,authenticated;
grant all on public.community_content,public.messages to service_role;

alter table public.members add column if not exists email_verified_at text;
create table if not exists public.email_challenges (
 id text primary key,email text not null,session_hash text not null,ip_hash text not null,code_hash text not null,
 expires_at bigint not null,attempts integer not null default 0,sent_at bigint not null,verified_at bigint,consumed_at bigint
);
alter table public.email_challenges enable row level security;
revoke all on public.email_challenges from anon,authenticated;
grant all on public.email_challenges to service_role;
create or replace function public.reserve_alumni_email_challenge(challenge jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare now_ms bigint := (challenge->>'sent_at')::bigint; email_val text := challenge->>'email'; ip_val text := challenge->>'ip_hash';
begin
 perform pg_advisory_xact_lock(hashtext('alumni-otp-ip:'||ip_val));
 perform pg_advisory_xact_lock(hashtext('alumni-otp-email:'||email_val));
 delete from public.email_challenges where sent_at<now_ms-86400000;
 if (select count(*) from public.email_challenges where email=email_val and sent_at>now_ms-3600000)>=3 or
    (select count(*) from public.email_challenges where ip_hash=ip_val and sent_at>now_ms-3600000)>=10 or
    exists(select 1 from public.email_challenges where email=email_val and sent_at>now_ms-60000) then return false; end if;
 insert into public.email_challenges(id,email,session_hash,ip_hash,code_hash,expires_at,sent_at)
 values(challenge->>'id',email_val,challenge->>'session_hash',ip_val,challenge->>'code_hash',(challenge->>'expires_at')::bigint,now_ms);
 update public.email_challenges set expires_at=now_ms where email=email_val and session_hash=challenge->>'session_hash' and id<>challenge->>'id';
 return true;
end $$;
create or replace function public.attempt_alumni_email_challenge(challenge_id text,email_value text,session_value text,now_value bigint)
returns setof public.email_challenges language sql security invoker set search_path=public as $$
 update public.email_challenges set attempts=attempts+1 where id=challenge_id and email=email_value and session_hash=session_value and attempts<5 and expires_at>now_value and consumed_at is null and verified_at is null returning *;
$$;
create or replace function public.mark_alumni_email_verified(challenge_id text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
begin update public.email_challenges set verified_at=now_value where id=challenge_id and consumed_at is null and expires_at>now_value;return found;end $$;
create or replace function public.invalidate_alumni_email_challenge(challenge_id text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
begin update public.email_challenges set consumed_at=now_value where id=challenge_id;return found;end $$;
create or replace function public.register_alumni_verified_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>payload->>'email' or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 insert into public.members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at)
 values(payload->>'id',payload->>'name',payload->>'email',(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',payload->>'phone',payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.attach_alumni_verified_email(member_id text,email_value text,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>email_value or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 update public.members set email_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where id=member_id and email=email_value;
 if not found then return false;end if;
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
revoke all on function public.reserve_alumni_email_challenge(jsonb),public.attempt_alumni_email_challenge(text,text,text,bigint),public.mark_alumni_email_verified(text,bigint),public.invalidate_alumni_email_challenge(text,bigint),public.register_alumni_verified_member(jsonb,text,text,bigint),public.attach_alumni_verified_email(text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_alumni_email_challenge(jsonb),public.attempt_alumni_email_challenge(text,text,text,bigint),public.mark_alumni_email_verified(text,bigint),public.invalidate_alumni_email_challenge(text,bigint),public.register_alumni_verified_member(jsonb,text,text,bigint),public.attach_alumni_verified_email(text,text,text,text,bigint) to service_role;
create or replace function public.has_alumni_email_proof(challenge_id text,email_value text,session_value text,now_value bigint) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from public.email_challenges where id=challenge_id and email=email_value and session_hash=session_value and verified_at is not null and consumed_at is null and expires_at>now_value);
$$;
revoke all on function public.has_alumni_email_proof(text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.has_alumni_email_proof(text,text,text,bigint) to service_role;
create or replace function public.alumni_email_exists(email_value text) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from public.members where lower(trim(email))=lower(trim(email_value)));
$$;
revoke all on function public.alumni_email_exists(text) from public,anon,authenticated;
grant execute on function public.alumni_email_exists(text) to service_role;

-- Community accounts and bookable opportunities (10 November 2026).
alter table public.members add column if not exists token_expires_at bigint;
alter table public.community_content add column if not exists role text not null default '';
alter table public.community_content add column if not exists contact_url text not null default '';
create table if not exists public.activities(id text primary key,kind text not null,title text not null,summary text not null,details text not null,starts_at text not null,ends_at text not null,timezone text not null,location text not null,capacity integer not null,status text not null default 'draft',created text not null,updated text not null);
create table if not exists public.activity_signups(id text primary key,activity_id text not null,member_id text not null,status text not null,created text not null,updated text not null,unique(activity_id,member_id));
create table if not exists public.site_settings(key text primary key,value text not null);
create table if not exists public.member_reviews(id text primary key,member_id text not null,status text not null,method text not null,note text not null,actor text not null,created text not null);
alter table public.activities enable row level security;
alter table public.activity_signups enable row level security;
alter table public.site_settings enable row level security;
alter table public.member_reviews enable row level security;
revoke all on public.activities,public.activity_signups,public.site_settings,public.member_reviews from anon,authenticated;
grant all on public.activities,public.activity_signups,public.site_settings,public.member_reviews to service_role;

create or replace function public.signin_alumni_member(email_value text,challenge_id text,session_value text,token_value text,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare c email_challenges%rowtype; n integer;
begin
 select * into c from email_challenges where id=challenge_id for update;
 if c.id is null or c.email!=email_value or c.session_hash!=session_value or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false; end if;
 update members set token_hash=token_value,token_expires_at=now_value+2592000000,email_verified_at=coalesce(email_verified_at,to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) where email=email_value;
 get diagnostics n=row_count;
 if n=0 then return false; end if;
 update email_challenges set consumed_at=now_value where id=challenge_id;
 return true;
end $$;
create or replace function public.logout_alumni_member(token_value text) returns void language sql security definer set search_path=public as $$update members set token_hash=gen_random_uuid()::text,token_expires_at=0 where token_hash=token_value;$$;
create or replace function public.edit_alumni_member(token_value text,payload jsonb,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 update members set verification=case when name!=payload->>'name' or year!=(payload->>'year')::integer or level!=payload->>'level' or (enrollment!='alumni' and payload->>'enrollment'='alumni') then 'pending' else verification end,
 name=payload->>'name',year=(payload->>'year')::integer,level=payload->>'level',phone=payload->>'phone',city=payload->>'city',country=payload->>'country',profession=payload->>'profession',bio=payload->>'bio',interests=payload->>'interests',participation=payload->>'participation',enrollment=payload->>'enrollment',visible=(payload->>'visible')::integer,verification_note=payload->>'verificationNote' where token_hash=token_value and (token_expires_at is null or token_expires_at>now_value);
 get diagnostics n=row_count;return n=1;
end $$;
create or replace function public.list_alumni_activities(include_drafts boolean) returns jsonb language sql security definer set search_path=public as $$select coalesce(jsonb_agg(row_to_json(a)::jsonb || jsonb_build_object('booked',(select count(*) from activity_signups s where s.activity_id=a.id and s.status='confirmed')) order by a.starts_at),'[]'::jsonb) from activities a where include_drafts or a.status='published';$$;
create or replace function public.save_alumni_activity(payload jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtext('alumni_activity:'||(payload->>'id'))::bigint);
 perform id from activities where id=payload->>'id' for update;
 select count(*) into n from activity_signups where activity_id=payload->>'id' and status='confirmed';
 if n>(payload->>'capacity')::integer then return false;end if;
 insert into activities(id,kind,title,summary,details,starts_at,ends_at,timezone,location,capacity,status,created,updated) values(payload->>'id',payload->>'kind',payload->>'title',payload->>'summary',payload->>'details',payload->>'starts_at',payload->>'ends_at',payload->>'timezone',payload->>'location',(payload->>'capacity')::integer,payload->>'status',payload->>'created',payload->>'updated') on conflict(id) do update set kind=excluded.kind,title=excluded.title,summary=excluded.summary,details=excluded.details,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,location=excluded.location,capacity=excluded.capacity,status=excluded.status,updated=excluded.updated;
 return true;
end $$;
create or replace function public.book_alumni_activity(activity_value text,member_value text,now_value text) returns boolean language plpgsql security definer set search_path=public as $$
declare a activities%rowtype; n integer;
begin
 perform pg_advisory_xact_lock(hashtext('alumni_activity:'||activity_value)::bigint);
 select * into a from activities where id=activity_value for update;
 if a.id is null or a.status!='published' or a.starts_at<=now_value then return false;end if;
 perform id from members where id=member_value and verification='approved' and email_verified_at is not null and enrollment='alumni' for share;
 if not found then return false;end if;
 if exists(select 1 from activity_signups where activity_id=activity_value and member_id=member_value and status='confirmed') then return true;end if;
 select count(*) into n from activity_signups where activity_id=activity_value and status='confirmed';if n>=a.capacity then return false;end if;
 insert into activity_signups(id,activity_id,member_id,status,created,updated) values(gen_random_uuid()::text,activity_value,member_value,'confirmed',now_value,now_value) on conflict(activity_id,member_id) do update set status='confirmed',updated=excluded.updated;
 return true;
end $$;
create or replace function public.cancel_alumni_booking(booking_value text,member_value text) returns boolean language plpgsql security definer set search_path=public as $$declare n integer;begin update activity_signups set status='cancelled',updated=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where id=booking_value and member_id=member_value;get diagnostics n=row_count;return n=1;end $$;
create or replace function public.list_alumni_bookings(member_value text) returns jsonb language sql security definer set search_path=public as $$select coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) from (select s.*,a.title,a.kind,a.starts_at,a.ends_at,a.timezone,a.location,a.status as activity_status,case when member_value is null then m.name else null end as name,case when member_value is null then m.email else null end as email from activity_signups s join activities a on a.id=s.activity_id join members m on m.id=s.member_id where member_value is null or s.member_id=member_value order by a.starts_at desc limit 500) x;$$;
create or replace function public.review_alumni_member(member_value text,status_value text,method_value text,note_value text,actor_value text) returns void language plpgsql security definer set search_path=public as $$declare stamp text;begin stamp=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');update members set verification=status_value,reviewed_by=actor_value,reviewed_at=stamp where id=member_value;insert into member_reviews values(gen_random_uuid()::text,member_value,status_value,method_value,note_value,actor_value,stamp);end $$;
create or replace function public.remove_alumni_account(token_value text) returns boolean language plpgsql security definer set search_path=public as $$declare m members%rowtype;begin select * into m from members where token_hash=token_value for update;if m.id is null then return false;end if;delete from activity_signups where member_id=m.id;delete from member_reviews where member_id=m.id;delete from members where id=m.id;return true;end $$;
revoke all on function public.signin_alumni_member(text,text,text,text,bigint),public.logout_alumni_member(text),public.edit_alumni_member(text,jsonb,bigint),public.list_alumni_activities(boolean),public.save_alumni_activity(jsonb),public.book_alumni_activity(text,text,text),public.cancel_alumni_booking(text,text),public.list_alumni_bookings(text),public.review_alumni_member(text,text,text,text,text),public.remove_alumni_account(text) from public,anon,authenticated;
grant execute on function public.signin_alumni_member(text,text,text,text,bigint),public.logout_alumni_member(text),public.edit_alumni_member(text,jsonb,bigint),public.list_alumni_activities(boolean),public.save_alumni_activity(jsonb),public.book_alumni_activity(text,text,text),public.cancel_alumni_booking(text,text),public.list_alumni_bookings(text),public.review_alumni_member(text,text,text,text,text),public.remove_alumni_account(text) to service_role;

-- Refresh registration insert after adding session expiry.
create or replace function public.register_alumni_verified_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>payload->>'email' or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 insert into public.members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at,token_expires_at)
 values(payload->>'id',payload->>'name',payload->>'email',(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',payload->>'phone',payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),now_value+2592000000);
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;

-- Administrator credentials, reports, finance, campaigns and isolated test registrations.
CREATE TABLE IF NOT EXISTS public."admin_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"detail" text NOT NULL,
	"created" text NOT NULL
);

CREATE TABLE IF NOT EXISTS public."admin_login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public."admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public."budget_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"year" bigint NOT NULL,
	"category" text NOT NULL,
	"amount" bigint NOT NULL,
	"updated" text NOT NULL,
	"actor" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "budget_year_category" ON public."budget_lines" ("year","category");
CREATE TABLE IF NOT EXISTS public."campaign_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"member_id" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"batch_id" text,
	"provider_id" text,
	"updated" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_member_unique" ON public."campaign_recipients" ("campaign_id","member_id");
CREATE TABLE IF NOT EXISTS public."email_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"year" bigint,
	"status" text DEFAULT 'draft' NOT NULL,
	"actor" text NOT NULL,
	"created" text NOT NULL,
	"lease_until" bigint
);

CREATE TABLE IF NOT EXISTS public."ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"kind" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" bigint NOT NULL,
	"actor" text NOT NULL,
	"created" text NOT NULL,
	"voided_at" text
);

ALTER TABLE public."email_challenges" ADD COLUMN IF NOT EXISTS "is_test" bigint DEFAULT 0 NOT NULL;
ALTER TABLE public."members" ADD COLUMN IF NOT EXISTS "archived_at" text;
ALTER TABLE public."members" ADD COLUMN IF NOT EXISTS "is_test" bigint DEFAULT 0 NOT NULL;
ALTER TABLE public."members" ADD COLUMN IF NOT EXISTS "email_updates_opt_in" bigint DEFAULT 0 NOT NULL;
ALTER TABLE public."payments" ADD COLUMN IF NOT EXISTS "refunded_amount" bigint DEFAULT 0 NOT NULL;
alter table public.admin_sessions enable row level security; revoke all on public.admin_sessions from anon,authenticated; grant all on public.admin_sessions to service_role;
alter table public.admin_login_attempts enable row level security; revoke all on public.admin_login_attempts from anon,authenticated; grant all on public.admin_login_attempts to service_role;
alter table public.admin_audit enable row level security; revoke all on public.admin_audit from anon,authenticated; grant all on public.admin_audit to service_role;
alter table public.budget_lines enable row level security; revoke all on public.budget_lines from anon,authenticated; grant all on public.budget_lines to service_role;
alter table public.ledger_entries enable row level security; revoke all on public.ledger_entries from anon,authenticated; grant all on public.ledger_entries to service_role;
alter table public.email_campaigns enable row level security; revoke all on public.email_campaigns from anon,authenticated; grant all on public.email_campaigns to service_role;
alter table public.campaign_recipients enable row level security; revoke all on public.campaign_recipients from anon,authenticated; grant all on public.campaign_recipients to service_role;

create or replace function public.reserve_alumni_email_challenge(challenge jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare now_ms bigint := (challenge->>'sent_at')::bigint; email_val text := challenge->>'email'; ip_val text := challenge->>'ip_hash';
begin
 perform pg_advisory_xact_lock(hashtext('alumni-otp-ip:'||ip_val));
 perform pg_advisory_xact_lock(hashtext('alumni-otp-email:'||email_val));
 delete from public.email_challenges where sent_at<now_ms-86400000;
 if (select count(*) from public.email_challenges where email=email_val and sent_at>now_ms-3600000)>=3 or
    (select count(*) from public.email_challenges where ip_hash=ip_val and sent_at>now_ms-3600000)>=10 or
    exists(select 1 from public.email_challenges where email=email_val and sent_at>now_ms-60000) then return false; end if;
 insert into public.email_challenges(id,email,session_hash,ip_hash,code_hash,expires_at,sent_at,is_test)
 values(challenge->>'id',email_val,challenge->>'session_hash',ip_val,challenge->>'code_hash',(challenge->>'expires_at')::bigint,now_ms,coalesce((challenge->>'is_test')::integer,0));
 update public.email_challenges set expires_at=now_ms where email=email_val and session_hash=challenge->>'session_hash' and id<>challenge->>'id';
 return true;
end $$;

create or replace function public.register_alumni_verified_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>payload->>'email' or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 insert into public.members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at,token_expires_at,is_test,email_updates_opt_in)
 values(payload->>'id',payload->>'name',payload->>'email',(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',payload->>'phone',payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),case when proof.is_test=1 then null else to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,now_value+2592000000,coalesce(proof.is_test,0),coalesce((payload->>'emailUpdates')::integer,0));
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;

create or replace function public.signin_alumni_member(email_value text,challenge_id text,session_value text,token_value text,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare c email_challenges%rowtype; n integer;
begin
 select * into c from email_challenges where id=challenge_id for update;
 if c.id is null or c.email!=email_value or c.session_hash!=session_value or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false; end if;
 update members set token_hash=token_value,token_expires_at=now_value+2592000000,email_verified_at=case when is_test=1 then null else coalesce(email_verified_at,to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end where archived_at is null and email=email_value;
 get diagnostics n=row_count;
 if n=0 then return false; end if;
 update email_challenges set consumed_at=now_value where id=challenge_id;
 return true;
end $$;

create or replace function public.edit_alumni_member(token_value text,payload jsonb,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 update members set verification=case when name!=payload->>'name' or year!=(payload->>'year')::integer or level!=payload->>'level' or (enrollment!='alumni' and payload->>'enrollment'='alumni') then 'pending' else verification end,
 name=payload->>'name',year=(payload->>'year')::integer,level=payload->>'level',phone=payload->>'phone',city=payload->>'city',country=payload->>'country',profession=payload->>'profession',bio=payload->>'bio',interests=payload->>'interests',participation=payload->>'participation',enrollment=payload->>'enrollment',visible=(payload->>'visible')::integer,verification_note=payload->>'verificationNote',email_updates_opt_in=coalesce((payload->>'emailUpdates')::integer,0) where archived_at is null and token_hash=token_value and (token_expires_at is null or token_expires_at>now_value);
 get diagnostics n=row_count;return n=1;
end $$;
create or replace function public.alumni_set_admin_password(record_value jsonb) returns void language plpgsql security invoker set search_path=public as $$begin insert into site_settings(key,value) values('admin_password',record_value::text) on conflict(key) do update set value=excluded.value;delete from admin_sessions;end $$;
create or replace function public.alumni_admin_login_attempt(bucket_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$begin perform pg_advisory_xact_lock(hashtext('admin_login:'||bucket_value));delete from admin_login_attempts where created_at<now_value-86400000;if (select count(*) from admin_login_attempts where bucket=bucket_value and created_at>now_value-900000)>=8 then return false;end if;insert into admin_login_attempts values(gen_random_uuid()::text,bucket_value,now_value);return true;end $$;
create or replace function public.alumni_archive_member(member_value text,restore_value boolean) returns boolean language plpgsql security invoker set search_path=public as $$begin update members set archived_at=case when restore_value then null else to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,visible=0,verification='pending',token_hash=gen_random_uuid()::text,token_expires_at=0 where id=member_value;return found;end $$;
create or replace function public.alumni_queue_campaign(campaign_value text) returns boolean language plpgsql security invoker set search_path=public as $$declare c email_campaigns%rowtype;begin select * into c from email_campaigns where id=campaign_value for update;if c.id is null or c.status!='draft' then return false;end if;insert into campaign_recipients(id,campaign_id,member_id,email,status,updated) select gen_random_uuid()::text,c.id,m.id,m.email,'pending',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from members m where (c.year is null or c.year=m.year) and m.archived_at is null and m.is_test=0 and m.email_updates_opt_in=1 and m.verification='approved' and m.email_verified_at is not null and m.enrollment='alumni' order by m.id limit 10000 on conflict(campaign_id,member_id) do nothing;update email_campaigns set status='queued' where id=campaign_value;return true;end $$;
create or replace function public.alumni_claim_campaign(campaign_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$begin update email_campaigns set lease_until=now_value+60000 where id=campaign_value and status='queued' and (lease_until is null or lease_until<now_value) and not exists(select 1 from campaign_recipients where campaign_id=campaign_value and status in ('processing','unknown'));return found;end $$;
create or replace function public.alumni_finish_campaign(campaign_value text) returns void language sql security invoker set search_path=public as $$update email_campaigns set lease_until=null,status=case when exists(select 1 from campaign_recipients where campaign_id=campaign_value and status in ('unknown','processing','failed')) then 'needs_attention' when exists(select 1 from campaign_recipients where campaign_id=campaign_value and status='pending') then 'queued' else 'completed' end where id=campaign_value;$$;
create or replace function public.alumni_cancel_campaign(campaign_value text,now_value bigint) returns void language plpgsql security invoker set search_path=public as $$begin update email_campaigns set status='cancelled' where id=campaign_value and (lease_until is null or lease_until<now_value);update campaign_recipients set status='cancelled' where campaign_id=campaign_value and status='pending' and exists(select 1 from email_campaigns where id=campaign_value and status='cancelled');end $$;
create or replace function public.record_alumni_payment(transaction_id text,new_status text,provider_payment_id text,refunded_value bigint) returns void language sql security invoker set search_path=public as $$update payments set status=new_status,payment_id=provider_payment_id,refunded_amount=greatest(refunded_amount,refunded_value),paid_at=case when new_status='paid' then coalesce(paid_at,to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) else paid_at end where id=transaction_id and (status!='refunded' or new_status='refunded') and (status!='paid' or new_status='refunded');$$;
revoke all on function public.alumni_set_admin_password(jsonb),public.alumni_admin_login_attempt(text,bigint),public.alumni_archive_member(text,boolean),public.alumni_queue_campaign(text),public.alumni_claim_campaign(text,bigint),public.alumni_finish_campaign(text),public.alumni_cancel_campaign(text,bigint),public.record_alumni_payment(text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.alumni_set_admin_password(jsonb),public.alumni_admin_login_attempt(text,bigint),public.alumni_archive_member(text,boolean),public.alumni_queue_campaign(text),public.alumni_claim_campaign(text,bigint),public.alumni_finish_campaign(text),public.alumni_cancel_campaign(text,bigint),public.record_alumni_payment(text,text,text,bigint) to service_role;

create or replace function public.remove_alumni_account(token_value text) returns boolean language plpgsql security definer set search_path=public as $$declare m members%rowtype;begin select * into m from members where token_hash=token_value for update;if m.id is null then return false;end if;update campaign_recipients set email='',status=case when status='pending' then 'skipped' else status end where member_id=m.id;delete from activity_signups where member_id=m.id;delete from member_reviews where member_id=m.id;delete from members where id=m.id;return true;end $$;
create or replace function public.list_alumni_admin_campaigns() returns jsonb language sql security invoker set search_path=public as $$select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('counts',(select coalesce(jsonb_object_agg(t.status,t.n),'{}'::jsonb) from (select status,count(*) n from campaign_recipients where campaign_id=c.id group by status)t)) order by c.created desc),'[]'::jsonb) from (select * from email_campaigns order by created desc limit 100)c;$$;
revoke all on function public.list_alumni_admin_campaigns() from public,anon,authenticated;
grant execute on function public.list_alumni_admin_campaigns() to service_role;

-- Welcome confirmations and Google identity support.
alter table public.members add column if not exists google_sub text;
create unique index if not exists members_google_sub_unique on public.members(google_sub);
create table if not exists public.google_sessions(state_hash text primary key,browser_hash text not null,ip_hash text not null,verifier text not null,nonce text not null,expires_at bigint not null,created_at bigint not null,consumed_at bigint);
create table if not exists public.welcome_emails(member_id text primary key,status text not null default 'pending',provider_id text,updated text not null);
alter table public.google_sessions enable row level security; revoke all on public.google_sessions from anon,authenticated; grant all on public.google_sessions to service_role;
alter table public.welcome_emails enable row level security; revoke all on public.welcome_emails from anon,authenticated; grant all on public.welcome_emails to service_role;
create or replace function public.reserve_alumni_google(session_value jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare stamp bigint:=(session_value->>'created_at')::bigint; ip text:=session_value->>'ip_hash';
begin
 perform pg_advisory_xact_lock(hashtext('google:'||ip)); delete from google_sessions where created_at<stamp-86400000;
 if (select count(*) from google_sessions where ip_hash=ip and created_at>stamp-3600000)>=20 then return false; end if;
 insert into google_sessions(state_hash,browser_hash,ip_hash,verifier,nonce,expires_at,created_at) values(session_value->>'state_hash',session_value->>'browser_hash',ip,session_value->>'verifier',session_value->>'nonce',(session_value->>'expires_at')::bigint,stamp);return true;
end $$;
create or replace function public.consume_alumni_google(state_value text,browser_value text,now_value bigint) returns setof public.google_sessions language sql security invoker set search_path=public as $$
 update google_sessions set consumed_at=now_value where state_hash=state_value and browser_hash=browser_value and consumed_at is null and expires_at>now_value returning *;
$$;
create or replace function public.signin_alumni_google(email_value text,sub_value text,hash_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;begin
 update members set google_sub=sub_value,token_hash=hash_value,token_expires_at=now_value+2592000000,email_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where archived_at is null and is_test=0 and email=email_value and (google_sub is null or google_sub=sub_value) and not exists(select 1 from members where google_sub=sub_value and email<>email_value);
 get diagnostics n=row_count;return n=1;end $$;
create or replace function public.claim_alumni_welcome(member_value text) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;begin update welcome_emails set status='sending',updated=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where member_id=member_value and status in ('pending','failed');get diagnostics n=row_count;return n=1;end $$;
create or replace function public.get_alumni_welcome_member(member_value text) returns table(id text,name text,email text,enrollment text,is_test integer,archived_at text,email_verified_at text) language sql security invoker set search_path=public as $$ select id,name,email,enrollment,is_test::integer,archived_at,email_verified_at from members where id=member_value; $$;
create or replace function public.finish_alumni_welcome(member_value text,status_value text,provider_value text) returns void language sql security invoker set search_path=public as $$ update welcome_emails set status=status_value,provider_id=provider_value,updated=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where member_id=member_value; $$;
create or replace function public.list_alumni_welcomes() returns table(member_id text,status text,updated text,name text,email text) language sql security invoker set search_path=public as $$ select w.member_id,w.status,w.updated,m.name,m.email from welcome_emails w left join members m on m.id=w.member_id order by w.updated desc limit 200; $$;
create or replace function public.pending_alumni_welcomes() returns table(member_id text) language sql security invoker set search_path=public as $$ select member_id from welcome_emails where status in ('pending','failed') order by updated limit 10; $$;

create or replace function public.register_alumni_verified_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>payload->>'email' or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 insert into public.members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at,token_expires_at,is_test,email_updates_opt_in)
 values(payload->>'id',payload->>'name',payload->>'email',(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',payload->>'phone',payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),case when proof.is_test=1 then null else to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,now_value+2592000000,coalesce(proof.is_test,0),coalesce((payload->>'emailUpdates')::integer,0));
 insert into public.welcome_emails(member_id,status,updated) select id,'pending',created from public.members where id=payload->>'id' and is_test=0 and email_verified_at is not null;
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;

create or replace function public.remove_alumni_account(token_value text) returns boolean language plpgsql security definer set search_path=public as $$declare m members%rowtype;begin select * into m from members where token_hash=token_value for update;if m.id is null then return false;end if;update campaign_recipients set email='',status=case when status='pending' then 'skipped' else status end where member_id=m.id;delete from welcome_emails where member_id=m.id;delete from activity_signups where member_id=m.id;delete from member_reviews where member_id=m.id;delete from members where id=m.id;return true;end $$;

create or replace function public.signin_alumni_member(email_value text,challenge_id text,session_value text,token_value text,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare c email_challenges%rowtype; n integer;
begin
 select * into c from email_challenges where id=challenge_id for update;
 if c.id is null or c.email!=email_value or c.session_hash!=session_value or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false; end if;
 update members set token_hash=token_value,token_expires_at=now_value+2592000000,email_verified_at=case when is_test=1 then null else coalesce(email_verified_at,to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end where archived_at is null and is_test=coalesce(c.is_test,0) and email=email_value;
 get diagnostics n=row_count;
 if n=0 then return false; end if;
 update email_challenges set consumed_at=now_value where id=challenge_id;
 return true;
end $$;

create or replace function public.attach_alumni_verified_email(member_id text,email_value text,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or coalesce(proof.is_test,0)<>0 or proof.email<>email_value or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 update public.members set email_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where is_test=0 and archived_at is null and id=member_id and email=email_value;
 if not found then return false;end if;
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
revoke all on function public.reserve_alumni_google(jsonb) from public,anon,authenticated;grant execute on function public.reserve_alumni_google(jsonb) to service_role;
revoke all on function public.consume_alumni_google(text,text,bigint) from public,anon,authenticated;grant execute on function public.consume_alumni_google(text,text,bigint) to service_role;
revoke all on function public.signin_alumni_google(text,text,text,bigint) from public,anon,authenticated;grant execute on function public.signin_alumni_google(text,text,text,bigint) to service_role;
revoke all on function public.claim_alumni_welcome(text) from public,anon,authenticated;grant execute on function public.claim_alumni_welcome(text) to service_role;
revoke all on function public.get_alumni_welcome_member(text) from public,anon,authenticated;grant execute on function public.get_alumni_welcome_member(text) to service_role;
revoke all on function public.finish_alumni_welcome(text,text,text) from public,anon,authenticated;grant execute on function public.finish_alumni_welcome(text,text,text) to service_role;
revoke all on function public.list_alumni_welcomes() from public,anon,authenticated;grant execute on function public.list_alumni_welcomes() to service_role;
revoke all on function public.pending_alumni_welcomes() from public,anon,authenticated;grant execute on function public.pending_alumni_welcomes() to service_role;

-- Extend existing deployed batch validation to 1970.
alter table public.members drop constraint if exists members_year_check;
alter table public.members add constraint members_year_check check(year>=1970);

-- Private communication preferences and explicit membership fee acknowledgement.
alter table public.members add column if not exists whatsapp_updates_opt_in integer not null default 0;
alter table public.members add column if not exists whatsapp_consent_at text;
alter table public.members add column if not exists fee_commitment_at text;
create or replace function public.register_alumni_verified_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare proof public.email_challenges%rowtype;
begin
 select * into proof from public.email_challenges where id=challenge_id for update;
 if not found or proof.email<>payload->>'email' or proof.session_hash<>session_value or proof.verified_at is null or proof.consumed_at is not null or proof.expires_at<=now_value then return false;end if;
 insert into public.members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at,token_expires_at,is_test,email_updates_opt_in,whatsapp_updates_opt_in,whatsapp_consent_at,fee_commitment_at)
 values(payload->>'id',payload->>'name',payload->>'email',(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',payload->>'phone',payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),case when proof.is_test=1 then null else to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,now_value+2592000000,coalesce(proof.is_test,0),coalesce((payload->>'emailUpdates')::integer,0),coalesce((payload->>'whatsappUpdates')::integer,0),payload->>'whatsappConsentAt',payload->>'feeCommitmentAt');
 insert into public.welcome_emails(member_id,status,updated) select id,'pending',created from public.members where id=payload->>'id' and is_test=0 and email_verified_at is not null;
 update public.email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.edit_alumni_member(token_value text,payload jsonb,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 update members set verification=case when name!=payload->>'name' or year!=(payload->>'year')::integer or level!=payload->>'level' or (enrollment!='alumni' and payload->>'enrollment'='alumni') then 'pending' else verification end,
 name=payload->>'name',year=(payload->>'year')::integer,level=payload->>'level',phone=payload->>'phone',city=payload->>'city',country=payload->>'country',profession=payload->>'profession',bio=payload->>'bio',interests=payload->>'interests',participation=payload->>'participation',enrollment=payload->>'enrollment',visible=(payload->>'visible')::integer,verification_note=payload->>'verificationNote',email_updates_opt_in=coalesce((payload->>'emailUpdates')::integer,0),whatsapp_updates_opt_in=coalesce((payload->>'whatsappUpdates')::integer,0),whatsapp_consent_at=payload->>'whatsappConsentAt' where archived_at is null and token_hash=token_value and (token_expires_at is null or token_expires_at>now_value);
 get diagnostics n=row_count;return n=1;
end $$;

-- Repeat test registrations may switch browser profiles; they never replace existing records.
create or replace function public.has_alumni_test_email_proof(challenge_id text,email_value text,session_value text,now_value bigint) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from email_challenges where is_test=1 and id=challenge_id and email=email_value and session_hash=session_value and verified_at is not null and consumed_at is null and expires_at>now_value);
$$;
revoke all on function public.has_alumni_test_email_proof(text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.has_alumni_test_email_proof(text,text,text,bigint) to service_role;
