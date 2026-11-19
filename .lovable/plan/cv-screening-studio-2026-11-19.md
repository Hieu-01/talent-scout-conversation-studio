# CV Screening Studio

A private website for you and your invited teammates to upload many CVs, score them against a job and your own criteria, and manage them with an AI assistant. Everything is saved so you can return any time.

## Design
- **Login page** (from your image): full-screen flowing purple/indigo 3D wave background, a frosted-glass card in the center, rounded white inputs, show/hide password, "Remember me", "Forgot password", glowing pill Login button, Sign in / Register toggle.
- **Main app** (from your video): dark graphite canvas with soft spotlight glow, glass panels, thin light typography, electric-blue accents, small blue pill labels, white pill buttons, a slim left section list (Jobs / Candidates / Compare), and a slide-in glass comparison table with smooth motion.
- Interactions: animated page transitions, hover lift on cards, animated score rings, drag-and-drop upload area with live progress per file.

## Pages
1. **Login / Register / Reset password**
2. **Jobs** – create a job: title, job description, plus your criteria (must-have skills, nice-to-have skills, minimum years, location, education, languages, custom rules with weights).
3. **Job workspace**
   - Bulk upload PDF/Word CVs (drag in many at once).
   - AI reads each CV and pulls out name, contact, skills, experience, education, summary.
   - Each candidate gets a match score vs. the job description and a per-criterion breakdown (met / partial / missing) with short reasons.
   - Ranked list with filters (score range, criteria met, skills, years) and search.
   - Candidate detail panel: extracted info, original CV preview/download, editable fields, notes.
   - Compare mode: pick 2–4 candidates side-by-side in the glass table.
4. **AI Assistant** – chat panel docked on the right of every job workspace.
   - Ask anything: "Who are the top 5 for backend?", "Who has AWS and 3+ years?"
   - Command edits: "Change Anna's email to …", "Add Python to John's skills".
   - Delete candidates: always shows a confirm card before deleting.
   - Chat history saved per job, with multiple conversations you can reopen.
5. **Team** – you (owner) invite teammates by email and grant access; owner can remove access. Teammates share the same jobs and candidates.

## Saving
All jobs, candidates, CV files, scores, notes and chats are saved in Lovable Cloud automatically as you work.

## Technical details
- Lovable Cloud: email/password auth, `profiles`, `user_roles` (owner/member) via `has_role`, `jobs`, `candidates`, `chat_threads`, `chat_messages`; private `cvs` storage bucket; RLS limited to approved team members.
- CV text extraction server-side (PDF + DOCX), then Lovable AI structured extraction and scoring per file, processed in a queue so bulk uploads don't time out.
- Assistant: AI SDK streaming with tools (`search_candidates`, `get_candidate`, `update_candidate`, `delete_candidate` with approval), server functions using the signed-in user's permissions.
- Routes: `/auth`, `/reset-password`, `/_authenticated/jobs`, `/jobs/$jobId`, `/jobs/$jobId/chat/$threadId`, `/team`; `/` is a short landing redirecting to login or jobs.
- Generated wave artwork for login background; Space Grotesk-style display font + clean sans body.
