# How to Run Locally, Host Online, & Sync Your Calendar

This guide covers how to run **Calen** on your laptop server, expose it over an HTTPS tunnel, keep your database seamlessly synchronized between `localhost`, the `https` tunnel, and your phone's offline cache, and your options for enabling Google Login when ready.

---

## 1. Commands to Run Locally & Host Online

### Option A: Two Terminals (Recommended)

#### Terminal 1 — Start the Local Server & Database (`vite`)
```powershell
npm run dev
```
- **Local URL**: `http://localhost:3000/` (or `http://localhost:3001/` if `3000` is occupied)
- **Local Wi-Fi URL**: `http://<your-lan-ip>:3000/`
- **Local Database**: Automatically persists all tasks, Moodle courses, Classroom courses, and settings to `data/workspace-db.json` on your laptop.

#### Terminal 2 — Expose to the Internet (Public HTTPS Tunnel)
```powershell
npm run tunnel
```
*(Or run the raw SSH command directly; replace `3000` with `3001` if Vite used port `3001`)*:
```powershell
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:3000 nokey@localhost.run
```

### Option B: Single-Line PowerShell Command (Both at Once)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"; Start-Sleep -Seconds 3; npm run tunnel
```

---

## 2. How Seamless Database & Offline Sync Works

Previously, browser `localStorage` was isolated per domain (`http://localhost:3000` vs `https://<id>.lhr.life`), meaning tasks added on `localhost` wouldn't appear on the tunnel URL.

