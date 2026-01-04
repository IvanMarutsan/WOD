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
