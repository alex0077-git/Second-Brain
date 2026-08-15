from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import chromadb
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

class TopicRequest(BaseModel):
    topic: str
    language: str

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

    return {
        "topic": request.topic,
        "language": request.language,
        "explanation": explanation,
        "used_context": context_snippets
    }