Now, **Calen** uses a **3-Layer Hybrid Sync Architecture** built into [`vite.config.js`](file:///D:/Projects_26/CALEN/vite.config.js):

1. **Shared Laptop Database (`data/workspace-db.json` via `/api/workspace`)**:
   - Both `http://localhost:3000` and `https://<tunnel>.lhr.life` read and write to the same `data/workspace-db.json` file on your laptop.
   - Real-time **Server-Sent Events (`/api/events`)** push updates instantly between your laptop browser and your phone browser over the HTTPS tunnel.
2. **Automatic Offline Cache When You Are Out (`localStorage`)**:
   - Every time you open the HTTPS tunnel on your phone or laptop, the browser caches the latest database state and `updatedAt` timestamp in `localStorage`.
   - When you are **out and away** (even if your laptop is asleep or unreachable), opening the page still shows all your calendar data from the device cache. Any changes you make offline are automatically pushed to `data/workspace-db.json` the moment you reconnect.
3. **Native Phone Calendar Subscription (`/api/calendar.ics`)**:
   - Your server hosts a live iCalendar feed at `https://<your-tunnel>/api/calendar.ics` (and a **Download `.ics`** button inside the Google Calendar modal).
   - You can add this URL to **Google Calendar** (*Settings → Add calendar → From URL*) or **Apple Calendar / Outlook** on your phone so your deadlines live natively inside your phone's calendar app 24/7.

---

## 3. Syncing Moodle, Google Classroom, & Google Calendar (Without Google Login)

While **Sign in with Google** is disabled for now, all three platforms are fully functional through server-side proxies (`/api/proxy/ical`, `/api/proxy/moodle`, `/api/proxy/classroom`) that bypass browser CORS restrictions:

### Moodle LMS (`Settings → Moodle LMS → Manage Courses`)
- **Live Moodle iCal (`.ics`) URL (Recommended)**: In Moodle, go to *Calendar → Export calendar → Get calendar URL*, paste that URL into **Sync Live Moodle Calendar iCal (.ics) URL**, and click **Sync iCal URL**.
- **Moodle REST API**: Enter your school's Moodle URL and your Moodle Mobile WebService Token (*Preferences → Security keys*) and click **Fetch API** to pull enrolled courses and assignments directly.
- **Course Checklist & Raw `.ics`**: Toggle enrolled courses or paste raw `.ics` text.

### Google Classroom (`Settings → Google Classroom → Manage Classes`)
- **Classroom Calendar iCal (`.ics`) URL**: Every Google Classroom class automatically creates a calendar inside your Google Calendar. In Google Calendar, open *Settings for that class calendar → Integrate calendar → Secret address in iCal format*, paste it into **Import Google Classroom Calendar iCal (.ics) URL**, and click **Sync Classroom iCal**.
- **Google Classroom API Token**: Paste an OAuth Bearer token with `classroom.courses.readonly` and `classroom.coursework.me.readonly` scopes and click **Fetch API** to pull live classes and coursework.

### Google Calendar (`Settings → Google Calendar → Sync Calendar`)
- **Import from Google Calendar (`.ics`)**: In Google Calendar (*Settings → Settings for my calendars → Integrate calendar*), copy your **Secret address in iCal format** (`https://calendar.google.com/calendar/ical/.../basic.ics`), paste it into **Import from Google Calendar Secret iCal (.ics) Address**, and click **Sync iCal Feed**.
- **Export / Subscribe to Calen Deadlines**: Copy the `/api/calendar.ics` feed URL or click **Download `.ics`**.
- **Direct Two-Way REST API (Optional)**: Paste an in-memory Google OAuth Bearer token (`ya29...`) into the token field to use **Import Upcoming Events** and **Push Pending Deadlines** directly.

---

## 4. Options to Enable "Login with Google" on Your Laptop Server

Currently, `GOOGLE_LOGIN_ENABLED` is set to `false` in [`src/firebase.js`](file:///D:/Projects_26/CALEN/src/firebase.js#L25). When you are ready to turn Google Login back on for your laptop server, here are your **4 best options**:

### Option 1: Static Tunnel Domain + Firebase Authorized Domains (Easiest)
Why Firebase Google Sign-In fails on `nokey@localhost.run` is that the random `*.lhr.life` subdomain changes periodically, and Firebase requires the domain to be whitelisted.
1. Use a **free static tunnel domain**:
   - **Ngrok Free Static Domain**: Claim your 1 free static domain in the ngrok dashboard (`your-name.ngrok-free.app`) and run `ngrok http --url=your-name.ngrok-free.app 3000`.
   - **Tailscale Funnel** or **Cloudflare Tunnel (`cloudflared`)**: Gives you a permanent `https://...` hostname.
2. Add that single static domain under **Firebase Console → Authentication → Settings → Authorized domains**.
3. Set `GOOGLE_LOGIN_ENABLED = true` in [`src/firebase.js`](file:///D:/Projects_26/CALEN/src/firebase.js#L25).

### Option 2: Server-Side Google OAuth2 + Refresh Token on the Laptop (Best for Personal Single-User Server)
Since the Vite/Node server runs on your laptop (`http://localhost:3000`), your laptop *is* an authorized redirect origin (`http://localhost:3000/api/auth/google/callback`)!
- You log in with Google **once** on `http://localhost:3000` on your laptop.
- The laptop server stores your **Google OAuth Refresh Token** locally in `data/google-tokens.json` (never exposed to the browser) and automatically refreshes your Google Calendar & Google Classroom access tokens in the background.
- When you open `https://<any-tunnel>.lhr.life` on your phone, the laptop server performs the Google Calendar & Classroom syncs on your behalf without your phone ever needing a Google Login popup!

### Option 3: SSH Key with `localhost.run` (Semi-Permanent Domain)
- Generate an SSH key on your laptop (`ssh-keygen -t ed25519`) and register it at `https://admin.localhost.run/`.
- `localhost.run` will assign you a **sticky subdomain** instead of rotating it every 10 minutes, which you can then add to Firebase's Authorized Domains.

### Option 4: Google OAuth Playground Token (Quick Testing)
- Generate a token at [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) with the `calendar.events` and `classroom.courses.readonly` scopes and paste it into the in-memory token field inside the Google Calendar or Google Classroom modal.
