# Public LED wizard (ledpaneel.nl)

## Required environment variables (production)

```
INTERNAL_ADMIN_TOKEN=your-secure-token
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
LEAD_STORAGE_DIR=/tmp/leads
```

## URLs

- Public wizard: `/wizard` or `https://ledpaneel.nl/` (domain rewrite)
- Internal leads: `/internal/aanvragen` (requires admin token login)

## Architecture

Single Next.js app (`warehouse-light-planner`) with:

- `lib/public-wizard/*` — products, lumen calculation (reuses `height-factor`), polygon placement, heatmap (Gaussian model from warehouse engine pattern), pricing, lead storage
- `components/public-wizard/*` — 6-step customer wizard UI
- `app/api/public-leads` — lead submission, PDF package, email to info@lightsale.nl
- `app/api/internal/leads` — protected lead overview for Lightsale staff

Professional warehouse planner remains at `/` unchanged.
