-- ───────────────────────────────────────────────────────────────────────────
-- Atomic "create calendar event + assign staff" RPC.
--
-- WHY: the app previously inserted the event and its staff assignments in two
-- separate round-trips. If the second failed, you got an event with no staff
-- (and the client swallowed the error, showing a false "success"). This wraps
-- both writes in ONE transaction (a function body is atomic) so it's all-or-
-- nothing, and any failure propagates to the client.
--
-- SECURITY INVOKER → runs as the caller, so the existing RLS on both tables
-- applies unchanged (created_by must equal current_staff_id(), etc.).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.create_calendar_event_with_staff(
  p_title       text,
  p_event_date  date,
  p_event_type  public.calendar_event_type,
  p_color       text,
  p_end_date    date    default null,
  p_start_time  time    default null,
  p_end_time    time    default null,
  p_project_id  text    default null,
  p_notes       text    default null,
  p_staff_ids   text[]  default '{}'
)
returns public.calendar_events
language plpgsql
security invoker
as $$
declare
  v_creator text := public.current_staff_id();
  v_id      text := 'CAL-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_event   public.calendar_events;
  v_sid     text;
begin
  if v_creator is null then
    raise exception 'Your login is not linked to a staff record; cannot create events.';
  end if;

  insert into public.calendar_events
    (id, title, event_date, end_date, start_time, end_time, event_type, color, project_id, staff_id, notes, created_by)
  values
    (v_id, p_title, p_event_date, p_end_date, p_start_time, p_end_time, p_event_type, p_color, p_project_id,
     -- keep staff_id populated with the first assignee for backward compatibility
     (case when array_length(p_staff_ids, 1) > 0 then p_staff_ids[1] else null end),
     p_notes, v_creator)
  returning * into v_event;

  if p_staff_ids is not null then
    foreach v_sid in array p_staff_ids loop
      insert into public.calendar_event_staff (event_id, staff_id)
      values (v_event.id, v_sid)
      on conflict (event_id, staff_id) do nothing;
    end loop;
  end if;

  return v_event;
end;
$$;

grant execute on function public.create_calendar_event_with_staff(
  text, date, public.calendar_event_type, text, date, time, time, text, text, text[]
) to authenticated;
