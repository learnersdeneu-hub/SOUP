-- /services/accommodation had zero ACCOMMODATION partner rows in the
-- database -- the page was silently showing its "no active online partner
-- route is configured yet" empty state to every student. SOUP is a real
-- partner of AmberStudent (already referenced as a homepage-only fallback
-- constant in src/app/page.tsx's CONFIRMED_SERVICE_PARTNERS, but never
-- actually seeded into the partners table this page queries). Adds the
-- real row plus a few verified European listings in publicMetadata.inventory
-- (an existing convention ServicePartnerDirectory.tsx already knows how to
-- render) sourced live from amberstudent.com (research date 2026-10-05).
-- Kept deliberately short (4 cities) -- the page's own "Continue with
-- partner" button still links through to Amber directly for everything else.

INSERT INTO partners ("id", "type", "name", "slug", "status", "country", "websiteUrl", "internalPriority", "publicMetadata", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'ACCOMMODATION',
  'AmberStudent',
  'amberstudent',
  'ACTIVE',
  'Europe',
  'https://amberstudent.com/',
  10,
  '{
    "logoUrl": "https://prod-static-assets.amberstudent.com/images/amber.svg",
    "inventory": [
      {"title": "Chapter Kings Cross", "city": "London, UK", "area": "N1 9JP, Pentonville Rd", "price": "From £368/week", "availability": "Twin Studio to Platinum Studio"},
      {"title": "Yugo Ardcairn House", "city": "Dublin, Ireland", "area": "Grangegorman Lower, D07", "price": "From €326/week", "availability": "All-bills-included · Classic En Suite to Studio"},
      {"title": "The FIZZ Berlin", "city": "Berlin, Germany", "area": "Köpenicker Str. 43, 10179", "price": "From €838/month", "availability": "Single Studio to Single Plus Studio"},
      {"title": "Nido Príncipe Pío", "city": "Madrid, Spain", "area": "Paseo de la Florida 5, 28008", "price": "From €262/week", "availability": "12 room types · Non-Ensuite to full Studio"}
    ]
  }'::jsonb,
  now(), now()
)
ON CONFLICT ("slug") DO UPDATE SET "status" = EXCLUDED."status", "websiteUrl" = EXCLUDED."websiteUrl", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
