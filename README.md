# ICSI 418Y PA4 — User Stories and Project Backlog

Extends PA3 with a UserStories collection, project-specific backlog, story CRUD, assignment checks, and member removal restrictions.

## Setup

Requires Node.js and a running MongoDB instance (local or Atlas).

1. In `server`, run `npm install`.
2. Create `server/.env` containing `MONGO_URI=your_mongodb_connection_string` (do not commit this file).
3. In `server`, run `node server.js` (port 5050).
4. In `client`, run `npm install` then `npm run dev`.
5. Open the local URL printed by Vite.

## Test data / demo preparation

Sign up at least three users. Log in, create two projects with different leads, and add at least one non-lead member. Open **Project Backlog** and create at least five stories across both projects, covering High/Medium/Low priorities and assigned/unassigned stories. All new stories begin in To Do; edit some to In Progress and Done.

Verify project switching, editing, deleting with cancel/confirm, refreshing for persistence, and invalid/blank data. Try assigning a member of one project to a different project (not offered in the dropdown; API also rejects it). Try removing a non-lead member with an assigned story (must fail), then unassign/reassign their story and retry. Project leads remain non-removable.

For the Zoom demo, show the UserStories collection in MongoDB Compass or Atlas and briefly explain React -> Express -> Mongoose, ObjectId references, project-scoped story updates, and membership validation.

## Submission

Push this project to GitHub (exclude `.env` and `node_modules`), then submit repository URL and 3–5 minute Zoom recording in Brightspace.
