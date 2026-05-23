# Student Notes Hub

Monorepo layout: **`mobile-app/`** (Expo, Android APK/AAB via EAS), **`backend/`** (FastAPI), optional **`database/schema.sql`**.

## Quick links

- [Android APK distribution](docs/ANDROID_APK_DISTRIBUTION.md)
- [Mobile app setup & EAS builds](mobile-app/README.md)

## Backend (API + optional APK hosting)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # edit PUBLIC_BASE_URL and version vars
uvicorn app:app --reload
```

- Health: `GET /health`
- Release metadata: `GET /releases/latest`
- APK file: `GET /releases/download` (place built APK under `backend/releases/`)

## Mobile

See [mobile-app/README.md](mobile-app/README.md).
