-- ============================================================================
-- SPAZEHAUS — Phase 0A Seed Data
-- Generated: 2026-05-12
--
-- Mirrors the in-memory mock data the app has been using.
-- Email convention: kaseyfong@saysheji.com is the Principal Designer (Grace).
-- All other staff get @spazehaus.com.my placeholders — swap them later as
-- people join the real Supabase Auth users via magic link.
-- ============================================================================

-- ─── STAFF ──────────────────────────────────────────────────────────────────

insert into staff (id, email, name, role, job_title, dept, avatar_code, status, join_date, leave_balance_annual, leave_balance_medical, kpi_grade, phone) values
  ('SH001', 'kaseyfong@saysheji.com',   'Grace Tan',     'principal',       'Principal Designer', 'Design',     'GT', 'active',     '2019-03-15', 12, 14, 'A', '+60 12-345 6789'),
  ('SH002', 'wilson@spazehaus.com.my',  'Wilson Lee',    'designer',        'Senior Designer',    'Design',     'WL', 'active',     '2020-07-01',  8, 14, 'A', null),
  ('SH003', 'jackson@spazehaus.com.my', 'Jackson Low',   'designer',        'Interior Designer',  'Design',     'JL', 'active',     '2021-01-12', 10, 14, 'B', null),
  ('SH004', 'waihong@spazehaus.com.my', 'Wai Hong',      'pm',              'Project Manager',    'Operations', 'WH', 'active',     '2020-09-05',  9, 14, 'A', null),
  ('SH005', 'hongli@spazehaus.com.my',  'Hong Li',       'sales',           'Sales Consultant',   'Sales',      'HL', 'active',     '2022-02-20',  6, 14, 'B', null),
  ('SH006', 'darerca@spazehaus.com.my', 'Darerca Chaw',  'designer',        '3D Visualizer',      'Design',     'DC', 'active',     '2021-06-08',  7, 14, 'B', null),
  ('SH007', 'denise@spazehaus.com.my',  'Denise Ng',     'admin_exec',      'Admin Executive',    'Admin',      'DN', 'active',     '2020-11-14', 11, 14, 'A', null),
  ('SH008', 'vinson@spazehaus.com.my',  'Vinson Tan',    'designer',        'Interior Designer',  'Design',     'VT', 'on-leave',   '2022-04-03',  5, 12, 'B', null),
  ('SH009', 'leong@spazehaus.com.my',   'Leong Hui',     'site_supervisor', 'Site Supervisor',    'Operations', 'LH', 'on-project', '2019-08-22', 14, 14, 'A', null),
  ('SH010', 'chiou@spazehaus.com.my',   'Chiou Ying',    'sales',           'Sales Consultant',   'Sales',      'CY', 'active',     '2023-05-17',  4, 14, 'B', null);

-- ─── PROJECTS ───────────────────────────────────────────────────────────────

insert into projects (id, name, client_name, client_contact, project_type, property_type, location, size_sqft, budget, start_date, target_date, status, priority, progress, designer_id, pm_id, team, current_stage_id, lifecycle_started_at, photo_count, task_count, tasks_completed, areas, description) values
  ('PRJ001', 'The Paragon Residence',     'Mr. & Mrs. Lim',     '+60 11-234 5678', 'Residential', 'Condominium', 'Bukit Indah, Johor Bahru',          1850, 280000, '2026-01-05', '2026-04-30', 'active',       'high',   65, 'SH002', 'SH004', array['WL','JL','DC'], 'progressive-pay', '2026-01-05', 24, 12,  8, array['Living Room','Master Bedroom','Bedroom 2','Kitchen','Dining Area','Master Bathroom'], 'Full renovation of a 1,850 sqft condominium unit with a modern luxury aesthetic. Dark tones with warm gold accents throughout.'),
  ('PRJ002', 'Eco Botanic Office Suite',  'TechVenture Sdn Bhd','+60 7-456 7890',  'Commercial',  'Office',      'Eco Botanic, Iskandar Puteri',      3200, 520000, '2025-11-15', '2026-02-28', 'under-review', 'high',   92, 'SH001', 'SH004', array['GT','WL','LH'], 'final-payment',   '2025-11-15', 48, 18, 17, array['Reception','Open Office','Meeting Room A','Meeting Room B','Pantry','Director''s Office'], 'Contemporary open-plan office design for a tech startup. Biophilic design elements with natural materials and smart lighting.'),
  ('PRJ003', 'Setia Indah Landed Home',   'Dato'' Ahmad Razif', '+60 12-678 9012', 'Residential', 'Landed',      'Setia Indah, Johor Bahru',          4200, 650000, '2026-02-10', '2026-07-31', 'assigned',     'medium', 15, 'SH003', 'SH004', array['JL','DC','VT'], '3d-meeting',      '2026-02-10',  6, 22,  3, array['Living Room','Dining Room','Kitchen','Master Suite','Bedroom 2','Bedroom 3','Study','Garden Lounge'], 'Luxury landed property renovation with a blend of contemporary and traditional Malaysian design elements.'),
  ('PRJ004', 'Paradigm Mall F&B Outlet',  'Saveur Group',       '+60 7-890 1234',  'Commercial',  'F&B',         'Paradigm Mall, Johor Bahru',        1200, 380000, '2026-01-20', '2026-03-15', 'completed',    'medium',100, 'SH001', 'SH004', array['GT','DC'],       'defect-period',   '2026-01-20', 32, 14, 14, array['Dining Area','Bar Counter','Kitchen','Entrance','Private Dining'], 'Upscale restaurant interior with a Japanese-inspired minimalist aesthetic. Warm timber, stone, and curated lighting.'),
  ('PRJ005', 'Austin Heights Condo',      'Ms. Tan Wei Lin',    '+60 16-345 6789', 'Residential', 'Condominium', 'Austin Heights, Johor Bahru',        980, 120000, '2026-03-01', '2026-05-31', 'active',       'low',    30, 'SH006', 'SH003', array['DC','JL'],       'work-schedule',   '2026-03-01',  8,  9,  3, array['Living Room','Master Bedroom','Kitchen','Bathroom'], 'Compact but elegant studio-style renovation with smart storage solutions and a neutral palette.');

