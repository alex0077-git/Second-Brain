from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import chromadb
import sqlite3
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

chroma_client = chromadb.PersistentClient(path="./chroma_data")
notes_collection = chroma_client.get_or_create_collection(name="notes")


def init_db():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS review_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT UNIQUE NOT NULL,
            next_review_date TEXT NOT NULL,
            interval_days REAL NOT NULL DEFAULT 1,
            last_reviewed TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()


class TopicRequest(BaseModel):
    topic: str
    language: str


class ReviewResult(BaseModel):
    topic: str
    result: str  # "easy" or "hard"


@app.get("/")
def read_root():
    return {"message": "Second Brain backend is alive"}


@app.post("/learn")
def learn_topic(request: TopicRequest):
    note_id = f"note_{request.topic.lower().replace(' ', '_')}"

    past_notes = notes_collection.query(
        query_texts=[request.topic],
        n_results=2,
        where={"topic": {"$ne": request.topic.lower()}}
    )

    context_snippets = past_notes["documents"][0] if past_notes["documents"] else []
    context_text = "\n".join(context_snippets) if context_snippets else "No previous notes yet."

    lang_instruction = "Malayalam-il explain cheyyuka" if request.language == "ml" else "Explain in English"

    prompt = f"""You are a teacher explaining a technical concept to a software developer.
Topic: "{request.topic}"
IMPORTANT: Explain specifically about "{request.topic}" only.

Relevant context from the student's past learning (use if helpful, ignore if irrelevant):
{context_text}

{lang_instruction}. Give a clear explanation, then 2-3 real-world examples.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    explanation = response.choices[0].message.content

    notes_collection.upsert(
        documents=[f"{request.topic}: {explanation[:500]}"],
        ids=[note_id],
        metadatas=[{"topic": request.topic.lower()}]
    )

    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    cursor.execute("""
        INSERT INTO review_schedule (topic, next_review_date, interval_days, last_reviewed)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(topic) DO UPDATE SET
            next_review_date = excluded.next_review_date,
            last_reviewed = excluded.last_reviewed
    """, (request.topic.lower(), tomorrow, datetime.now().strftime("%Y-%m-%d")))
    conn.commit()
    conn.close()

    return {
        "topic": request.topic,
        "language": request.language,
        "explanation": explanation,
        "used_context": context_snippets
    }


@app.get("/review/due")
def get_due_topics():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
        SELECT topic, next_review_date, interval_days FROM review_schedule
        WHERE next_review_date <= ?
    """, (today,))
    rows = cursor.fetchall()
    conn.close()

    due_topics = [
        {"topic": row[0], "next_review_date": row[1], "interval_days": row[2]}
        for row in rows
    ]
    return {"due_topics": due_topics}


@app.post("/review/submit")
def submit_review(request: ReviewResult):
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()

    cursor.execute("SELECT interval_days FROM review_schedule WHERE topic = ?", (request.topic.lower(),))
    row = cursor.fetchone()
    current_interval = row[0] if row else 1

    if request.result == "easy":
        new_interval = current_interval * 2.5
    else:
        new_interval = 1

    next_date = (datetime.now() + timedelta(days=new_interval)).strftime("%Y-%m-%d")

    cursor.execute("""
        UPDATE review_schedule
        SET interval_days = ?, next_review_date = ?, last_reviewed = ?
        WHERE topic = ?
    """, (new_interval, next_date, datetime.now().strftime("%Y-%m-%d"), request.topic.lower()))
    conn.commit()
    conn.close()

    return {"topic": request.topic, "new_interval_days": new_interval, "next_review_date": next_date}