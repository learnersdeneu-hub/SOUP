# SOUP migration baseline

SOUP inherits the mature GCI engineering schema as its foundation, then adds the SOUP student-journey domain through additive migrations. The inherited baseline includes models that support the reused Resume, documents, authentication, audit and conversation architecture even where GCI-specific product surfaces are disabled.

## New SOUP database — expected path

SOUP must use a separate PostgreSQL/Supabase database from GCI. On a brand-new empty SOUP database, after validating the connection and reviewing status, apply the repository migration history in order:

```powershell
npm.cmd run prisma:status:local
npm.cmd run prisma:deploy:local
npm.cmd run seed
npm.cmd run seed:soup-partners
```

The baseline runs first; later migrations add the reused customer workspace and the SOUP Student Case, Partner, University/Program, Application Plan, Application, Journey Checklist and Service Referral models.

## Existing/non-empty database

Do not point SOUP at a live GCI database and do not use `prisma migrate resolve` as a shortcut unless you are deliberately reconciling a known SOUP database whose actual schema has already been inspected. If migration history and schema disagree, compare them before resolving anything.

## Seed scope

`npm run seed` retains idempotent lookup data needed by inherited GCI-derived foundation modules such as Resume/document/credential infrastructure.

`npm run seed:soup-partners` imports the SOUP partner/program subset supplied with the Replit prototype and seeds the launch insurance transaction partner. The included CSV is not the authoritative 1,500+ partner network; load the full approved partner dataset separately through the same production models.