-- ─── PAYMENT RECORDS ────────────────────────────────────────────────────────

-- PRJ001 (mid-build, gate 4 split into 3 instalments)
insert into payment_records (project_id, gate, label, amount, status, collected_date, due_date, reference, instalment, of_instalments, notes) values
  ('PRJ001', 1, 'Proposal Deposit',          3000,   'completed',   '2025-12-10', null,         'PD-2025-021', null, null, null),
  ('PRJ001', 2, 'Design Contract Fee',       18000,  'completed',   '2025-12-20', null,         'DC-2025-018', null, null, null),
  ('PRJ001', 3, 'Renovation Deposit (50%)',  130000, 'completed',   '2026-01-08', null,         'RD-2026-003', null, null, null),
  ('PRJ001', 4, 'Progressive Payment 1/3',   39000,  'completed',   '2026-03-15', null,         'PP-2026-014',    1,    3, null),
  ('PRJ001', 4, 'Progressive Payment 2/3',   39000,  'in-progress', null,         '2026-05-15',  null,            2,    3, 'Awaiting site inspection sign-off'),
  ('PRJ001', 4, 'Progressive Payment 3/3',   39000,  'pending',     null,         '2026-06-10',  null,            3,    3, null),
  ('PRJ001', 5, 'Final Payment',             51000,  'pending',     null,         '2026-04-30',  null,         null, null, null);

-- PRJ002 (handover done, final payment outstanding)
insert into payment_records (project_id, gate, label, amount, status, collected_date, due_date, reference, instalment, of_instalments, notes) values
  ('PRJ002', 1, 'Proposal Deposit',          5000,   'completed',   '2025-10-01', null, 'PD-2025-014', null, null, null),
  ('PRJ002', 2, 'Design Contract Fee',       52000,  'completed',   '2025-10-10', null, 'DC-2025-009', null, null, null),
  ('PRJ002', 3, 'Renovation Deposit (50%)',  260000, 'completed',   '2025-11-12', null, 'RD-2025-021', null, null, null),
  ('PRJ002', 4, 'Progressive Payment 1/2',   80000,  'completed',   '2026-01-15', null, 'PP-2026-002',    1,    2, null),
  ('PRJ002', 4, 'Progressive Payment 2/2',   80000,  'completed',   '2026-02-20', null, 'PP-2026-008',    2,    2, null),
  ('PRJ002', 5, 'Final Payment',             43000,  'in-progress', null,         '2026-05-15', null, null, null, 'Invoice issued, awaiting client transfer');

-- PRJ003 (early-stage)
insert into payment_records (project_id, gate, label, amount, status, collected_date, due_date, reference, instalment, of_instalments, notes) values
  ('PRJ003', 1, 'Proposal Deposit',          5000,   'completed', '2026-01-12', null,         'PD-2026-002', null, null, null),
  ('PRJ003', 2, 'Design Contract Fee',       65000,  'completed', '2026-02-08', null,         'DC-2026-005', null, null, null),
  ('PRJ003', 3, 'Renovation Deposit (50%)',  325000, 'pending',   null,         '2026-05-15', null,           null, null, 'Awaiting renovation contract signing'),
  ('PRJ003', 4, 'Progressive Payment',       162500, 'pending',   null,         null,         null,           null, null, 'To be split into 4 instalments'),
  ('PRJ003', 5, 'Final Payment',             97500,  'pending',   null,         '2026-07-31', null,           null, null, null);

