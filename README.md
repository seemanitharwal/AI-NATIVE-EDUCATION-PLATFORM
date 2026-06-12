# CA Tutor — AI-Powered Learning Platform

> An intelligent study companion for Indian CA (Chartered Accountancy) students, built on RAG (Retrieval-Augmented Generation), Pinecone vector search, and GPT-4.1.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [User Roles](#user-roles)
- [Ingestion Pipeline](#ingestion-pipeline)
- [Conversation Memory](#conversation-memory)
- [Payments](#payments)
- [Storage](#storage)
- [Deployment](#deployment)

---

## Overview

CA Tutor is a full-stack web application that helps CA students at the Foundation, Intermediate, and Final levels study smarter. Admins upload structured study materials (PDFs, videos); the backend parses, chunks, and embeds them into a Pinecone vector index. Students then chat with an AI tutor that retrieves the most relevant content and answers questions grounded in ICAI syllabus material.

```
Student asks a question
        │
        ▼
CA Gatekeeper (is this CA-related?)
        │
        ▼
Expand CA abbreviations → Embed query → Pinecone similarity search
        │
        ▼
Top-k chunks retrieved → GPT-4.1 generates grounded answer
        │
        ▼
Conversation stored in MongoDB (sliding window + Gemini summarization)
```

---

## Architecture

```
┌──────────────────────────────────┐     ┌────────────────────────────────┐
│         Frontend (Vite/React)    │     │       Backend (FastAPI)        │
│                                  │────▶│                                │
│  Auth · Study Hub · AI Tutor     │     │  Auth · Admin · Chat · Upload  │
│  Admin Dashboard · Upload UI     │◀────│  Payments · Dashboard          │
└──────────────────────────────────┘     └──────────────┬─────────────────┘
                                                        │
                   ┌────────────────────────────────────┼──────────────────┐
                   ▼                                    ▼                  ▼
           ┌──────────────┐                   ┌──────────────┐   ┌────────────────┐
           │   MongoDB    │                   │   Pinecone   │   │   AWS S3 /     │
           │  (users,     │                   │ (vector idx) │   │  Local storage │
           │  docs, chat) │                   └──────────────┘   └────────────────┘
           └──────────────┘
```

---

## Features

**For Students**
- Role-based auth (sign-up with CA level, attempt month, Razorpay payment)
- Study Hub — browse ICAI modules, stream PDFs and video lectures in-browser
- AI Tutor — ask unlimited CA questions in natural language; supports image uploads with automatic OCR
- Persistent conversation memory with sliding-window context and automatic summarization
- Free tier (3 questions/day) and paid plans per CA level

**For Admins**
- Dashboard showing all registered students, pending approvals, and conversation memory
- Upload portal — attach PDFs to a course/subject/chapter hierarchy; content is auto-ingested into the vector store
- Full ingestion pipeline: Docling parsing → smart chunking → table/image extraction → OpenAI embeddings → Pinecone upsert
- Document management with S3 or local file storage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Axios, react-markdown |
| Backend | FastAPI, Python 3.11+, Uvicorn |
| Database | MongoDB (async via Motor) |
| Vector Store | Pinecone |
| LLM | OpenAI GPT-4.1 (chat), GPT-4o (vision/OCR) |
| Embeddings | OpenAI `text-embedding-3-large` |
| Summarization | Google Gemini 2.0 Flash (async, optional) |
| PDF Parsing | Docling, pdfplumber, pypdf, pdf2image, pytesseract |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Payments | Razorpay |
| File Storage | AWS S3 (boto3) with local fallback |
| Email | SMTP (password reset OTP) |

---

## Project Structure

```
ca-backend/
├── main.py                          # FastAPI app, all route handlers
├── config.py                        # Pydantic settings (reads .env)
├── payment_router.py                # Razorpay order creation & verification
├── email_service.py                 # SMTP OTP & admin notifications
├── s3_service.py                    # S3 upload / delete / presigned URLs
├── ca_abbreviations.py              # CA term expansion dictionary
├── ca_text_normalizer.py            # Pre-processing for queries
├── requirements.txt
└── ingestion/
    ├── enhanced_upload_service.py   # Orchestrates full ingestion pipeline
    ├── fast_docling_parser.py       # PDF → structured text/tables/images
    ├── enhanced_chunking.py         # Semantic chunking strategy
    ├── enhanced_table_processor.py  # Table → embedding-friendly text
    ├── enhanced_image_processor.py  # Image → GPT-4o descriptions
    ├── embedding_service.py         # Batched OpenAI embedding calls
    ├── metadata_builder.py          # Pinecone metadata assembly
    └── pinecone_service.py          # Upsert vectors to index

ca-frontend/
├── index.html
├── vite.config.ts
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx                      # Root, routing, role-based layout
    ├── App.css                      # Global styles
    ├── api.ts                       # Axios instance with JWT interceptor
    ├── Auth.tsx                     # Login, signup, payment, forgot-password
    ├── Chat.tsx                     # AI Tutor chat interface
    ├── CADashboard.tsx              # Study Hub — PDFs, videos, modules
    ├── AdminDashboard.tsx           # Student management
    └── AdminUpload.tsx              # Material upload with metadata form
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A running MongoDB instance (local or Atlas)
- A Pinecone account with an index created
- OpenAI API key
- (Optional) Razorpay account, AWS S3 bucket, Google Gemini API key

---

### Backend Setup

```bash
# 1. Clone and enter the backend directory
cd ca-backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the example env file and fill in your values
cp .env.example .env

# 5. Start the development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# 1. Enter the frontend directory
cd ca-frontend

# 2. Install dependencies
npm install

# 3. Create a .env file pointing to your backend
echo "VITE_API_BASE=http://localhost:8000" > .env

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the backend root with the following keys:

```env
# ── Database ────────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net
MONGO_DB=ca-cs-vector-db-index

# ── Auth ────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# ── Pinecone ────────────────────────────────────────────────
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_index_name

# ── OpenAI ──────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4.1
EMBEDDING_MODEL=text-embedding-3-large

# ── Gemini (optional — enables conversation summarization) ──
GEMINI_API_KEY=

# ── Email ───────────────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your@email.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your@email.com
ADMIN_EMAIL=admin@yourplatform.com

# ── Razorpay ────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_secret

# ── AWS S3 (optional — falls back to local ./uploads) ───────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET=

# ── Frontend origin ─────────────────────────────────────────
FRONTEND_ORIGIN=http://localhost:5173

# ── Tuning (optional) ───────────────────────────────────────
EMBED_BATCH_SIZE=12
EMBED_TIMEOUT_SECS=120
EMBED_MAX_RETRIES=3
MAX_TEXT_LENGTH_FOR_EMBED=8000
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new student |
| `POST` | `/auth/login` | Login and receive JWT |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/auth/forgot-password` | Send OTP to email |
| `POST` | `/auth/verify-otp` | Validate OTP |
| `POST` | `/auth/reset-password` | Set new password |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send a message; returns AI answer + sources |
| `POST` | `/chat/extract-file-text` | Extract text from an uploaded file for context |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/students` | List all registered students |
| `POST` | `/admin/approve/{user_id}` | Approve a pending student |
| `POST` | `/admin/reject/{user_id}` | Reject a pending student |
| `GET` | `/admin/students/{user_id}/memory` | View a student's conversation memory |
| `DELETE` | `/admin/students/{user_id}/memory` | Clear a student's conversation memory |
| `GET` | `/admin/documents/grouped` | List all uploaded documents grouped by subject |

### Study Materials (Upload)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload_enhanced` | Upload and ingest a PDF into the vector store |
| `DELETE` | `/{doc_id}` | Delete a document and its vectors |
| `GET` | `/upload_health` | Check ingestion service status |
| `POST` | `/{dashboard_id}/upload_smart_pdf` | Attach a PDF to a dashboard item |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/tree` | Fetch course/subject/chapter hierarchy |
| `GET` | `/dashboard/pdf-proxy` | Stream a PDF from S3 or local storage |
| `GET` | `/dashboard/audio-proxy` | Stream an audio file |
| `POST` | `/dashboard/add` | Add a new dashboard item |
| `GET` | `/dashboard/item/{item_id}` | Get a single dashboard item |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/create-order` | Create a Razorpay order |
| `POST` | `/payments/verify` | Verify payment signature and upgrade plan |

---

## User Roles

### Student
Signs up by selecting their CA level (Foundation / Intermediate / Final) and upcoming attempt month. After completing a Razorpay payment (or choosing the free tier), the account is submitted for admin approval. Once approved, the student gains access to the Study Hub and AI Tutor.

### Admin
Created directly in the database or seeded via a script. Admins see a full dashboard of students and all uploaded content, and can upload new study materials through the UI.

---

## Ingestion Pipeline

When an admin uploads a PDF, the following pipeline runs asynchronously:

1. **Parse** — `FastDoclingParser` converts the PDF into structured blocks: text paragraphs, tables, and embedded images.
2. **Chunk** — `enhanced_chunking` splits content into semantically coherent chunks (longer than typical to retain CA context).
3. **Table processing** — each table is converted to a human-readable summary suitable for embedding.
4. **Image processing** — extracted images are described by GPT-4o and the descriptions are embedded alongside the visual context.
5. **Embed** — `embedding_service.embed_texts()` sends batches to OpenAI `text-embedding-3-large` with retry and exponential backoff.
6. **Upsert** — vectors plus rich metadata (course, subject, chapter, page number, content type) are written to the Pinecone index.

---

## Conversation Memory

Each student has a persistent conversation history stored in MongoDB:

- A **sliding window** of the last 10 Q&A turns is injected as context on every chat request.
- Every 5 new turns, **Gemini 2.0 Flash** asynchronously generates a compact summary of older turns, replacing the raw history to keep token usage low.
- Admins can view or clear any student's memory from the dashboard.
- Memory is keyed by user ID, so context is preserved across sessions.

Gemini summarization is optional — set `GEMINI_API_KEY=` to leave it blank and the chat will still work fully using the raw sliding window.

---

## Payments

Razorpay is used for one-time plan purchases during student sign-up.

| Plan | Price (INR) | CA Level |
|---|---|---|
| Foundation | ₹499 | Foundation |
| Intermediate | ₹599 | Intermediate |
| Final | ₹699 | Final |

Payment flow:
1. Frontend calls `POST /payments/create-order` with the amount and plan.
2. Razorpay checkout is loaded in-browser.
3. On success, frontend calls `POST /payments/verify` with the three Razorpay identifiers.
4. Backend verifies the HMAC signature and upgrades the user's plan in MongoDB.

A free tier is also available, limited to 3 AI questions per day and basic PDF access.

---

## Storage

PDF files are stored in one of two ways, selected automatically at startup:

**AWS S3** (recommended for production) — if all four `AWS_*` variables are set in `.env`, uploaded files go to S3 and the backend generates 7-day presigned URLs for serving them.

**Local filesystem** (development fallback) — if S3 is not configured, files are saved to `./uploads/` and served by FastAPI's `StaticFiles` mount at `/uploads`.

No code changes are needed to switch between the two; the `s3_service.py` module exposes `is_s3_configured()` and the upload/delete helpers transparently choose the right backend.

---

## Deployment

### Backend (e.g. Railway / Render / EC2)

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Set all environment variables in your hosting platform's dashboard. Ensure your MongoDB Atlas cluster allows inbound connections from your server's IP.

### Frontend (e.g. Vercel)

```bash
npm run build          # outputs to dist/
```

Set `VITE_API_BASE` to your production backend URL in Vercel's environment settings. The backend already allows `*.vercel.app` origins via its CORS regex rule.

---

## License

Private — all rights reserved.
