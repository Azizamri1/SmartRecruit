# SmartRecruit

A job matching platform that uses AI to score CVs against job requirements. Matches candidates to opportunities by combining semantic similarity with rule-based criteria.

## Tech Stack

- Backend: FastAPI, PostgreSQL, SQLAlchemy, Pydantic
- AI Scoring: SentenceTransformers (all-MiniLM-L6-v2) with rule-based components
- Frontend: React, TypeScript, Vite

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL
- Node.js 16+ (for frontend)

### Local Setup

1. Clone the repository and navigate to the project root.

2. Set up the backend:
   ```
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Edit `.env` with your settings:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/smartrecruit
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   SMTP_SERVER=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=your-email-password
   EMAIL_FROM=your-email@example.com
   BI_ENCODER_MODEL=sentence-transformers/all-MiniLM-L6-v2
   CORS_ORIGINS=http://localhost:5173
   ```

4. Set up the database:
   ```
   alembic upgrade head
   ```

5. Run the backend:
   ```
   uvicorn app.main:app --reload
   ```
   The API will be available at http://localhost:8000.

6. Set up the frontend (in a new terminal):
   ```
   cd ../frontend
   npm install
   npm run dev
   ```
   The frontend will be available at http://localhost:5173.

## Configuration

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email configuration
- `EMAIL_FROM`: Sender email address
- `BI_ENCODER_MODEL`: AI model name (default: sentence-transformers/all-MiniLM-L6-v2)
- `CORS_ORIGINS`: Allowed frontend origins (comma-separated)

## API Overview

Main routers and endpoints:

- `auth`: User authentication and registration
- `users`: User profile management
- `jobs`: Job CRUD operations
  - `GET /jobs`: List published jobs
  - `POST /jobs`: Create a new job (companies/admins)
  - `GET /jobs/{job_id}`: Get job details
  - `PATCH /jobs/{job_id}/status`: Update job status
- `applications`: Application management
  - `POST /applications`: Submit application (triggers background scoring)
  - `GET /applications/me`: List user's applications
  - `PATCH /applications/{application_id}/status`: Update application status (job owner/admin)
  - `POST /applications/_debug/score`: Debug scoring endpoint (admin-only, requires bearer token)
- `cvs`: CV upload and management
- `admin_analytics`, `company_analytics`: Analytics endpoints
- `company`: Company profile management

Example debug scoring request (admin-only):
```
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -X POST "http://localhost:8000/applications/_debug/score?cv_id=1&job_id=1"
```

## Scoring Overview

CV-job matching combines semantic similarity with rule-based checks. The process extracts text from CVs (PDF/DOCX/TXT), tokenizes it, and compares against job descriptions using embeddings. Rule-based components include skills matching, requirements coverage, and profile alignment.

Penalties apply for short CVs: 10.0 points off for <150 canonical tokens, 5.0 points off for 150-279 tokens. Scores cap at 70.0 if mandatory requirements are unmet.

## Background Tasks

Application scoring runs asynchronously after submission. The `POST /applications` endpoint queues a background task that extracts CV text, computes the match score, and saves it to the database.

## Development & Testing

### Running Tests

Basic tests exist in the `tests/` directory. Run with:
```
python -m pytest tests/
```

### Database Migrations

Use Alembic for schema changes:
```
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Scripts

- `scripts/fix_mojibake.py`: Utility for encoding fixes

## Project Layout

```
backend/
├── app/
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic (AI scoring)
│   ├── utils/            # Text extraction, helpers
│   ├── config.py         # Settings
│   ├── models.py         # Database models
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
└── requirements.txt      # Python dependencies

frontend/
├── src/
│   ├── components/       # React components
│   ├── Pages/            # Page components
│   └── Services/         # API clients
└── package.json          # Node dependencies

tests/                    # Test files
scripts/                  # Utility scripts
uploads/                  # File storage
```

## License & Credits

No license specified.
