# N3 App Store acceptance

- Production authentication is Path A only: launch with `?token=<JWT>`, store it under `qne_access_token`, then remove it from the URL.
- Business API calls must use same-origin `/api/...` routes. The server forwards the caller's `Authorization: Bearer <JWT>` to QNE Open API.
- QNE company identity comes from the authenticated session and `/api/companyprofile/basic-info`, never from a client-supplied tenant id.
- This app has no app-owned business data store; invoice data is read live from QNE.
- Local username/password login is development-only and must not be enabled in production.
