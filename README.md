# Second Brain

A bilingual (English/Malayalam) AI-powered learning app that helps you understand technical concepts deeply and retain them long-term — built with a FastAPI backend, React Native (Expo) mobile frontend, Retrieval-Augmented Generation (RAG), and a custom spaced-repetition engine.

## Why I built this

I wanted a way to genuinely learn and remember technical concepts — not just collect notes I'd never revisit. Second Brain lets you type in any topic, get a clear explanation with a real-world analogy and detailed examples, and then come back later to actively test yourself instead of just re-reading.

## Features

- **Learn** — Enter any programming/technical topic and get an AI-generated explanation with a memorable real-world analogy, two detailed examples from real-world company scenarios, and a sample interview question.
- **Bilingual support** — Explanations available in English or Malayalam.
- **Folders** — Organize topics into custom folders (e.g. "Python", "DSA").
- **Spaced Repetition** — An SM-2-inspired scheduling algorithm tracks when each topic is due for review, adjusting the interval based on whether you found it Easy or Hard.
- **Active Recall Self-Test** — Instead of showing you the same content again, the app generates a *new* interview-style question about each topic, lets you write your own answer, then reveals a model answer for comparison.
- **RAG-powered context** — Past notes are stored as embeddings in a vector database; when you learn a related topic later, relevant past context is automatically retrieved and used to inform the new explanation.

## Tech Stack

**Backend**
- Python, FastAPI
- Groq API (LLM inference)
- ChromaDB (vector database for RAG)
- SQLite (spaced-repetition scheduling & notes storage)

**Frontend**
- React Native (Expo)
- Expo Router (file-based navigation)
- TypeScript

## Project Structure

```
Second-Brain/
├── main.py                  # FastAPI backend — RAG, spaced repetition, quiz generation
├── requirements.txt
├── frontend/
│   ├── app/
│   │   └── (tabs)/
│   │       ├── index.tsx    # Learn screen
│   │       └── explore.tsx  # Revise screen (today/folder review + self-test)
│   ├── app-colors.ts        # Design system (colors, spacing, radius)
│   ├── components/
│   │   └── AppButton.tsx    # Custom styled button component
│   └── config.ts            # API base URL config
```

## How It Works

1. **Learn a topic** → Backend retrieves relevant past notes from ChromaDB (RAG), builds a prompt combining that context with the new topic, and calls the Groq LLM to generate an explanation with analogies and examples. The note and its embedding are saved.
2. **Review scheduling** → Every learned topic gets a `next_review_date` in SQLite. Marking a review "Easy" multiplies the interval by 2.5x; marking it "Hard" resets it to 1 day.
3. **Self-Test** → For each topic in a review session, a fresh interview-style question is generated (explicitly instructed to differ from the original content) so you're tested on understanding, not memorized text.

## Setup

### Backend

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file:
```
GROQ_API_KEY=your_groq_api_key_here
```

Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

Update `frontend/config.ts` with your machine's local IP address so the Expo Go app (on a physical device) can reach the backend:
```typescript
export const API_URL = 'http://<your-local-ip>:8000';
```

## What I Learned

This project was built as a deliberate learning exercise rather than a copy-paste build — covering FastAPI routing and middleware, CORS, `.env` secrets management, RAG pipelines and embeddings, prompt engineering (including debugging topic-drift and token-limit issues in a low-resource language), SQL schema design, React state management, and mobile networking with Expo. It also involved a real production-style incident: migrating off a Groq model (`llama-3.3-70b-versatile`) after it was deprecated mid-development.