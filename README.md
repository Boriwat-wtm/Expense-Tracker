# Expense Tracker

Multi-tenant expense tracking app — FastAPI backend + React frontend.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy · Alembic |
| Database | PostgreSQL (Aiven Free 5 GB) |
| OCR | Google Cloud Vision API |
| PDF Parsing | pdfplumber (in-memory, never writes to disk) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| Charts | Recharts |
| Deploy | Render (backend) · Vercel (frontend) |

## Project Structure

```
expense-tracker/
├── backend/          ← FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models/       ← SQLAlchemy models
│   │   ├── schemas/      ← Pydantic schemas
│   │   ├── routers/      ← API endpoints
│   │   └── services/     ← OCR, PDF, Auth logic
│   ├── alembic/          ← DB migrations
│   ├── requirements.txt
│   └── render.yaml       ← Render deploy config
└── frontend/         ← React + Vite app
    ├── src/
    │   ├── App.tsx
    │   ├── pages/        ← Login, Register, Dashboard, Upload, History
    │   ├── components/   ← UploadZone, PreviewTable, DashboardCharts, Layout
    │   ├── hooks/        ← useAuth, useDashboard
    │   ├── lib/          ← api.ts (axios), utils.ts (cn, formatCurrency)
    │   └── types/        ← TypeScript interfaces
    └── vercel.json
```

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- A PostgreSQL database (Aiven free tier recommended)
- Google Cloud project with Vision API enabled

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env from example
copy .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, GOOGLE_APPLICATION_CREDENTIALS_JSON

# Run DB migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Swagger UI at  http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
# App available at http://localhost:5173
```

## Deployment

### Backend → Render
1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com), link the repo
3. Set root directory to `backend/`
4. Set environment variables (DATABASE_URL, SECRET_KEY, GOOGLE_APPLICATION_CREDENTIALS_JSON, CORS_ORIGINS)
5. Render will run `alembic upgrade head && uvicorn ...` automatically

### Frontend → Vercel
1. Import the repo on [vercel.com](https://vercel.com)
2. Set root directory to `frontend/`
3. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

## Security Notes

- `.env` is git-ignored — **never commit secrets**
- All transaction queries filter by `user_id` from JWT → multi-tenant isolation
- PDF files are processed **entirely in RAM** — never written to disk
- OCR quota is enforced server-side (50 images/month, resets monthly)
- Passwords hashed with bcrypt; JWT signed with HS256
