from fastapi import FastAPI, HTTPException
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
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT UNIQUE NOT NULL,
            folder TEXT NOT NULL,
            language TEXT NOT NULL,
            explanation TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
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


def make_summary(explanation: str) -> str:
    clean = explanation.split("---")[0].strip()
    if len(clean) <= 150:
        return clean
    truncated = clean[:150]
    last_space = truncated.rfind(" ")
    return truncated[:last_space] + "..."


class TopicRequest(BaseModel):
    topic: str
    language: str
    folder: str


class ReviewResult(BaseModel):
    topic: str
    result: str  # "easy" or "hard"


class QuizRequest(BaseModel):
    topics: list[str]
    language: str


@app.get("/")
def read_root():
    return {"message": "Second Brain backend is alive"}


@app.post("/learn")
def learn_topic(request: TopicRequest):
    request.topic = request.topic.strip()
    note_id = f"note_{request.topic.lower().replace(' ', '_')}"
    folder_clean = request.folder.strip().title()

    past_notes = notes_collection.query(
        query_texts=[request.topic],
        n_results=2,
        where={"topic": {"$ne": request.topic.lower()}}
    )
    context_snippets = past_notes["documents"][0] if past_notes["documents"] else []
    context_text = "\n".join(context_snippets) if context_snippets else "No previous notes yet."

    lang_instruction = "Respond entirely in Malayalam (using Malayalam script, not Manglish)" if request.language == "ml" else "Respond in English"

    example_length_note = (
        "Each example should be 80-120 words."
        if request.language == "ml"
        else "Each example should be 100-150 words."
    )

    main_prompt = f"""You are an expert teacher explaining the SOFTWARE PROGRAMMING concept "{request.topic}" to a developer preparing for interviews in Kerala, India.

CRITICAL RULE: The topic you must explain is EXACTLY "{request.topic}". Ignore any other topic mentioned in the context below — the context is only background, and if it discusses a DIFFERENT concept than "{request.topic}", you must NOT explain that different concept. Your entire response must be about "{request.topic}" only.

Background context from the student's past learning (use ONLY if it is actually about "{request.topic}"; otherwise ignore it completely):
{context_text}

{lang_instruction}.

Structure your response about "{request.topic}" as follows:
1. Start with ONE memorable real-world analogy (2-3 sentences) that makes the core idea click immediately — like explaining an API using a restaurant waiter who takes your order to the kitchen and brings back the food, so you never deal with the kitchen directly. Pick an analogy from everyday life in Kerala/India that fits "{request.topic}".
2. A clear technical explanation (1-2 paragraphs) of what "{request.topic}" is, why it exists, and how it works internally.
3. Exactly 2 detailed real-world examples, each using a DIFFERENT company/product type. {example_length_note} Each example must describe a specific scenario, include a short code snippet, and explain WHY this approach was chosen.

Do NOT include any interview question in this response — that will be asked separately."""
    main_max_tok = 5000 if request.language == "ml" else 3000

    main_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": main_prompt}],
        max_tokens=main_max_tok,
    )
    main_content = main_response.choices[0].message.content

    interview_prompt = f"""{lang_instruction}. This is about the SOFTWARE PROGRAMMING concept of "{request.topic}" (not any other meaning of this word — strictly computer science / coding context). Give exactly ONE common technical interview question about the programming concept "{request.topic}", followed by a strong, concise sample answer (3-5 sentences). Format it as:

Question: ...
Answer: ..."""

    interview_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": interview_prompt}],
        max_tokens=1200,
    )
    interview_content = interview_response.choices[0].message.content

    explanation = f"{main_content}\n\n---\n\n**Interview Question:**\n{interview_content}"

    notes_collection.upsert(
        documents=[f"{request.topic}: {explanation[:500]}"],
        ids=[note_id],
        metadatas=[{"topic": request.topic.lower(), "folder": folder_clean}]
    )

    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    cursor.execute("""
        INSERT INTO notes (topic, folder, language, explanation, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(topic) DO UPDATE SET
            folder = excluded.folder,
            language = excluded.language,
            explanation = excluded.explanation,
            created_at = excluded.created_at
    """, (request.topic.lower(), folder_clean, request.language, explanation, now))

    cursor.execute("""
        INSERT INTO review_schedule (topic, next_review_date, interval_days, last_reviewed)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(topic) DO UPDATE SET
            next_review_date = excluded.next_review_date,
            last_reviewed = excluded.last_reviewed
    """, (request.topic.lower(), tomorrow, now))

    conn.commit()
    conn.close()

    return {
        "topic": request.topic,
        "folder": folder_clean,
        "language": request.language,
        "explanation": explanation,
    }


