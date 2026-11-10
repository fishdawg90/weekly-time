# Weekly

A compact, installable weekly timesheet. Monday–Friday across the top; reusable project/task rows down the side. No backend, dependencies, accounts or analytics. Choose Daylight, Warm Paper or Night in Appearance; all UI colours are controlled by semantic tokens in `docs/themes.css`. Project and timesheet rows stay on one line with shortened text and full details on hover.

## Publish with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/docs**, then **Save**.
4. Wait for GitHub's Pages deployment, then use the live link displayed there.

GitHub Pages for a private repository requires an eligible paid GitHub plan. The Pages website may still be publicly accessible even though the source repository is private. The app contains no embedded project list or timesheet records; your entries remain in your own browser. If Pages is unavailable for your plan, keep the repository private and host the static `docs/` directory with another static host.

## Install on Windows

Open the hosted HTTPS website in Edge or Chrome. Use the app's **Install app** button when shown, the browser's install icon, or the browser menu's install-as-app option. Pin the installed app to the taskbar. Workplace policies may restrict installation. The app still works in a normal browser window.

## Daily use

- The app opens on the current week. Add project/task records in **Projects**, then choose them in the timesheet dropdown.
- Hours save immediately on each valid edit. Decimal comma and decimal point work. Each cell accepts blank or 0–24 hours, with up to two decimals. Daily and weekly totals update immediately.
- Each project has a Type (Standard Pay, Annual Leave, Statutory Holiday, or a custom Type). Add Types from any Type dropdown or Appearance. Weekly rows store their own Type; change it directly on the row when needed.
- Add an existing project-code/task-code pair and choose **Update existing** or **Cancel**. The pair is matched without case or surrounding whitespace.
- Historical rows keep snapshots of their project name/codes. Library edits apply to new rows; use **Use updated library details** in an existing row's dropdown to update that row deliberately.
- Archive projects to hide them from new rows without losing history.
- **Reuse previous projects** copies the previous week's rows with blank hours.
- Use arrows or the date picker to view any week.

## Oracle export

**Copy for Oracle** prepares one row per populated project/task pair in the selected week. Blank hours become zero. All-empty and all-zero rows are omitted.

TSV columns are: `Project`, `Project code`, `Task`, `Type`, followed by five ISO dates (Monday–Friday). JSON schema:

```json
{
  "schemaVersion": 2,
  "weekStart": "2026-10-26",
  "dates": ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
  "rows": [{"projectName": "Example", "projectCode": "EXAMPLE", "taskCode": "TASK", "type": "Standard Pay", "hours": [7.5, 0, 0, 0, 0]}]
}
```

Download `docs/oracle-timesheet-bookmarks.html` using the link in the Oracle export dialog and import it through the browser bookmark manager. The new **Fill Oracle timesheet v3** bookmark supports both nine-column typed copies and older eight-column copies. It matches project + task + Type, uses safe blank rows for new combinations, waits at least three seconds for metadata changes, then verifies all weekday values twice. A same-code/task row with a different Type is left alone. The previous expenses proof of concept still accepts only one project/task pair. Nothing is automatically submitted to Oracle.

## Data and backups

All user data is stored under the stable `weekly-time:data:v1` localStorage key. It remains across code updates on the **same origin and browser profile**. No data is uploaded to GitHub. Another computer, phone, browser profile or hosting origin has separate data.

Schema-1 data is migrated in memory to schema 2, with all projects and historical rows defaulting to Standard Pay. IDs, codes, hours and weeks are preserved. Before the first new-format save, the original JSON is kept under `weekly-time:pre-type-migration:v1`; use **Download pre-update backup** in settings to retrieve it. Old backups can still be restored.

Use **Backups and app settings → Download full backup** regularly. Restore validates the file and asks before replacing local data. Browser clearing, profile removal or device loss can remove the only local copy. Moving the app to another host requires backup/restore. The service worker only caches application assets, not user data. Browser storage is subject to the normal security and retention of your work computer.

## Updates and offline use

Edit the files in `docs/` and push to `main`; GitHub Pages republishes them. Keep the URL and storage key stable. Increment the release query in HTML asset URLs, the model import, worker registration, and `ASSETS`/`VERSION` in `docs/sw.js` together whenever assets change. Versioned URLs keep old service workers from combining incompatible JavaScript with new HTML. An update banner appears after the new service worker installs. After the first complete online load, supported browsers can open the cached app offline. Browser policies and storage availability can limit offline/install features.

## Development and verification

Serve `docs/` through a static server. No build is needed. Run `npm test` (Node 18+). Tests cover week boundaries, hours, duplicate keys, history, backups, schema-1 migration, custom Types/themes, typed exports, the actual shipped bookmark parser/planner, and cached asset version consistency. Browser QA covers migration, old weeks, inline Type editing, theme persistence, custom Types, project creation and an end-to-end typed export/Oracle fixture with nested controls.

Implementation: plain HTML/CSS/JavaScript, web app manifest and service worker. `docs/model.mjs` contains the independent data model and export contract.


## Expenses

A separate installable app is available at **[Expenses](https://fishdawg90.github.io/weekly-time/expenses/)**. Source is in `docs/expenses/`; it uses a separate IndexedDB database and service worker scope. Timesheet storage is unchanged.

- Create arbitrary claim groups; capture photos, images, PDFs or pasted email/SMS text. Capture can remain incomplete.
- Crop and rotate photos, switch colour/greyscale/black-and-white, and adjust brightness, contrast and ink threshold. Original files are retained; edited images are separate JPEGs.
- Review receipt and details together; completion requires valid date, positive amount, currency, exact Oracle reference, description and evidence (or an explicit no-receipt flag), plus a manual check.
- Install once online to cache the app for offline use. Android share-target support receives files/text into Inbox when supported by the originating app.
- Local-only data does not automatically sync between phone and PC. Export full backups regularly. A group ZIP contains numbered original/enhanced evidence, summary.html, summary.tsv, oracle.txt and restore.json. Extract restore.json and import it on another device. Existing expense IDs are never silently overwritten.
- Share the ZIP through the native share sheet if supported, or download and attach it manually to email. Sending is always manual. No automatic email forwarding, OCR/LLM extraction or cloud storage is configured.
- The separate Oracle expense bookmark can be dragged from the pack dialog. Calibrate Date, Amount and Reference on the same Oracle row, with optional Currency/Description. It only fills blank dated/valued rows, waits three seconds after changes and verifies twice. Exact compatibility with a particular Oracle layout needs live calibration; project allocation and Save/Submit remain manual. Native PDF preview varies by browser; download original is also available.

`npm test` includes expense validation, backup merge, currency totals, crop/filter, ZIP and offline-shell checks. Keep all expense runtime query versions and its service-worker cache name in sync when releasing asset updates. `bookmark-source.js` is the readable source for the URL encoded in `oracle-bookmark.mjs`.
