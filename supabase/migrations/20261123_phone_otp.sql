begin;
alter table public.members alter column email drop not null;
alter table public.members add column if not exists phone_verified_at text;
create unique index if not exists members_verified_phone_unique on public.members(phone) where phone_verified_at is not null;
create table if not exists public.phone_challenges(
 id text primary key,phone text not null,purpose text not null check(purpose in ('registration','signin','attach')),
 session_hash text not null,ip_hash text not null,provider_sid text,expires_at bigint not null,sent_at bigint not null,
 attempts integer not null default 0,verified_at bigint,consumed_at bigint
);
alter table public.phone_challenges enable row level security;
revoke all on public.phone_challenges from public,anon,authenticated;
grant all on public.phone_challenges to service_role;
create index if not exists phone_challenge_sent on public.phone_challenges(sent_at);
create or replace function public.alumni_phone_auth_version() returns integer language sql security invoker set search_path=public as $$select 1$$;
create or replace function public.alumni_phone_exists(phone_value text) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from members where regexp_replace(coalesce(phone,''),'[\s()\-]','','g')=phone_value);
$$;
create or replace function public.reserve_alumni_phone_challenge(challenge jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare n bigint:=(challenge->>'sent_at')::bigint;p text:=challenge->>'phone';s text:=challenge->>'session_hash';ip text:=challenge->>'ip_hash';
begin
 perform pg_advisory_xact_lock(hashtext('alumni-sms-global'));
 if p is null or p!~'^\+[1-9][0-9]{6,14}$' or coalesce(s,'')='' or coalesce(ip,'')='' then return false;end if;
 delete from phone_challenges where sent_at<n-172800000;
 if exists(select 1 from phone_challenges where phone=p and sent_at>n-60000)
 or (select count(*) from phone_challenges where phone=p and sent_at>n-3600000)>=3
 or (select count(*) from phone_challenges where ip_hash=ip and sent_at>n-3600000)>=10
 or (select count(*) from phone_challenges where session_hash=s and sent_at>n-3600000)>=5
 or (select count(*) from phone_challenges where sent_at>n-86400000)>=100 then return false;end if;
 update phone_challenges set consumed_at=n where phone=p and session_hash=s and consumed_at is null;
 insert into phone_challenges(id,phone,purpose,session_hash,ip_hash,expires_at,sent_at)
 values(challenge->>'id',p,challenge->>'purpose',s,ip,n+600000,n);return true;
end $$;
create or replace function public.activate_alumni_phone_challenge(challenge_id text,sid_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$begin
 if sid_value!~'^VE[0-9a-fA-F]{32}$' then return false;end if;
 update phone_challenges set provider_sid=sid_value where id=challenge_id and provider_sid is null and consumed_at is null and expires_at>now_value;return found;
end $$;
create or replace function public.attempt_alumni_phone_challenge(challenge_id text,phone_value text,session_value text,purpose_value text,now_value bigint) returns setof public.phone_challenges language sql security invoker set search_path=public as $$
 update phone_challenges set attempts=attempts+1 where id=challenge_id and phone=phone_value and session_hash=session_value and purpose=purpose_value and provider_sid is not null and verified_at is null and consumed_at is null and attempts<5 and expires_at>now_value returning *;
$$;
create or replace function public.mark_alumni_phone_verified(challenge_id text,sid_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$begin
 update phone_challenges set verified_at=now_value where id=challenge_id and provider_sid=sid_value and verified_at is null and consumed_at is null and expires_at>now_value and attempts<=5;return found;
end $$;
create or replace function public.invalidate_alumni_phone_challenge(challenge_id text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$begin update phone_challenges set consumed_at=now_value where id=challenge_id;return found;end $$;
create or replace function public.has_alumni_phone_proof(challenge_id text,phone_value text,session_value text,purpose_value text,now_value bigint) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from phone_challenges where id=challenge_id and phone=phone_value and session_hash=session_value and purpose=purpose_value and verified_at is not null and consumed_at is null and expires_at>now_value);
$$;
create or replace function public.register_alumni_phone_member(payload jsonb,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare c phone_challenges%rowtype;
begin
 select * into c from phone_challenges where id=challenge_id for update;
 if not found or c.phone is distinct from payload->>'phone' or c.session_hash is distinct from session_value or c.purpose<>'registration' or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false;end if;
 perform pg_advisory_xact_lock(hashtext('alumni-phone-account:'||c.phone));
 if public.alumni_phone_exists(c.phone) then raise exception 'PHONE_EXISTS';end if;
 insert into members(id,name,email,year,level,city,profession,bio,interests,photo,visible,token_hash,created,phone,country,participation,enrollment,verification_note,email_verified_at,phone_verified_at,token_expires_at,is_test,email_updates_opt_in,whatsapp_updates_opt_in,whatsapp_consent_at,fee_commitment_at,verification)
 values(payload->>'id',payload->>'name',nullif(payload->>'email',''),(payload->>'year')::integer,payload->>'level',payload->>'city',payload->>'profession',payload->>'bio',payload->>'interests',payload->>'photo',(payload->>'visible')::integer,payload->>'tokenHash',payload->>'created',c.phone,payload->>'country',payload->>'participation',payload->>'enrollment',coalesce(payload->>'verificationNote',''),null,to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),now_value+2592000000,0,0,coalesce((payload->>'whatsappUpdates')::integer,0),payload->>'whatsappConsentAt',payload->>'feeCommitmentAt','pending');
 update phone_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.signin_alumni_phone_member(phone_value text,challenge_id text,session_value text,token_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare c phone_challenges%rowtype;n integer;
begin
 select * into c from phone_challenges where id=challenge_id for update;
 if not found or c.phone is distinct from phone_value or c.session_hash is distinct from session_value or c.purpose<>'signin' or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false;end if;
 update members set token_hash=token_value,token_expires_at=now_value+2592000000 where phone=phone_value and phone_verified_at is not null and archived_at is null and is_test=0;
 get diagnostics n=row_count;if n<>1 then return false;end if;
 update phone_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.attach_alumni_verified_phone(token_value text,phone_value text,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare c phone_challenges%rowtype;m members%rowtype;
begin
 select * into c from phone_challenges where id=challenge_id for update;
 if not found or c.phone is distinct from phone_value or c.session_hash is distinct from session_value or c.purpose<>'attach' or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false;end if;
 select * into m from members where token_hash=token_value and archived_at is null and is_test=0 and (token_expires_at is null or token_expires_at>now_value) for update;
 if not found then return false;end if;
 perform pg_advisory_xact_lock(hashtext('alumni-phone-account:'||phone_value));
 if exists(select 1 from members where id<>m.id and regexp_replace(coalesce(phone,''),'[\s()\-]','','g')=phone_value) then raise exception 'PHONE_EXISTS';end if;
 update members set phone=phone_value,phone_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where id=m.id;
 update phone_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.add_alumni_verified_email(token_value text,email_value text,challenge_id text,session_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare c email_challenges%rowtype;m members%rowtype;
begin
 select * into c from email_challenges where id=challenge_id for update;
 if not found or c.email is distinct from email_value or c.session_hash is distinct from session_value or c.is_test<>0 or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false;end if;
 select * into m from members where token_hash=token_value and archived_at is null and is_test=0 and (token_expires_at is null or token_expires_at>now_value) for update;
 if not found or (m.email is not null and m.email<>email_value) then return false;end if;
 update members set email=email_value,email_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where id=m.id;
 insert into welcome_emails(member_id,status,updated) values(m.id,'pending',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) on conflict(member_id) do nothing;
 update email_challenges set consumed_at=now_value where id=challenge_id;return true;
end $$;
create or replace function public.alumni_phone_change_guard() returns trigger language plpgsql security invoker set search_path=public as $$begin
 if new.phone is distinct from old.phone and new.phone_verified_at is not distinct from old.phone_verified_at then
  if old.phone_verified_at is not null and old.email_verified_at is null then raise exception 'Verify a new phone or email before changing the only verified contact';end if;
  new.phone_verified_at=null;
 end if;
 if new.email is distinct from old.email and new.email_verified_at is not distinct from old.email_verified_at then new.email_verified_at=null;end if;
 return new;
end $$;
drop trigger if exists alumni_phone_change on public.members;
create trigger alumni_phone_change before update of phone,email on public.members for each row execute function public.alumni_phone_change_guard();
revoke all on function public.alumni_phone_auth_version(),public.alumni_phone_exists(text),public.reserve_alumni_phone_challenge(jsonb),public.activate_alumni_phone_challenge(text,text,bigint),public.attempt_alumni_phone_challenge(text,text,text,text,bigint),public.mark_alumni_phone_verified(text,text,bigint),public.invalidate_alumni_phone_challenge(text,bigint),public.has_alumni_phone_proof(text,text,text,text,bigint),public.register_alumni_phone_member(jsonb,text,text,bigint),public.signin_alumni_phone_member(text,text,text,text,bigint),public.attach_alumni_verified_phone(text,text,text,text,bigint),public.add_alumni_verified_email(text,text,text,text,bigint),public.alumni_phone_change_guard() from public,anon,authenticated;
grant execute on function public.alumni_phone_auth_version(),public.alumni_phone_exists(text),public.reserve_alumni_phone_challenge(jsonb),public.activate_alumni_phone_challenge(text,text,bigint),public.attempt_alumni_phone_challenge(text,text,text,text,bigint),public.mark_alumni_phone_verified(text,text,bigint),public.invalidate_alumni_phone_challenge(text,bigint),public.has_alumni_phone_proof(text,text,text,text,bigint),public.register_alumni_phone_member(jsonb,text,text,bigint),public.signin_alumni_phone_member(text,text,text,text,bigint),public.attach_alumni_verified_phone(text,text,text,text,bigint),public.add_alumni_verified_email(text,text,text,text,bigint),public.alumni_phone_change_guard() to service_role;
create or replace function public.book_alumni_activity(activity_value text,member_value text,now_value text) returns boolean language plpgsql security definer set search_path=public as $$
declare a activities%rowtype; n integer;
begin
 perform pg_advisory_xact_lock(hashtext('alumni_activity:'||activity_value)::bigint);
 select * into a from activities where id=activity_value for update;
 if a.id is null or a.status!='published' or a.starts_at<=now_value then return false;end if;
 perform id from members where id=member_value and verification='approved' and (email_verified_at is not null or phone_verified_at is not null) and archived_at is null and is_test=0 and enrollment='alumni' for share;
 if not found then return false;end if;
 if exists(select 1 from activity_signups where activity_id=activity_value and member_id=member_value and status='confirmed') then return true;end if;
 select count(*) into n from activity_signups where activity_id=activity_value and status='confirmed';if n>=a.capacity then return false;end if;
 insert into activity_signups(id,activity_id,member_id,status,created,updated) values(gen_random_uuid()::text,activity_value,member_value,'confirmed',now_value,now_value) on conflict(activity_id,member_id) do update set status='confirmed',updated=excluded.updated;
 return true;
end $$;
-- An unverified email supplied during phone registration is not a login credential.
create or replace function public.signin_alumni_member(email_value text,challenge_id text,session_value text,token_value text,now_value bigint) returns boolean language plpgsql security definer set search_path=public as $$
declare c email_challenges%rowtype; n integer;
begin
 select * into c from email_challenges where id=challenge_id for update;
 if c.id is null or c.email is distinct from email_value or c.session_hash is distinct from session_value or c.verified_at is null or c.consumed_at is not null or c.expires_at<=now_value then return false; end if;
 update members set token_hash=token_value,token_expires_at=now_value+2592000000,email_verified_at=case when is_test=1 then null else coalesce(email_verified_at,to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end where archived_at is null and is_test=coalesce(c.is_test,0) and email=email_value and (phone_verified_at is null or email_verified_at is not null);
 get diagnostics n=row_count;
 if n=0 then return false; end if;
 update email_challenges set consumed_at=now_value where id=challenge_id;
 return true;
end $$;
create or replace function public.signin_alumni_google(email_value text,sub_value text,hash_value text,now_value bigint) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;begin
 update members set google_sub=sub_value,token_hash=hash_value,token_expires_at=now_value+2592000000,email_verified_at=to_char(to_timestamp(now_value/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') where archived_at is null and is_test=0 and email=email_value and (phone_verified_at is null or email_verified_at is not null) and (google_sub is null or google_sub=sub_value) and not exists(select 1 from members where google_sub=sub_value and email<>email_value);
 get diagnostics n=row_count;return n=1;end $$;
commit;
