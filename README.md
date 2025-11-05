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

## Code Conventions

### Project Structure
```
frontend/src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components (Navbar, Footer, etc.)
│   ├── admin/          # Admin-specific components
│   ├── jobs/           # Job-related components
│   ├── forms/          # Form components and utilities
│   └── company/        # Company-specific components
├── Pages/              # Page components (routes)
├── Services/           # API service functions
├── utils/              # Utility functions
└── styles/             # Global styles and design tokens

backend/app/
├── routers/            # API route handlers
├── services/           # Business logic services
├── core/               # Core functionality (auth, middleware, etc.)
├── utils/              # Utility functions
└── models.py           # Database models
```

### Naming Conventions
- **Components**: PascalCase (e.g., `JobCard`, `UserProfile`)
- **Files**: kebab-case for components, camelCase for utilities
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase with descriptive names

### Import Order
1. React imports
2. Third-party libraries
3. Local components/utilities
4. Relative imports (sorted alphabetically)

### Code Quality
- ESLint configured for strict TypeScript checking
- Pre-commit hooks enforce code formatting
- Unused code is automatically detected and removed
- Components use barrel exports for cleaner imports

### Git Workflow
- Feature branches for new development
- Pre-commit hooks run linting and formatting
- Commits follow conventional format when possible
- Regular maintenance commits for code cleanup
