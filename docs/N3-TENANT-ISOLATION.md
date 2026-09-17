# N3 tenant isolation

Sales Invoice Dashboard is a read-only proxy over QNE Open API and does not create an app-owned database, file store, cache, or queue. Its `dataStores` acceptance inventory is therefore `kind: none`.

The browser stores only the Path A session JWT under `qne_access_token`; this is authentication state, not business data. Every QNE request is sent through a same-origin route with the caller's bearer token. Company identity is refreshed from `/api/companyprofile/BasicInfo`, and the returned `tenantCode` is the session source of truth. No client-supplied tenant id is accepted.

List calls use bounded `$skip` and `$top` values and consume `data.value` and `data.count`. There are no nested app tenants, server-side tenant caches, reporting endpoints, or app-owned writes.
