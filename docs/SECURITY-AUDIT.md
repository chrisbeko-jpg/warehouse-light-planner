# Security audit — ledpaneel.nl (warehouse-light-planner)

Date: 2025-11-06 (snapshot before hardening PR)

## Summary

This document lists findings from code review of public forms, API routes, internal CMS, and uploads. Severities: **Critical**, **High**, **Medium**, **Low**.

## Findings (pre-remediation)

| ID | Area | Severity | Issue |
|----|------|----------|--------|
| F1 | Public APIs (`/api/ai-calculator`, `/api/public-leads`) | **High** | No bot protection (Turnstile), no rate limiting, minimal server-side schema; spam/DoS via email Cost. |
| F2 | Internal auth | **High** | Admin token stored in **non-HttpOnly** cookie (`internal_admin_token`); XSS could exfiltrate token. |
| F3 | Internal APIs | **Medium** | `verifyInternalToken` only checked `Authorization` header; browser pages using cookie did not send Bearer until fixed. |
| F4 | `send-lightplan-request` (if used) | **Medium** | Weak validation, returns raw error message; no spam controls. |
| F5 | Public lead POST body | **Medium** | Large JSON (floorplan data URLs) without explicit size cap; abuse risk. |
| F6 | Security headers | **Low** | No global CSP / HSTS / Referrer-Policy in `next.config`. |
| F7 | Dependencies | **Info** | `npm audit` reports vulnerabilities; triage separately (no blind `--force`). |

## Mitigations implemented

- Cloudflare Turnstile server verification + invisible widget on AI calculator and wizard lead forms (enforced when **both** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set; dev/preview without keys still accepts submissions).
- Honeypot field on public forms; silent 204 on trigger.
- Upstash Redis sliding-window rate limits (fallback: in-memory per instance) with HTTP 429.
- Zod strict schemas, max lengths, URL/email/phone checks on server.
- HttpOnly `internal_admin_session` cookie via `/api/auth/internal-session`; middleware timing-safe compare.
- Request body size limits on public POST handlers.
- Security headers via `next.config.ts` (CSP allows Turnstile, Vercel Blob, self).

## Remaining / manual

- Enable **Vercel Firewall / bot protection** in project dashboard; align limits with app rate limits.
- Create **Upstash Redis** (Vercel integration), set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Create **Turnstile** site + secret; set env vars on Production and Preview.
- MFA: current model is single long-lived shared token; consider Vercel SSO or external IdP for stricter B2B.

## Environment variables (reference)

| Variable | Purpose |
|----------|---------|
| `TURNSTILE_SECRET_KEY` | Server Turnstile verify |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client widget |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limit |
| `INTERNAL_ADMIN_TOKEN` | CMS / internal API |
| `RATE_LIMIT_*` | Optional overrides (see `lib/security/rate-limit.ts`) |
