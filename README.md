# SmartRecruit
SmartRecruit is an end-to-end recruitment management system that connects candidates and administrators through a seamless, intelligent web platform. Built with a modern stack — FastAPI, React (TypeScript), and PostgreSQL — it enables job discovery, structured applications, automated communications, and AI-driven candidate ranking.

## Development

### Prerequisites
- Node.js 18+
- Python 3.8+
- PostgreSQL

### Setup
```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Start development servers
npm run dev  # Frontend (port 5173)
# Backend: python -m uvicorn app.main:app --reload (port 8000)
```

### Maintenance Scripts

#### Frontend Maintenance
```bash
cd frontend

# Run dead code analysis
npm run deadcode-report

# Check for unused dependencies
npm run deps-report

# Run all maintenance checks
npm run maintenance

# Lint and fix issues
npm run lint
```

#### Backend Maintenance
```bash
cd backend

# Format code
python -m black . && python -m isort .

# Check for unused imports/variables
python -m ruff check --select F401,F841

# List all API routes
python list_routes.py
```

### Code Quality

#### Frontend
- **ESLint**: Configured with TypeScript support and strict unused variable detection
- **Dead Code Detection**: Use `ts-prune` to identify unused exports
- **Dependency Checking**: Use `depcheck` to find unused packages

#### Backend
- **Ruff**: Fast Python linter with unused import/variable detection
- **Black**: Code formatter
- **isort**: Import sorter

### Git Hooks
Pre-commit hooks are configured to run linting and formatting checks before commits.

### Architecture
- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Components**: Barrel exports available via `src/components/index.ts`
