# Sign-in Module

Calen's sign-in lives in `src/auth/`. The app talks to one facade, the facade
talks to connectors, and the server publishes which connectors a deployment
supports. No provider SDK is referenced from `src/app.js`, and no client secret
exists anywhere in the project.

## Layers

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| Facade | `src/auth/index.js` | Session lifecycle, connector selection, token access. The only module `app.js` imports for auth. |
| Session state | `src/auth/session.js` | Pure reducer (`reduceSession`), freshness checks, human-readable status. No DOM, no network. Unit-tested. |
| Configuration | `src/auth/config.js` | Reads `/api/auth/providers`, falls back to `VITE_*` vars for static builds. |
| Connector: Firebase | `src/auth/connectors/firebase.js` | Google sign-in through Firebase Auth (also yields the Firestore identity). |
| Connector: browser OAuth | `src/auth/connectors/google-gis.js` | Google Identity Services token client, public client id only. |
| Shared scopes | `src/auth/scopes.js` | Scope list used by both the connectors and the server. |
| Shared HTTP | `src/api.js` | `apiUrl()` / `apiFetch()` with the optional workspace token. |
| Firebase bootstrap | `src/firebase-app.js` | Single `initializeApp`, exports `db` and `auth`. |
| Cloud helpers | `src/firebase.js` | Firestore CRUD and Google Calendar REST. Imports the token from the facade. |

Dependency direction is strictly `app → auth → connectors → firebase-app` and
`app → firebase → auth` (token reads only). There is no import cycle.

## Session model

```text
status: signed-out | authenticating | signed-in | needs-reauth | error
token:      Google access token (memory only, never written to storage)
expiresAt:  epoch ms, defaulted to 55 minutes when the provider omits it
user:       { uid, email, displayName, photoURL } — display identity
cloudUser:  Firebase Auth user, only when the Firebase connector signed in
```

`cloudUser` is the only identity Firestore rules accept. A browser-OAuth session
has a token and a profile but no `cloudUser`, so cloud task sync stays off while
Calendar import/push still works. `app.js` mirrors this into
`state.user` (cloud identity), `state.hasGcalToken` (token present) and
`state.auth` (status/error/email) for synchronous rendering.

Tokens are considered stale 60 seconds before `expiresAt`. `ensureAccessToken()`
tries a silent refresh (`google-gis` only), then an interactive sign-in, and
otherwise throws an error with `code = 'NEEDS_AUTH'`. A Google `401`/`403`
from the Calendar helpers calls `invalidateAccessToken()`.

## Connector contract

```js
{
  id, label,
  isSupported({ clientId }) -> boolean,
  signIn({ clientId, scopes }) -> { accessToken, expiresAt, user?, cloudUser? },
  refresh({ clientId, scopes }) -> result | null,   // optional
  signOut() -> Promise<void>,
  onAuthStateChanged(cb) -> unsubscribe,            // optional (Firebase)
  fetchProfile(accessToken) -> profile | null       // optional fallback
}
```

`signIn()` walks the connector order published by the server. An error with
`code: 'unavailable'` (provider disabled, popup blocked, origin not authorized)
or `'failed'` falls through to the next connector; `'cancelled'` stops and
reports. A failed or cancelled retry keeps an access token that is still valid.

## Server API

All routes live in `vite.config.js` and are unavailable in a static `dist/`
build (the client then falls back to `VITE_GOOGLE_CLIENT_ID`).

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/auth/providers` | GET | Connector order, public client id, scopes, verify/sign-out paths. |
| `/api/auth/google/verify` | POST | Exchanges an access token for a verified profile via Google `tokeninfo`; rejects tokens minted for another client. |
| `/api/auth/signout` | POST | Acknowledgement only — sessions are stateless and memory-only. |

The access token is never logged, never written to `data/`, and never stored in
`localStorage`/`sessionStorage`.

## Configuration

| Setting | Where | Effect |
| :--- | :--- | :--- |
| `oAuthClientId` | `firebase-applet-config.json` | Default public client id for the browser connector. |
| `GOOGLE_OAUTH_CLIENT_ID` | server env | Overrides the client id (and gates the browser connector). |
| `CALEN_AUTH_CONNECTORS` | server env | Ordered connector list, default `firebase,google-gis`. |
| `VITE_GOOGLE_CLIENT_ID` | build env | Client id for static deployments without the API. |
| `VITE_GOOGLE_OAUTH_SCOPES` | build env | Scope override for static deployments. |
| `VITE_DISABLE_FIREBASE_AUTH` | build env | `true` forces the browser OAuth connector only. |

`GOOGLE_OAUTH_CLIENT_SECRET` is deliberately unused: every connector obtains
tokens in the browser, so no server-side secret or refresh token exists.

## Provider setup checklist

1. **Firebase connector** — Firebase Console → Authentication → Google enabled;
   `localhost` (or the deployed domain) listed under Authorized domains.
2. **Browser OAuth connector** — Google Cloud Console → Credentials → the OAuth
   client → add the app origin to *Authorized JavaScript origins*. Without this,
   Google returns `origin_mismatch`, which the connector reports as actionable.
3. **Scopes** — Calendar API and Classroom API enabled; consent screen allows
   `calendar.events`, `classroom.courses.readonly`,
   `classroom.coursework.me.readonly`.

## Tests

`node --test tests/auth.test.js` covers the session reducer: status transitions,
profile normalisation, expiry skew, token preservation on cancellation, and
sign-out. Browser-driven flows (popup, token exchange) are not automated.
