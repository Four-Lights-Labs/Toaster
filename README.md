# Toaster

An LLM interface that behaves like a tool, not a synthetic human.

## What this is

Toaster is a Chrome MV3 side panel prototype for testing a stricter interaction shell around an LLM.

The goal is simple: make model output feel more like a terminal, calculator, or appliance, and less like an overeager assistant.

Default behavior is:

- concise
- structured
- low-emotion
- predictable

## Architecture

Chrome Extension -> Local Backend -> OpenAI Responses API

## Status

Prototype. Local development only. Not production-ready.

## Repo structure
- `extension/` — Chrome extension UI and browser integration
- `backend/` — Local Node server that calls OpenAI

### Run
Start the backend

```bash
cd backend
npm install
cp .env.example .env
add OPENAI_API_KEY to .env
npm start
```
