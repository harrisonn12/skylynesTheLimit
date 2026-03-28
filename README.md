# skylyne

A new project created with Intent by Augment.

## Start the servers

The app has a **FastAPI backend** and a **Next.js frontend**. Run both for local development.

### Backend (API)

From the repo root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` with your OpenAI key (required for chat/generation):

```bash
OPENAI_API_KEY=sk-...
```

Start the API (default: [http://localhost:8000](http://localhost:8000)):

```bash
python main.py
```

### Frontend (web)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production-style frontend

After `npm run build`, serve with:

```bash
npm start
```
