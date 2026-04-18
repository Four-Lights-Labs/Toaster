# Toaster
An LLM that acts like a tool, not like a synthetic human.

## What is this Prototype?

A Chrome MV3 side panel extension that layers a tool-like interface over an LLM.

Instead of acting like a chatty assistant, Operator pushes model output toward something more like a terminal, calculator, or appliance:
- concise
- structured
- low-emotion
- predictable

The prototype runs as:

```text
Chrome Extension -> Local Backend -> OpenAI Responses API

## Status

Prototype. Local development only.
Not production-ready.

# Operator Prototype

Single-repo prototype for a Chrome MV3 side panel extension layered over a backend that calls the OpenAI Responses API.

## Structure

- `extension/` — Chrome extension UI and browser integration
- `backend/` — local Node server that calls OpenAI

## Run

### 1. Start backend

```bash
cd backend
npm install
cp .env.example .env
# add OPENAI_API_KEY to .env
npm start
