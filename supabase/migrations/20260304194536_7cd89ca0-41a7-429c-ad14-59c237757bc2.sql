
-- Fix March 2026: mark parents as is_group since they have children
UPDATE checklist_instances 
SET is_group = true 
WHERE mes = 3 AND ano = 2026 AND id IN (
  '1a705f11-0677-4d8f-9226-e784f0ac2201',
  'fb3f7817-4ec4-449a-a4e0-b41937aabfc9',
  '556c9d67-58fb-426e-927b-0bcebdfa54db',
  'b58ca781-61d1-498a-8484-b818887cb008',
  '4741b0bd-c802-47c4-8323-8b00ba35cac9'
);
