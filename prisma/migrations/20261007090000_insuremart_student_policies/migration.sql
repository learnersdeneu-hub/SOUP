-- Populates the InsureMart partner row's publicMetadata.policies with the
-- real student travel/medical insurance plans SOUP is allowed to surface,
-- sourced directly from the four underlying insurers' own brochures
-- (Jubilee, Habib Insurance, TPL Insurance, Atlas Insurance -- all supplied
-- by the business owner, not scraped). Filtered to student-specific plans
-- only (Hajj/Umrah, domestic and general worldwide/Schengen plans from the
-- same brochures were excluded as not relevant to SOUP's student audience).
-- Figures kept exactly as published in each insurer's brochure.

UPDATE partners
SET "publicMetadata" = jsonb_set("publicMetadata", '{policies}', '[
    {"name": "Jubilee ViaCare - Student Bronze", "description": "USD 10,000 medical and hospitalization abroad, tuition fee cover up to USD 7,500, repatriation of mortal remains up to USD 5,000. 6 or 12 month terms.", "price": "From PKR 9,799 (6 months, without tuition fee)"},
    {"name": "Jubilee ViaCare - Student Silver", "description": "USD 25,000 medical and hospitalization abroad, tuition fee cover up to USD 10,000, repatriation up to USD 7,500.", "price": "From PKR 12,837 (6 months, without tuition fee)"},
    {"name": "Jubilee ViaCare - Student Gold", "description": "USD 50,000 medical and hospitalization abroad, tuition fee cover up to USD 20,000, repatriation up to USD 10,000.", "price": "From PKR 19,672 (6 months, without tuition fee)"},
    {"name": "Jubilee ViaCare - Student Platinum", "description": "USD 100,000 medical and hospitalization abroad, tuition fee cover up to USD 20,000, repatriation up to USD 12,500.", "price": "From PKR 34,195 (6 months, without tuition fee)"},
    {"name": "Habib Insurance - Student Visa Plan 1", "description": "USD 16,000 sum insured for a 6-month stay (USD 27,300 for 1 year); medical expenses and hospitalization abroad up to USD 50,000, repatriation of mortal remains up to USD 10,000.", "price": "PKR 16,640 (6 months) / PKR 28,392 (1 year)", "url": "https://www.habibinsurance.net/"},
    {"name": "Habib Insurance - Student Visa Plan 2", "description": "USD 23,000 sum insured for a 6-month stay (USD 39,100 for 1 year); medical expenses and hospitalization abroad up to USD 100,000, plus compassionate visitation benefits.", "price": "PKR 23,920 (6 months) / PKR 40,664 (1 year)", "url": "https://www.habibinsurance.net/"},
    {"name": "TPL Student Guard - Silver", "description": "USD 10,000 medical expenses abroad, repatriation of mortal remains up to USD 6,000, 24-hour personal accident cover up to USD 8,000.", "price": "From PKR 12,480 (6 months, without tuition fee)", "url": "https://www.tplinsurance.com/"},
    {"name": "TPL Student Guard - Gold", "description": "USD 25,000 medical expenses abroad, repatriation up to USD 8,000, 24-hour personal accident cover up to USD 10,000.", "price": "From PKR 15,765 (6 months, without tuition fee)", "url": "https://www.tplinsurance.com/"},
    {"name": "TPL Student Guard - Diamond", "description": "USD 50,000 medical expenses abroad, repatriation up to USD 10,000, 24-hour personal accident cover up to USD 15,000.", "price": "From PKR 24,635 (6 months, without tuition fee)", "url": "https://www.tplinsurance.com/"},
    {"name": "TPL Student Guard - Platinum", "description": "USD 100,000 medical expenses abroad, repatriation up to USD 12,500, 24-hour personal accident cover up to USD 25,000.", "price": "From PKR 44,020 (6 months, without tuition fee)", "url": "https://www.tplinsurance.com/"},
    {"name": "Atlas Insurance - Student Plan A", "description": "USD 10,000 medical, hospitalization and surgical expenses abroad; accidental death cover USD 2,500. Worldwide incl. USA, Canada, Japan and Australia available.", "price": "From PKR 19,386 (6 months, excluding USA/Canada/Japan/Australia)"},
    {"name": "Atlas Insurance - Student Plan B", "description": "USD 25,000 medical, hospitalization and surgical expenses abroad; accidental death cover USD 5,000.", "price": "From PKR 25,802 (6 months, excluding USA/Canada/Japan/Australia)"},
    {"name": "Atlas Insurance - Student Plan C", "description": "USD 50,000 medical, hospitalization and surgical expenses abroad; accidental death cover USD 7,000.", "price": "From PKR 32,256 (6 months, excluding USA/Canada/Japan/Australia)"}
  ]'::jsonb, true)
WHERE slug = 'hellenic-sun-insuremart';