-- PRJ004 (fully closed)
insert into payment_records (project_id, gate, label, amount, status, collected_date, due_date, reference, instalment, of_instalments, notes) values
  ('PRJ004', 1, 'Proposal Deposit',          4000,   'completed', '2025-12-05', null, 'PD-2025-019', null, null, null),
  ('PRJ004', 2, 'Design Contract Fee',       38000,  'completed', '2025-12-15', null, 'DC-2025-017', null, null, null),
  ('PRJ004', 3, 'Renovation Deposit (50%)',  190000, 'completed', '2026-01-18', null, 'RD-2026-007', null, null, null),
  ('PRJ004', 4, 'Progressive Payment 1/2',   76000,  'completed', '2026-02-10', null, 'PP-2026-005',    1,    2, null),
  ('PRJ004', 4, 'Progressive Payment 2/2',   76000,  'completed', '2026-03-01', null, 'PP-2026-011',    2,    2, null),
  ('PRJ004', 5, 'Final Payment',             38000,  'completed', '2026-03-16', null, 'FP-2026-004', null, null, null);

-- PRJ005 (just past deposit, build prep)
insert into payment_records (project_id, gate, label, amount, status, collected_date, due_date, reference, instalment, of_instalments, notes) values
  ('PRJ005', 1, 'Proposal Deposit',          2000,  'completed', '2026-02-10', null,         'PD-2026-006', null, null, null),
  ('PRJ005', 2, 'Design Contract Fee',       8000,  'completed', '2026-02-20', null,         'DC-2026-008', null, null, null),
  ('PRJ005', 3, 'Renovation Deposit (50%)',  60000, 'completed', '2026-02-28', null,         'RD-2026-012', null, null, null),
  ('PRJ005', 4, 'Progressive Payment',       36000, 'pending',   null,         '2026-04-15', null,           null, null, 'To be split into 2 instalments'),
  ('PRJ005', 5, 'Final Payment',             24000, 'pending',   null,         '2026-05-31', null,           null, null, null);

-- ─── SIGNATURE RECORDS ──────────────────────────────────────────────────────

