# Weekly

A compact, installable weekly timesheet. Monday–Friday across the top; reusable project/task rows down the side. No backend, dependencies, accounts or analytics.

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
- Add an existing project-code/task-code pair and choose **Update existing** or **Cancel**. The pair is matched without case or surrounding whitespace.
- Historical rows keep snapshots of their project name/codes. Library edits apply to new rows; use **Use updated library details** in an existing row's dropdown to update that row deliberately.
- Archive projects to hide them from new rows without losing history.
- **Reuse previous projects** copies the previous week's rows with blank hours.
- Use arrows or the date picker to view any week.

## Oracle export

**Copy for Oracle** prepares one row per populated project/task pair in the selected week. Blank hours become zero. All-empty and all-zero rows are omitted.

TSV columns are: `Project`, `Project code`, `Task`, followed by five ISO dates (Monday–Friday). JSON schema:

```json
{
  "schemaVersion": 1,
  "weekStart": "2026-10-26",
  "dates": ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
  "rows": [{"projectName": "Example", "projectCode": "EXAMPLE", "taskCode": "TASK", "hours": [7.5, 0, 0, 0, 0]}]
}
```

This export is ready for a future timesheet-specific bookmarklet. The previous expenses proof of concept accepts a single project/task pair and does not yet import weekly files. Nothing is automatically submitted to Oracle.

## Data and backups

All user data is stored under the stable `weekly-time:data:v1` localStorage key. It remains across code updates on the **same origin and browser profile**. No data is uploaded to GitHub. Another computer, phone, browser profile or hosting origin has separate data.

Use **Backups and app settings → Download full backup** regularly. Restore validates the file and asks before replacing local data. Browser clearing, profile removal or device loss can remove the only local copy. Moving the app to another host requires backup/restore. The service worker only caches application assets, not user data. Browser storage is subject to the normal security and retention of your work computer.

## Updates and offline use

Edit the files in `docs/` and push to `main`; GitHub Pages republishes them. Keep the URL and storage key stable. Increment `VERSION` in `docs/sw.js` whenever assets change. An update banner appears after the new service worker installs. After the first complete online load, supported browsers can open the cached app offline. Browser policies and storage availability can limit offline/install features.

## Development and verification

Serve `docs/` through a static server. No build is needed. Run `npm test` (Node 18+). Tests cover week boundaries, hour validation, duplicate project keys, historical snapshots, backup validation and Oracle exports. Browser QA covers project creation, duplicate update, saving across reload, week reuse and export.

Implementation: plain HTML/CSS/JavaScript, web app manifest and service worker. `docs/model.mjs` contains the independent data model and export contract.
