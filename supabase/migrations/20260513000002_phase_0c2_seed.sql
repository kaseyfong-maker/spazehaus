-- ============================================================================
-- SPAZEHAUS — Phase 0C.2 Seed
-- Generated: 2026-05-13
--
-- Seeds calendar_events + kpi_records with realistic demo data anchored to
-- the 2026 demo timeline. The Reminders / Performance / Calendar / KPI pages
-- all read from these once Phase 0C.2 is deployed.
-- ============================================================================

-- ─── CALENDAR EVENTS ────────────────────────────────────────────────────────
-- Mix of project site visits, client meetings, leave overlays, company events.
-- Dates span Feb 2026 (back-history) → Jul 2026 (live + upcoming).

insert into calendar_events (id, title, event_date, event_type, color, project_id, leave_id, staff_id, notes) values
  -- Feb 2026
  ('E001', 'Site Visit — Paragon Residence',         '2026-02-24', 'project', '#C9A96E', 'PRJ001', null,    null,    'Carpentry inspection · WL + LH'),
  ('E002', 'Client Meeting — Setia Indah',           '2026-02-25', 'meeting', '#5B7FA6', 'PRJ003', null,    null,    'Design Proposal walk-through · JL'),
  ('E003', 'Vinson — Annual Leave',                  '2026-02-24', 'leave',   '#C0614A', null,     'LV001', 'SH008', 'Family vacation (3 days)'),
  ('E004', 'Design Presentation — Eco Botanic',      '2026-02-26', 'meeting', '#5B7FA6', 'PRJ002', null,    null,    'Final review with TechVenture board'),
  ('E005', 'Material Sourcing — Austin Heights',     '2026-02-27', 'project', '#C9A96E', 'PRJ005', null,    null,    'Showroom tour with Ms. Tan'),
  ('E006', 'Team Lunch',                             '2026-03-07', 'event',   '#6B9E6B', null,     null,    null,    'Spazehaus Showroom · 12:30pm · mandatory'),

  -- Apr/May 2026 (around MOCK_TODAY = 2026-05-10)
  ('E007', 'Site Visit — Austin Heights',            '2026-05-08', 'project', '#C9A96E', 'PRJ005', null,    null,    'Wardrobe install kickoff'),
  ('E008', 'Site Visit — Paragon Residence',         '2026-05-12', 'project', '#C9A96E', 'PRJ001', null,    null,    'Plaster + cove lighting check'),
  ('E009', 'Client Handover — Paradigm Mall F&B',    '2026-05-09', 'meeting', '#5B7FA6', 'PRJ004', null,    null,    'Saveur Group · final walkthrough'),
  ('E010', 'Weekly Payment Review',                  '2026-05-15', 'event',   '#5B7FA6', null,     null,    'SH007', 'Reconcile collected vs outstanding · DN'),
  ('E011', 'Site Visit — Setia Indah',               '2026-05-20', 'project', '#C9A96E', 'PRJ003', null,    null,    'Marble flooring kickoff'),

  -- Jun/Jul 2026 (lookahead)
  ('E012', 'Client Meeting — Eco Botanic',           '2026-06-02', 'meeting', '#5B7FA6', 'PRJ002', null,    null,    'Aftercare follow-up'),
  ('E013', 'Team Quarterly Review',                  '2026-06-30', 'event',   '#6B9E6B', null,     null,    null,    'Q2 review · all staff · 2pm'),
  ('E014', 'Hong Li — Annual Leave',                 '2026-03-03', 'leave',   '#C0614A', null,     'LV003', 'SH005', 'Personal matters (3 days)'),
  ('E015', 'Chiou Ying — Replacement Leave',         '2026-02-28', 'leave',   '#C0614A', null,     'LV004', 'SH010', 'Weekend work replacement')
on conflict (id) do nothing;

-- ─── KPI RECORDS ────────────────────────────────────────────────────────────
-- 9 months × 3 staff (Grace, Wilson, Wai Hong) populated as a realistic demo.
-- The remaining 7 staff have a single Feb 2026 record matching their
-- staff.kpi_grade value (set in Phase 0A seed).
--
-- Score brackets: A = 81..100 · B = 61..80 · C = 0..60

-- ── Grace Tan (SH001) — Principal Designer, consistent A performer ──
insert into kpi_records (staff_id, year, month, part_a_score, part_b_score, part_c_score, rating, reviewer_id, notes) values
  ('SH001', 2026, 1, 28, 44, 17, 'A', 'SH001', 'Strong start to FY26'),
  ('SH001', 2026, 2, 29, 46, 18, 'A', 'SH001', 'CNY closure handled cleanly'),
  ('SH001', 2026, 3, 27, 42, 17, 'A', 'SH001', 'Paragon design review week'),
  ('SH001', 2026, 4, 28, 45, 18, 'A', 'SH001', 'Eco Botanic completion'),
  ('SH001', 2026, 5, 28, 44, 17, 'A', 'SH001', 'Current month — in progress')
on conflict (staff_id, year, month) do nothing;

-- ── Wilson Lee (SH002) — Senior Designer, A performer ──
insert into kpi_records (staff_id, year, month, part_a_score, part_b_score, part_c_score, rating, reviewer_id, notes) values
  ('SH002', 2026, 1, 27, 43, 16, 'A', 'SH001', null),
  ('SH002', 2026, 2, 28, 44, 16, 'A', 'SH001', null),
  ('SH002', 2026, 3, 26, 42, 16, 'A', 'SH001', null),
  ('SH002', 2026, 4, 27, 43, 17, 'A', 'SH001', 'Paragon site lead'),
  ('SH002', 2026, 5, 27, 43, 16, 'A', 'SH001', null)
on conflict (staff_id, year, month) do nothing;

-- ── Wai Hong (SH004) — PM, A performer with one B month ──
insert into kpi_records (staff_id, year, month, part_a_score, part_b_score, part_c_score, rating, reviewer_id, notes) values
  ('SH004', 2026, 1, 27, 42, 17, 'A', 'SH001', null),
  ('SH004', 2026, 2, 25, 38, 15, 'B', 'SH001', 'CNY scheduling overlap'),
  ('SH004', 2026, 3, 28, 44, 17, 'A', 'SH001', null),
  ('SH004', 2026, 4, 27, 43, 16, 'A', 'SH001', null),
  ('SH004', 2026, 5, 28, 44, 17, 'A', 'SH001', null)
on conflict (staff_id, year, month) do nothing;

-- ── Single-month Feb 2026 record for every other staff member ──
insert into kpi_records (staff_id, year, month, part_a_score, part_b_score, part_c_score, rating, reviewer_id, notes) values
  ('SH003', 2026, 2, 25, 38, 15, 'B', 'SH001', 'Setia Indah onboarding'),         -- Jackson Low
  ('SH005', 2026, 2, 24, 38, 14, 'B', 'SH001', 'Pipeline-building phase'),       -- Hong Li
  ('SH006', 2026, 2, 25, 39, 16, 'B', 'SH001', null),                            -- Darerca Chaw
  ('SH007', 2026, 2, 29, 45, 17, 'A', 'SH001', 'Admin coverage during CNY'),     -- Denise Ng
  ('SH008', 2026, 2, 23, 36, 14, 'B', 'SH001', 'Partial month — on leave'),      -- Vinson Tan
  ('SH009', 2026, 2, 28, 44, 17, 'A', 'SH001', 'Site discipline exemplary'),     -- Leong Hui
  ('SH010', 2026, 2, 24, 37, 14, 'B', 'SH001', 'New joiner ramp')                -- Chiou Ying
on conflict (staff_id, year, month) do nothing;
