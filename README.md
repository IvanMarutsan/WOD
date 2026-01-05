# What's on DK?

## Local development

- npm i && npm run dev

## Tests

- Run locally:
  - npm i
  - npx playwright install
  - npm run test:e2e
- Open report:
  - npm run test:e2e:report

## Deployment (Netlify)

- Set the GitHub secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` in the repository settings.

## Admin access (Netlify Identity)

- Enable Identity in the Netlify site dashboard.
- Set registration to invite-only.
- Create users and add roles in Identity:
  - `admin` for moderation.
  - `super_admin` for access to rejected events and full moderation view.
- Use `admin-login.html` to sign in. Users without roles will be denied.

## Moderation storage (Netlify Blobs)

- Moderation events and audit logs are stored in Netlify Blobs under the `wod-admin` store.
- Use `netlify dev` if you need local Functions with Blobs support.

### Retention settings (optional env vars)

- `WOD_APPROVED_TTL_DAYS` (default: 180)
- `WOD_REJECTED_TTL_DAYS` (default: 30)
- `WOD_PENDING_TTL_DAYS` (default: 30)
- `WOD_AUDIT_TTL_DAYS` (default: 180)
- `WOD_MAX_EVENTS` (default: 500)
- `WOD_MAX_AUDIT` (default: 1000)
