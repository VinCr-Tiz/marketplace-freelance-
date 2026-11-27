# Jira task breakdown (MVP)

Ready to copy into the KAN Jira board. Assignee for all tasks: **Arvin Mohammadi**. Status: **Done** (implemented in this repository).

| Key (suggested) | Title | Description | Acceptance criteria |
|---|---|---|---|
| MV-1 | Authentication API and UI | Login/signup with argon2 hashing, show/hide password, generic auth errors, session persistence and logout | Invalid credentials return one generic message; password is never stored in plain text; `/api/auth/me` restores session |
| MV-2 | Password recovery with rate limiting | Single-use, 15-minute reset links; 429 responses for brute-force attempts on login and forgot-password | Reused/expired token rejected; sixth login attempt returns 429 |
| MV-3 | Projects listing, search and filters | Show only Open projects from DB; search by title/description; filter by real categories; empty state | Filter values come from `categories`; no results shows a friendly message |
| MV-4 | Project details page | Full description, employer public info, categories, skills, pricing, deadline, status | Non-owner cannot see non-open projects unless they submitted a proposal |
| MV-5 | Create/edit project form | Frontend and backend validation, dynamic pricing field, Draft and Open statuses, owner-only edit | Budget must be positive; draft can be published; non-owner gets 403 |
| MV-6 | My projects dashboard | List own projects with statuses, proposal counts, edit/publish/review actions | Counts come from DB; only owner sees them |
| MV-7 | Submit proposal | One proposal per user/project, no self-bidding, Open-only, Pending status, amount and time validation | Withdrawn proposals still block resubmission; admin cannot bid |
| MV-8 | My proposals and withdraw | List submitted proposals with status and project link; withdraw only Pending | Accepted proposals cannot be withdrawn |
| MV-9 | Review and accept proposals | Owner-only list with freelancer info; accept/reject Pending; atomic state changes | One Accepted per project; project becomes In Progress; other Pending become Rejected |
| MV-10 | User profile | View/edit name, email, professional title, bio, location and skills using existing profile tables | Data stored in `users`, `profiles_user`, `user_skills` |
| MV-11 | RTL responsive UI and feedback | Persian RTL menu, labels, loading states, empty states, success/error alerts, duplicate-submit prevention, 360–1920px | All pages reachable from main menu; forms keyboard accessible |
| MV-12 | DB migration, seed and automated smoke test | Document schema additions; provide demo data and `npm test` API coverage | Migration applies cleanly; smoke test passes and cleans up temporary records |

The GitHub repository should receive these as meaningful commits (e.g. one commit per group MV-1/2, MV-3/4/5/6, MV-7/8/9, MV-10/11/12) before submission.
