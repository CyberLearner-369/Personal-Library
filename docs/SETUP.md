# Google setup — Sheet, Apps Script & Sign-In

One-time setup, roughly 15 minutes. At the end you will have two values:

1. an **Apps Script web app URL** (ends in `/exec`) — the backend
2. a **Google OAuth client ID** (ends in `.apps.googleusercontent.com`) — for sign-in

Paste both into the app's **Settings** page (or into `.env.local` / GitHub secrets).

---

## Part A — The spreadsheet & backend

1. Go to [sheets.new](https://sheets.new) and create a blank spreadsheet. Name it
   something like `Personal Library`. This file *is* your database.
2. In the sheet, open **Extensions → Apps Script**. Delete the placeholder code and
   paste the entire contents of [`backend/Code.gs`](../backend/Code.gs). Save
   (Ctrl/Cmd + S) and name the project `Library Backend`.
3. *(Recommended)* In the editor's **Project Settings** (gear icon), tick **“Show
   ‘appsscript.json’ manifest file in editor”**, open it and replace its contents with
   [`backend/appsscript.json`](../backend/appsscript.json). This pins the timezone and
   the exact permission scopes.
4. Still in **Project Settings**, scroll to **Script Properties** and add:

   | Property | Value |
   | --- | --- |
   | `OWNER_EMAILS` | your Gmail address (comma-separate several to allow family members) |
   | `GOOGLE_CLIENT_ID` | leave blank for now — filled in after Part B |

5. Back in the editor, select the **`setup`** function in the toolbar dropdown and
   press **Run**. Google will ask you to authorize the script (it needs access to this
   spreadsheet, Drive for backups, and outbound requests to verify sign-ins). Approve
   it. The execution log should end with “Setup complete”.
6. *(Recommended)* Run **`installDailyBackup`** once. Every night between 3–4 AM a
   copy of the spreadsheet lands in a Drive folder called *Personal Library Manager
   Backups*; the newest 30 copies are kept.
7. Click **Deploy → New deployment**. Choose type **Web app** and set:

   | Setting | Value |
   | --- | --- |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

> **Why “Anyone”?** That setting only controls who can *reach* the endpoint. Every
> request must still carry a Google ID token that the script verifies against your
> `GOOGLE_CLIENT_ID` and `OWNER_EMAILS` before touching the sheet. Requests without a
> valid, allow-listed identity are rejected. Apps Script cannot answer CORS preflight
> requests, which is also why the app sends JSON as `text/plain` — a “simple request”
> that needs no preflight.

> **Updating the backend later:** use **Deploy → Manage deployments → ✏️ Edit → New
> version** on the *existing* deployment. Creating a brand-new deployment changes the
> URL and you would have to update Settings.

---

## Part B — The OAuth client (sign-in)

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a new
   project (any name, e.g. `library-manager`).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app
   name and your email, save through the steps. You may leave the app in **Testing**
   mode — just add your own Google account under **Test users**. (Publishing is only
   needed if more than 100 users will sign in, which is not this app.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins** — add every origin the app runs on:
     - `http://localhost:5173` (development)
     - `https://<your-github-username>.github.io` (production)
   - No redirect URIs are needed (Google Identity Services buttons don't use them).
4. Copy the **Client ID**.
5. Return to the Apps Script **Script Properties** (Part A, step 4) and set
   `GOOGLE_CLIENT_ID` to this value. The backend uses it to check that sign-in tokens
   were issued for *this* app and no other.

---

## Part C — Connect the app

Choose either (or both — Settings wins):

**In the app:** open **Settings → Google Sheets connection**, paste the `/exec` URL
and the client ID, **Save connection**, then sign in with Google below and press
**Test connection**. You should see “Connected — the sheet holds 0 book(s).”

**At build time:** copy `.env.example` to `.env.local` and fill both values, or add
them as repository secrets `VITE_APPS_SCRIPT_URL` and `VITE_GOOGLE_CLIENT_ID` for the
deploy workflow ([docs/DEPLOYMENT.md](DEPLOYMENT.md)).

---

## Troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| “This Google account is not allowed to use this library” | The signed-in email isn't in `OWNER_EMAILS`. Check for typos; values are case-insensitive and comma-separated. |
| “Sign-in token was issued for a different app” | `GOOGLE_CLIENT_ID` in Script Properties doesn't match the client ID in the app's Settings. They must be identical. |
| Google button shows `origin_mismatch` / doesn't render | The current origin isn't listed under *Authorized JavaScript origins* — add it exactly (scheme + host, no path, no trailing slash). |
| “Backend is not configured …” | Script Properties are missing — Part A step 4 and Part B step 5. |
| “Unexpected response — check the Apps Script deployment URL” | The URL isn't the `/exec` web-app URL, or the deployment's access isn't **Anyone**, or you copied the `/dev` URL. |
| Changes to `Code.gs` don't take effect | You edited the code but didn't publish a **new version** of the existing deployment. |
| ISBNs lose leading zeros in the sheet | Only possible for rows written by hand. The backend forces every cell to plain-text format; avoid editing rows manually, or format the column as *Plain text* first. |
