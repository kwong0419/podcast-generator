# PodcastAI Creator

PodcastAI Creator is a web application that converts text transcripts or audio/video files into podcast-style conversations using AI technology. The application leverages Google's Gemini AI to generate natural-sounding dialogue between multiple speakers.

## Tech Stack

### Frontend

- Next.js 15.1
- React 19
- TypeScript
- TailwindCSS
- ESLint

### Backend

- FastAPI
- Python 3.x
- Google Generative AI (Gemini-1.5-pro)
- Uvicorn

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (Latest LTS version)
- Python 3.x
- pip (Python package manager)
- A Google API key for Gemini AI

## Installation

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
# On Windows:
python -m venv venv
venv\Scripts\activate

# On macOS/Linux:
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up environment variables:

Create a `.env` file in the backend directory with the following:

```env
GEMINI_API_KEY=your_google_api_key_here
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

### Running the Application

### Start the Backend Server

1. From the backend directory, start the backend FastAPI server:

```bash
python3 application.py
```

The API will be available at `http://localhost:5000`

### Start the Frontend Development Server

1. From the frontend directory:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Features

- Convert text transcripts into podcast-style conversations
- Upload audio files for podcast generation
- Real-time script generation using Google's Gemini AI
- Modern, responsive user interface
- Dark mode support

## API Endpoints

- `POST /api/generate-from-transcript`: Generate podcast script from text
- `POST /api/generate-podcast`: Generate podcast from audio file

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Google Generative AI](https://ai.google.dev/)
- [ElevenLabs](https://elevenlabs.io/)
