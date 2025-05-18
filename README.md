# Audio Transcriber Desktop App

This is a minimal Electron-based desktop app that records audio from the microphone, transcribes it to text using AssemblyAI, and allows copying the result to the clipboard. It reuses core audio and speech-to-text logic from the main Audio Listener AI desktop app, but omits AI-generated answers and history features.

## Features

- Record audio from microphone
- Transcribe audio to text (AssemblyAI)
- Display and copy transcribed text to clipboard

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure AssemblyAI API key and backend URL in `.env` if needed.
3. Run the app:
   ```bash
   npm start
   ```

## Project Structure

- `src/` — Main Electron and renderer process code
- `js/` — Shared audio and transcription modules (copied/adapted from desktop-app)

## License

MIT