@app.get("/folders")
def get_folders():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT folder FROM notes ORDER BY folder")
    rows = cursor.fetchall()
    conn.close()
    return {"folders": [r[0] for r in rows]}


@app.get("/topics")
def get_all_topics():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT topic, folder, created_at FROM notes ORDER BY folder, topic")
    rows = cursor.fetchall()
    conn.close()
    topics = [{"topic": r[0], "folder": r[1], "created_at": r[2]} for r in rows]
    return {"topics": topics}


@app.get("/topics/{topic}")
def get_topic_detail(topic: str):
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT topic, folder, language, explanation, created_at FROM notes WHERE topic = ?", (topic.lower(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"topic": row[0], "folder": row[1], "language": row[2], "explanation": row[3], "created_at": row[4]}


@app.get("/review/due")
def get_due_topics():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
        SELECT r.topic, r.next_review_date, r.interval_days, n.folder
        FROM review_schedule r JOIN notes n ON r.topic = n.topic
        WHERE r.next_review_date <= ?
    """, (today,))
    rows = cursor.fetchall()
    conn.close()
    return {"due_topics": [{"topic": r[0], "next_review_date": r[1], "interval_days": r[2], "folder": r[3]} for r in rows]}


@app.get("/review/today")
def get_today_learned():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT topic, folder, explanation FROM notes WHERE created_at = ?", (today,))
    rows = cursor.fetchall()
    conn.close()
    return {"topics": [{"topic": r[0], "folder": r[1], "summary": make_summary(r[2])} for r in rows]}


@app.get("/review/all")
def get_all_for_review():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.topic, r.next_review_date, r.interval_days, n.folder
        FROM review_schedule r JOIN notes n ON r.topic = n.topic
        ORDER BY n.folder, r.topic
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"topics": [{"topic": r[0], "next_review_date": r[1], "interval_days": r[2], "folder": r[3]} for r in rows]}


@app.get("/review/folder/{folder}")
def get_folder_topics(folder: str):
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT topic, folder, explanation FROM notes WHERE folder = ? ORDER BY topic", (folder,))
    rows = cursor.fetchall()
    conn.close()
    return {"topics": [{"topic": r[0], "folder": r[1], "summary": make_summary(r[2])} for r in rows]}


@app.post("/review/submit")
def submit_review(request: ReviewResult):
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT interval_days FROM review_schedule WHERE topic = ?", (request.topic.lower(),))
    row = cursor.fetchone()
    current_interval = row[0] if row else 1
    new_interval = current_interval * 2.5 if request.result == "easy" else 1
    next_date = (datetime.now() + timedelta(days=new_interval)).strftime("%Y-%m-%d")
    cursor.execute("""
        UPDATE review_schedule SET interval_days = ?, next_review_date = ?, last_reviewed = ?
        WHERE topic = ?
    """, (new_interval, next_date, datetime.now().strftime("%Y-%m-%d"), request.topic.lower()))
    conn.commit()
    conn.close()
    return {"topic": request.topic, "new_interval_days": new_interval, "next_review_date": next_date}


@app.post("/quiz/generate")
def generate_quiz(request: QuizRequest):
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    quiz_items = []

    lang_instruction = "Respond entirely in Malayalam (using Malayalam script)" if request.language == "ml" else "Respond in English"

    for topic in request.topics:
        cursor.execute("SELECT explanation FROM notes WHERE topic = ?", (topic.lower(),))
        row = cursor.fetchone()
        if not row:
            continue
        existing_explanation = row[0][:800]

        prompt = f"""You are conducting a mock technical interview about the programming concept "{topic}".

The student has already studied this content:
{existing_explanation}

{lang_instruction}. Generate ONE NEW interview-style question about "{topic}" that tests deeper or different understanding than what's shown above — do not repeat the same question or angle. Then give a strong, concise model answer (3-4 sentences).

Format exactly as:
QUESTION: <question text>
ANSWER: <answer text>"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
        )
        content = response.choices[0].message.content

        question, answer = "", ""
        if "QUESTION:" in content and "ANSWER:" in content:
            parts = content.split("ANSWER:")
            question = parts[0].replace("QUESTION:", "").strip()
            answer = parts[1].strip()
        else:
            question = content
            answer = "Answer generation failed, please retry."

        quiz_items.append({"topic": topic, "question": question, "answer": answer})

    conn.close()
    return {"quiz": quiz_items}