-- PRJ001
insert into signature_records (project_id, signature_key, label, group_name, status, signed_date, signed_by, document_ref, notes) values
  ('PRJ001', 'design-contract',     'Design Contract',            'contract', 'completed', '2025-12-20', 'Mr. & Mrs. Lim', 'DC-PRJ001.pdf',    null),
  ('PRJ001', 'revised-3d',          'Revised 3D Drawing',         'drawing',  'completed', '2025-12-28', 'Mr. & Mrs. Lim', '3D-R2-PRJ001.pdf', null),
  ('PRJ001', 'renovation-contract', 'Renovation Contract',        'contract', 'completed', '2026-01-05', 'Mr. & Mrs. Lim', 'RC-PRJ001.pdf',    null),
  ('PRJ001', 'material-selection',  'Material Selection',         'drawing',  'completed', '2026-01-12', 'Mr. & Mrs. Lim', 'MS-PRJ001.pdf',    null),
  ('PRJ001', '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'completed', '2026-01-15', 'Mr. & Mrs. Lim', '2D-PRJ001.pdf',    null),
  ('PRJ001', 'handover',            'Handover Acceptance',        'contract', 'pending',   null,         null,             null,                null);

-- PRJ002
insert into signature_records (project_id, signature_key, label, group_name, status, signed_date, signed_by, document_ref) values
  ('PRJ002', 'design-contract',     'Design Contract',            'contract', 'completed', '2025-10-10', 'TechVenture Sdn Bhd', 'DC-PRJ002.pdf'),
  ('PRJ002', 'revised-3d',          'Revised 3D Drawing',         'drawing',  'completed', '2025-10-28', 'TechVenture Sdn Bhd', '3D-R3-PRJ002.pdf'),
  ('PRJ002', 'renovation-contract', 'Renovation Contract',        'contract', 'completed', '2025-11-08', 'TechVenture Sdn Bhd', 'RC-PRJ002.pdf'),
  ('PRJ002', 'material-selection',  'Material Selection',         'drawing',  'completed', '2025-11-20', 'TechVenture Sdn Bhd', 'MS-PRJ002.pdf'),
  ('PRJ002', '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'completed', '2025-11-25', 'TechVenture Sdn Bhd', '2D-PRJ002.pdf'),
  ('PRJ002', 'handover',            'Handover Acceptance',        'contract', 'completed', '2026-02-20', 'TechVenture Sdn Bhd', 'HO-PRJ002.pdf');

-- PRJ003
insert into signature_records (project_id, signature_key, label, group_name, status, signed_date, signed_by, document_ref, notes) values
  ('PRJ003', 'design-contract',     'Design Contract',            'contract', 'completed',   '2026-02-08', 'Dato'' Ahmad Razif', 'DC-PRJ003.pdf', null),
  ('PRJ003', 'revised-3d',          'Revised 3D Drawing',         'drawing',  'in-progress', null,         null,                  null,            '3D meeting scheduled this week'),
  ('PRJ003', 'renovation-contract', 'Renovation Contract',        'contract', 'pending',     null,         null,                  null,            null),
  ('PRJ003', 'material-selection',  'Material Selection',         'drawing',  'pending',     null,         null,                  null,            null),
  ('PRJ003', '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'pending',     null,         null,                  null,            null),
  ('PRJ003', 'handover',            'Handover Acceptance',        'contract', 'pending',     null,         null,                  null,            null);

-- PRJ004
insert into signature_records (project_id, signature_key, label, group_name, status, signed_date, signed_by, document_ref) values
  ('PRJ004', 'design-contract',     'Design Contract',            'contract', 'completed', '2025-12-15', 'Saveur Group', 'DC-PRJ004.pdf'),
  ('PRJ004', 'revised-3d',          'Revised 3D Drawing',         'drawing',  'completed', '2025-12-30', 'Saveur Group', '3D-R2-PRJ004.pdf'),
  ('PRJ004', 'renovation-contract', 'Renovation Contract',        'contract', 'completed', '2026-01-15', 'Saveur Group', 'RC-PRJ004.pdf'),
  ('PRJ004', 'material-selection',  'Material Selection',         'drawing',  'completed', '2026-01-22', 'Saveur Group', 'MS-PRJ004.pdf'),
  ('PRJ004', '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'completed', '2026-01-25', 'Saveur Group', '2D-PRJ004.pdf'),
  ('PRJ004', 'handover',            'Handover Acceptance',        'contract', 'completed', '2026-03-15', 'Saveur Group', 'HO-PRJ004.pdf');

-- PRJ005
insert into signature_records (project_id, signature_key, label, group_name, status, signed_date, signed_by, document_ref, notes) values
  ('PRJ005', 'design-contract',     'Design Contract',            'contract', 'completed',   '2026-02-20', 'Ms. Tan Wei Lin', 'DC-PRJ005.pdf',    null),
  ('PRJ005', 'revised-3d',          'Revised 3D Drawing',         'drawing',  'completed',   '2026-02-25', 'Ms. Tan Wei Lin', '3D-R1-PRJ005.pdf', null),
  ('PRJ005', 'renovation-contract', 'Renovation Contract',        'contract', 'completed',   '2026-02-27', 'Ms. Tan Wei Lin', 'RC-PRJ005.pdf',    null),
  ('PRJ005', 'material-selection',  'Material Selection',         'drawing',  'in-progress', null,         null,               null,                'Selection meeting on 12/05/2026'),
  ('PRJ005', '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'pending',     null,         null,               null,                null),
  ('PRJ005', 'handover',            'Handover Acceptance',        'contract', 'pending',     null,         null,               null,                null);

-- ─── INQUIRIES (CUSTOMER DATABASE) ──────────────────────────────────────────

insert into inquiries (id, inquiry_date, client_name, contact, email, category, tier, source, property_type, location, estimated_size, estimated_budget, stage, assigned_to_id, notes, awarded_project_id, awarded_date, rejected_date, rejection_reason, last_updated, contact_log) values
  ('INQ-2025-014', '2025-11-10', 'Mr. & Mrs. Lim',         '+60 11-234 5678', 'lim.family@gmail.com',         'Residential', 'Standard', 'Property Agent', 'Condominium', 'Bukit Indah, Johor Bahru',          1850, 280000, 'awarded',       'SH005', 'Wanted modern luxury aesthetic. Dark tones with warm gold accents.',                        'PRJ001', '2025-12-10', null, null, '2025-12-10',
    '[{"date":"2025-11-10","type":"call","note":"Initial inquiry via Property Agent referral","by":"HL"},{"date":"2025-11-18","type":"meet","note":"Showroom visit — viewed 3 sample fit-outs","by":"HL"},{"date":"2025-12-01","type":"site-visit","note":"Site measurement at Paragon unit","by":"WL"},{"date":"2025-12-10","type":"meet","note":"Design proposal signed · deposit collected","by":"GT"}]'::jsonb),
  ('INQ-2025-009', '2025-09-20', 'TechVenture Sdn Bhd',    '+60 7-456 7890',  'admin@techventure.com.my',     'Commercial',  'VIP',      'Referral',       'Office',      'Eco Botanic, Iskandar Puteri',      3200, 520000, 'awarded',       'SH001', 'Tech startup — wants biophilic office, smart lighting, sit-stand desks.',                   'PRJ002', '2025-10-01', null, null, '2025-10-01',
    '[{"date":"2025-09-20","type":"email","note":"Inbound enquiry referred by ex-client (Saveur Group)","by":"GT"},{"date":"2025-09-25","type":"meet","note":"Showroom + portfolio review","by":"GT"},{"date":"2025-10-01","type":"meet","note":"Design proposal signed","by":"GT"}]'::jsonb),
  ('INQ-2025-026', '2025-12-15', 'Dato'' Ahmad Razif',     '+60 12-678 9012', 'dato.razif@gmail.com',         'Residential', 'VIP',      'Referral',       'Landed',      'Setia Indah, Johor Bahru',          4200, 650000, 'awarded',       'SH001', 'Luxury landed home. Prefers blend of contemporary + traditional Malaysian.',                'PRJ003', '2026-02-08', null, null, '2026-02-08',
    '[{"date":"2025-12-15","type":"call","note":"Referred by Dato''s neighbour (past client)","by":"HL"},{"date":"2025-12-22","type":"meet","note":"Private showroom session — VIP treatment","by":"GT"},{"date":"2026-01-15","type":"site-visit","note":"Initial site walkthrough","by":"GT"},{"date":"2026-02-08","type":"meet","note":"Design contract signed","by":"GT"}]'::jsonb),
  ('INQ-2025-018', '2025-11-01', 'Saveur Group',           '+60 7-890 1234',  'ops@saveurgroup.com',          'F&B',         'Repeat',   'Past Client',    'F&B',         'Paradigm Mall, Johor Bahru',        1200, 380000, 'awarded',       'SH001', '3rd outlet with Spazehaus. Japanese-inspired minimalist, warm timber + stone.',             'PRJ004', '2025-12-05', null, null, '2025-12-05',
    '[{"date":"2025-11-01","type":"whatsapp","note":"Repeat client — direct WhatsApp to GT","by":"GT"},{"date":"2025-11-10","type":"meet","note":"Concept presentation","by":"GT"},{"date":"2025-12-05","type":"meet","note":"Design contract signed","by":"GT"}]'::jsonb),
  ('INQ-2026-002', '2026-01-05', 'Ms. Tan Wei Lin',        '+60 16-345 6789', 'tanweilin@gmail.com',          'Residential', 'Standard', 'Instagram',      'Condominium', 'Austin Heights, Johor Bahru',        980, 120000, 'awarded',       'SH010', 'First-home buyer. Followed Spazehaus on IG. Compact studio renovation.',                    'PRJ005', '2026-02-20', null, null, '2026-02-20',
    '[{"date":"2026-01-05","type":"email","note":"DM via Instagram","by":"CY"},{"date":"2026-01-12","type":"meet","note":"Showroom walk-in","by":"CY"},{"date":"2026-02-10","type":"site-visit","note":"Site measurement","by":"DC"},{"date":"2026-02-20","type":"meet","note":"Design contract signed","by":"CY"}]'::jsonb),
  ('INQ-2026-008', '2026-04-12', 'Mr. Faizal Hassan',      '+60 13-456 7890', 'faizal.h@outlook.com',         'Residential', 'Standard', 'Walk-in',        'Condominium', 'Iskandar Residences, Iskandar Puteri', 1420, 180000, 'showroom-meet', 'SH005', 'Newly married couple. Comparing 2 firms. Likes minimalist Scandinavian style.',             null,     null,         null, null, '2026-04-28',
    '[{"date":"2026-04-12","type":"meet","note":"Walked in to showroom — mood-board chat","by":"HL"},{"date":"2026-04-20","type":"call","note":"Follow-up call · confirmed next meeting","by":"HL"},{"date":"2026-04-28","type":"meet","note":"2nd showroom visit with spouse · positive","by":"HL"}]'::jsonb),
  ('INQ-2026-010', '2026-04-20', 'Bean & Brew Café',       '+60 17-234 5678', 'hello@beanandbrew.my',         'F&B',         'Standard', 'Instagram',      'F&B',         'Mount Austin, Johor Bahru',          850, 220000, 'showroom-meet', 'SH010', 'Boutique cafe chain expansion. 3rd outlet. Wants industrial/Japandi blend.',                 null,     null,         null, null, '2026-05-05',
    '[{"date":"2026-04-20","type":"email","note":"IG inbox enquiry · auto-routed to CY","by":"CY"},{"date":"2026-04-28","type":"meet","note":"Showroom + sample fit-out tour","by":"CY"},{"date":"2026-05-05","type":"site-visit","note":"Site visit at Mount Austin shop lot","by":"CY"}]'::jsonb),
  ('INQ-2026-012', '2026-05-02', 'Cheong Family',          '+60 19-876 5432', 'lily.cheong@gmail.com',        'Residential', 'Referral', 'Referral',       'Landed',      'Setia Tropika, Johor Bahru',        3800, 580000, 'showroom-meet', 'SH001', 'Referred by Dato'' Ahmad Razif (PRJ003). Family of 5. Multi-generational living.',          null,     null,         null, null, '2026-05-08',
    '[{"date":"2026-05-02","type":"call","note":"Inbound referral call from Dato'' Ahmad","by":"HL"},{"date":"2026-05-08","type":"meet","note":"VIP showroom session with GT · very engaged","by":"GT"}]'::jsonb),
  ('INQ-2026-013', '2026-05-06', 'Pixel Studio Sdn Bhd',   '+60 12-345 9876', 'admin@pixelstudio.my',         'Office',      'Standard', 'Google',         'Office',      'JB CBD (Jalan Wong Ah Fook)',       1100, 160000, 'new-inquiry',   'SH010', 'Small design agency, 8-person team. Wants productive open-plan.',                            null,     null,         null, null, '2026-05-08',
    '[{"date":"2026-05-06","type":"email","note":"Web form submission via Google ad","by":"CY"},{"date":"2026-05-08","type":"call","note":"Qualifier call · scheduled showroom for next week","by":"CY"}]'::jsonb),
  ('INQ-2026-014', '2026-05-08', 'Dr. Rachel Goh',         '+60 14-789 1234', 'rachel.goh.dr@gmail.com',      'Residential', 'Standard', 'Instagram',      'Condominium', 'Country Garden Danga Bay',          1650, 240000, 'new-inquiry',   'SH005', 'Dentist — high-end finishes important. Saw a reel about PRJ001.',                            null,     null,         null, null, '2026-05-09',
    '[{"date":"2026-05-08","type":"email","note":"DM via Instagram — interested in Paragon-style finish","by":"HL"},{"date":"2026-05-09","type":"whatsapp","note":"Sent portfolio PDF · awaiting reply","by":"HL"}]'::jsonb),
  ('INQ-2025-019', '2025-11-12', 'Ms. Zara Ibrahim',       '+60 18-123 4567', 'zara.ibrahim@yahoo.com',       'Residential', 'Standard', 'Walk-in',        'Condominium', 'Sutera Utama, Johor Bahru',         1100,  80000, 'rejected',      'SH010', 'Came in with RM80k budget for a 1,100 sqft full reno. Educated her on realistic costing.', null,     null,         '2025-12-08', 'Budget mismatch — went with cheaper local contractor', '2025-12-08',
    '[{"date":"2025-11-12","type":"meet","note":"Showroom walk-in","by":"CY"},{"date":"2025-11-20","type":"email","note":"Quotation sent · est. RM 145,000","by":"CY"},{"date":"2025-12-08","type":"whatsapp","note":"Decided to engage another contractor","by":"CY"}]'::jsonb),
  ('INQ-2026-001', '2026-01-03', 'Horizon Logistics Sdn Bhd','+60 7-321 4567','facilities@horizonlogistics.com.my','Commercial','Standard','Website',       'Office',      'Senai Airport City',                4500, 320000, 'rejected',      'SH001', 'Promising lead but they shelved the office relocation entirely.',                            null,     null,         '2026-02-20', 'Project shelved — parent company restructure',          '2026-02-20',
    '[{"date":"2026-01-03","type":"email","note":"Web form · scoping a 4,500 sqft fit-out","by":"GT"},{"date":"2026-01-10","type":"meet","note":"Showroom + concept review","by":"GT"},{"date":"2026-01-25","type":"meet","note":"Quotation pitched, RM 380k","by":"GT"},{"date":"2026-02-20","type":"email","note":"Project shelved — group restructure paused all capex","by":"GT"}]'::jsonb),
  ('INQ-2026-006', '2026-03-20', 'Ms. Vivien Ng',          '+60 11-987 6543', null,                            'Residential', 'Standard', 'Facebook',       'Condominium', 'Skudai, Johor Bahru',                950,  95000, 'rejected',      'SH010', 'FB ad lead. Lost interest after seeing quotation.',                                         null,     null,         '2026-04-10', 'Went silent after 2nd follow-up · presumed lost',       '2026-04-10',
    '[{"date":"2026-03-20","type":"call","note":"Inbound from FB ad","by":"CY"},{"date":"2026-03-28","type":"meet","note":"Showroom walk-in · seemed engaged","by":"CY"},{"date":"2026-04-01","type":"email","note":"Quotation sent","by":"CY"},{"date":"2026-04-06","type":"whatsapp","note":"Follow-up — no reply","by":"CY"},{"date":"2026-04-10","type":"whatsapp","note":"2nd follow-up — no reply · marked lost","by":"CY"}]'::jsonb);

-- ─── QUOTATIONS + LINE ITEMS (abridged: 4 docs from the mock set) ───────────

insert into quotations (id, project_id, doc_type, status, client_name, client_contact, client_email, client_address, issue_date, valid_until, due_date, tax_rate, notes, terms, revision) values
  ('QT-2026-001', 'PRJ001', 'Quotation', 'accepted', 'Mr. & Mrs. Lim',      '+60 11-234 5678', 'lim.family@gmail.com',         'Unit 12-3, The Paragon, Bukit Indah, 81200 Johor Bahru, Johor',                  '2026-01-02', '2026-02-02', null,         0, 'Prices quoted are inclusive of all materials, labour, and project management fees unless otherwise stated. All custom furniture lead time is 6–8 weeks.', '50% deposit upon acceptance. 30% upon commencement of works. 20% upon completion and handover. All payments via bank transfer to Spazehaus Design Sdn Bhd.', 2),
  ('QT-2026-002', 'PRJ002', 'Invoice',   'paid',     'TechVenture Sdn Bhd', '+60 7-456 7890',  'admin@techventure.com.my',     'Level 8, Eco Botanic Tower, Iskandar Puteri, 79100 Johor Bahru, Johor',          '2025-11-15', null,         '2025-11-30', 8, 'Final invoice upon project completion. All works have been completed and accepted by client on 20/02/2026.',                                              'Payment due within 14 days of invoice date. Late payment subject to 1.5% monthly interest charge.',                                                            1),
  ('QT-2026-003', 'PRJ003', 'Quotation', 'sent',     'Dato'' Ahmad Razif',  '+60 12-678 9012', 'dato.razif@gmail.com',         'No. 12, Jalan Setia Murni 2, Setia Indah, 81100 Johor Bahru, Johor',             '2026-02-08', '2026-03-08', null,         0, 'This quotation covers full renovation works for the 4,200 sqft landed property. Phased payment schedule available upon request.',                          '50% deposit upon acceptance. 25% upon commencement. 25% upon completion. All custom items are non-refundable once ordered.',                                  1),
  ('QT-2026-004', 'PRJ005', 'Quotation', 'draft',    'Ms. Tan Wei Lin',     '+60 16-345 6789', 'tanweilin@gmail.com',          'Unit 8-12, Austin Heights Sky, Jalan Austin Heights 8, 81100 Johor Bahru, Johor','2026-02-20', '2026-03-20', null,         0, 'Compact renovation package for 980 sqft condominium. Smart storage solutions included.',                                                                   '50% deposit upon acceptance. 50% upon completion.',                                                                                                              1);

insert into quotation_items (id, quotation_id, area, description, category, qty, unit, unit_price, discount) values
  -- QT-2026-001 (Paragon Residence)
  ('I001', 'QT-2026-001', 'Living Room',     'Feature TV Console — Walnut veneer with LED strip lighting, 3m span',         'Furniture',  1,   'set',      12500, 0),
  ('I002', 'QT-2026-001', 'Living Room',     'Plaster ceiling with cove lighting, 280 sqft',                                  'Labour',     280, 'sqft',        18, 0),
  ('I003', 'QT-2026-001', 'Living Room',     'Engineered timber flooring — Herringbone pattern, 280 sqft',                    'Material',   280, 'sqft',        22, 5),
  ('I004', 'QT-2026-001', 'Master Bedroom',  'Full carpentry wardrobe — 3.6m, swing door with mirror panel',                  'Furniture',  1,   'set',       9800, 0),
  ('I005', 'QT-2026-001', 'Master Bedroom',  'Bed frame — upholstered headboard, queen size',                                 'Furniture',  1,   'unit',      4200, 0),
  ('I006', 'QT-2026-001', 'Master Bedroom',  'Plaster ceiling with indirect lighting, 180 sqft',                              'Labour',     180, 'sqft',        18, 0),
  ('I007', 'QT-2026-001', 'Kitchen',         'Kitchen cabinet — upper & lower, lacquer finish, 12ft run',                     'Furniture',  12,  'ft',         680, 0),
  ('I008', 'QT-2026-001', 'Kitchen',         'Quartz countertop — Calacatta white, 12ft',                                     'Material',   12,  'ft',         380, 0),
  ('I009', 'QT-2026-001', 'Dining Area',     'Dining table — solid oak, 6-seater custom made',                                'Furniture',  1,   'set',       6800, 0),
  ('I010', 'QT-2026-001', 'All Areas',       'Interior design & project management fee',                                       'Design',     1,   'lump sum', 18000, 0),
  ('I011', 'QT-2026-001', 'All Areas',       'Electrical works — lighting points, switches, sockets',                          'Electrical', 1,   'lump sum', 12000, 0),
  ('I012', 'QT-2026-001', 'Master Bathroom', 'Bathroom renovation — tiles, sanitary, accessories',                             'Material',   1,   'lump sum', 22000, 0),
  -- QT-2026-002 (Eco Botanic)
  ('J001', 'QT-2026-002', 'Reception',     'Reception counter — custom curved design, stone cladding',          'Furniture',  1,  'set',      28000, 0),
  ('J002', 'QT-2026-002', 'Open Office',   'Workstation system — 20 units, sit-stand desks',                    'Furniture',  20, 'unit',      3200, 10),
  ('J003', 'QT-2026-002', 'Meeting Room A','Conference table — 10-seater, solid walnut',                        'Furniture',  1,  'unit',     18000, 0),
  ('J004', 'QT-2026-002', 'Meeting Room B','Collaboration table — 6-seater with whiteboard wall',               'Furniture',  1,  'set',      12000, 0),
  ('J005', 'QT-2026-002', 'All Areas',     'Biophilic wall installation — preserved moss & plants',              'Material',   1,  'lump sum', 35000, 0),
  ('J006', 'QT-2026-002', 'All Areas',     'Smart lighting system — Philips Hue commercial',                     'Electrical', 1,  'lump sum', 42000, 5),
  ('J007', 'QT-2026-002', 'All Areas',     'Interior design & project management fee',                            'Design',     1,  'lump sum', 52000, 0),
  ('J008', 'QT-2026-002', 'Pantry',        'Pantry cabinet & countertop, full fit-out',                          'Furniture',  1,  'lump sum', 18000, 0),
  -- QT-2026-003 (Setia Indah)
  ('K001', 'QT-2026-003', 'Living Room',  'Feature wall — Venetian plaster finish with gold inlay',           'Labour',     1,   'lump sum', 18000, 0),
  ('K002', 'QT-2026-003', 'Living Room',  'Marble flooring — Statuario marble, 400 sqft',                      'Material',   400, 'sqft',        85, 0),
  ('K003', 'QT-2026-003', 'Master Suite', 'Full master suite carpentry — wardrobe, dressing table, bedframe',  'Furniture',  1,   'set',      45000, 0),
  ('K004', 'QT-2026-003', 'Kitchen',      'Full kitchen renovation — island, cabinets, countertop, appliances','Furniture',  1,   'lump sum', 85000, 5),
  ('K005', 'QT-2026-003', 'All Areas',    'Interior design & project management fee',                            'Design',     1,   'lump sum', 65000, 0),
  ('K006', 'QT-2026-003', 'All Areas',    'Electrical & smart home system',                                      'Electrical', 1,   'lump sum', 55000, 0),
  ('K007', 'QT-2026-003', 'Garden Lounge','Outdoor deck & landscaping',                                          'Others',     1,   'lump sum', 38000, 0),
  -- QT-2026-004 (Austin Heights)
  ('L001', 'QT-2026-004', 'Living Room',     'TV feature wall with storage, laminate finish', 'Furniture',  1,   'set',      6800, 0),
  ('L002', 'QT-2026-004', 'Living Room',     'Vinyl plank flooring, 280 sqft',                'Material',   280, 'sqft',       12, 0),
  ('L003', 'QT-2026-004', 'Master Bedroom',  'Built-in wardrobe — 2.4m, 4 panel',              'Furniture',  1,   'set',      5200, 0),
  ('L004', 'QT-2026-004', 'Kitchen',         'Kitchen cabinet — upper & lower, 8ft run',      'Furniture',  8,   'ft',        580, 0),
  ('L005', 'QT-2026-004', 'All Areas',       'Interior design fee',                            'Design',     1,   'lump sum',  8000, 0),
  ('L006', 'QT-2026-004', 'All Areas',       'Electrical minor works',                         'Electrical', 1,   'lump sum',  4500, 0);

-- ─── HR ─────────────────────────────────────────────────────────────────────

insert into leave_requests (id, staff_id, leave_type, start_date, end_date, days, reason, status, applied_date) values
  ('LV001', 'SH008', 'Annual Leave',      '2026-02-24', '2026-02-26', 3, 'Family vacation',             'approved', '2026-02-18'),
  ('LV002', 'SH003', 'Medical Leave',     '2026-02-21', '2026-02-21', 1, 'Fever and flu',                'approved', '2026-02-21'),
  ('LV003', 'SH005', 'Annual Leave',      '2026-03-03', '2026-03-05', 3, 'Personal matters',             'pending',  '2026-02-22'),
  ('LV004', 'SH010', 'Replacement Leave', '2026-02-28', '2026-02-28', 1, 'Replacement for weekend work', 'pending',  '2026-02-23');

insert into candidates (id, name, applied_for_role, source, stage, applied_date, experience, portfolio_url) values
  ('C001', 'Amirah Binti Zulkifli', 'Interior Designer', 'LinkedIn', '2nd Interview', '2026-02-10', '3 years', 'behance.net/amirahdesign'),
  ('C002', 'Kevin Chong',           '3D Visualizer',     'Referral', 'Shortlisted',   '2026-02-15', '2 years', 'artstation.com/kevinchong'),
  ('C003', 'Priya Nair',            'Sales Consultant',  'JobStreet','Interview',     '2026-02-18', '4 years', null),
  ('C004', 'Muhammad Haziq',        'Site Supervisor',   'Walk-in',  'Sourced',       '2026-02-20', '5 years', null),
  ('C005', 'Stephanie Lim',         'Interior Designer', 'Instagram','Onboarded',     '2026-02-01', '1 year',  'instagram.com/stephanieinteriors');

insert into announcements (id, title, content, priority, author_id, published_date) values
  ('A001', 'CNY Office Closure',          'The office will be closed from 28 Jan to 3 Feb 2026 for Chinese New Year. Emergency contacts remain active.',                                                  'high',   'SH001', '2026-01-20'),
  ('A002', 'New Project Management SOP',  'Please review the updated project documentation guidelines uploaded to the shared drive. All new projects from March onwards must follow the new SOP.',         'medium', 'SH004', '2026-02-15'),
  ('A003', 'Team Lunch — March 2026',     'Monthly team lunch will be held at Spazehaus Showroom on 7 March 2026 at 12:30pm. Attendance is mandatory.',                                                    'low',    'SH007', '2026-02-22');

-- ─── SALES TARGETS ──────────────────────────────────────────────────────────

insert into sales_targets (staff_id, monthly_target, ytd_target, gp_target_pct, effective_from) values
  ('SH001', 200000, 1000000, 28, '2026-01-01'),  -- Grace Tan
  ('SH005', 100000,  500000, 22, '2026-01-01'),  -- Hong Li
  ('SH010',  60000,  300000, 22, '2026-01-01');  -- Chiou Ying
