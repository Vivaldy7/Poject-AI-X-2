# CLAUDE.md

## Project: Jarvis

Jarvis is an AI-powered WhatsApp chatbot built for Haitian small businesses. It helps business owners automate customer interactions — answering questions, handling basic requests — without needing to hire dedicated support staff.

## Stack

- **Runtime:** Node.js
- **Server:** Express.js
- **AI Provider:** Google Gemini API (free tier)
- **Messaging:** Twilio (WhatsApp Sandbox integration)
- **Deployment:** TBD

## Project Structure

- `server.js` — main Express server, handles incoming webhook requests and routes them to the Gemini API for responses
- `package.json` — project dependencies and scripts
- `.env` — environment variables (API keys, Twilio credentials) — never committed, see `.gitignore`

## Conventions

- Commit messages follow **Conventional Commits** format (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- Environment variables are never hardcoded — always pulled from `.env`
- Keep business logic (message handling, AI prompts) separate from server/routing logic as the project grows

## Notes

- Originally prototyped with Anthropic and OpenAI APIs, moved to Gemini's free tier due to billing constraints
- WhatsApp/Twilio sandbox integration currently in progress
- Future goals: multi-language support (Haitian Creole, French, English), expanded business use cases (FAQs, order-taking, appointment booking)