# AFO Grade Reporting (demo)

A clickable demo of a site that replaces the "Automated Grade Report" Google
Sheet for Agua Fria Online, with a built-in **transcript check**.
**Every student, staff member and email address is fictional.** Emails use the
reserved `.example` domain. Nothing is ever sent: send buttons open a preview
instead.

## What it shows

Use **Signed in as** at the top to switch people:

- **Owner / AFO admins.** Everyone at AFO is an admin; only the owner can change other admins.
  - **Dashboard:** "Are the grades on transcripts?" Reports fully on transcript, waiting, overdue or different, average days from send to transcript, and a breakdown by home campus.
  - **Enter grades:** student ID fills in name, grade and home campus (Synergy in the real app). Course, teacher, grade, weighting and completion date are pick lists; weighting is always the user's choice.
  - **Today's queue:** editable until the 6:00 AM send. Courses for the same student on the same day become one report, emailed from a no-reply address with replies going to whoever entered it.
  - **All reports:** filter by transcript status or campus; open any report for its history, the email the registrar got, or to send a correction.
  - **Transcript check:** the daily scan of Synergy credit history, with overdue reports grouped by campus (and a reminder email to that registrar), grades or credits that differ from the report, and a log of each scan.
  - **Registrar view:** see any campus exactly as its registrar does.
  - **Admin:** users and roles, campus routing and CC lists, the course list (with a Synergy code for matching), teachers, and an activity log.
- **Registrars (one per campus).** Reports from AFO for their campus, in their campus colors: not on transcript yet / needs attention / on transcript. They never have to mark anything done; entering the grade in Synergy is enough. They can flag a problem back to AFO.

## How the transcript check decides

| Status | Meaning |
|---|---|
| On transcript | Every course found; grade and credits match |
| Partly on transcript | Some courses found, others not yet |
| Waiting | Sent 10 days ago or less, nothing found yet |
| Not on transcript | More than 10 days and still missing |
| Transcript differs | Found, but grade or credits differ from the report |

Courses are matched by student ID + course code, and only grades posted after the report was sent count.

## Running it

Static files only. Serve the folder with any static server, for example:

```
python -m http.server 8000
```

`js/data.js` builds the fictional data and simulated transcript results; `js/app.js` is the whole UI.
