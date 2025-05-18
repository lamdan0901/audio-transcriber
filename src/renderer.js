// Audio Transcriber Renderer
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
const recordBtn = document.getElementById("recordBtn");
const transcriptArea = document.getElementById("transcript");
const statusDiv = document.getElementById("status");
const pinButton = document.getElementById("pinButton");

const ASSEMBLY_AI_API_URL = "https://api.assemblyai.com/v2/transcript";
const ASSEMBLY_AI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload";
let ASSEMBLY_AI_API_KEY = null;

// Set initial taskbar state
window.electronAPI.setTaskbarState("idle");

// Get the API key securely through the preload script
async function initializeApiKey() {
  try {
    ASSEMBLY_AI_API_KEY = await window.electronAPI.getEnvVar(
      "ASSEMBLY_AI_API_KEY"
    );
    if (!ASSEMBLY_AI_API_KEY) {
      setStatus("Error: AssemblyAI API key not found in environment variables");
      recordBtn.disabled = true;
    }
  } catch (err) {
    console.error("Failed to get API key:", err);
    setStatus("Error: Failed to initialize API key");
    recordBtn.disabled = true;
  }
}

// Initialize when the page loads
initializeApiKey();

// Handle tray icon clicks
window.electronAPI.onTrayClick(() => {
  if (isRecording) {
    // If recording, stop recording
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      isRecording = false;
      recordBtn.textContent = "Start Recording";
      setStatus("Processing audio...");
    }
  } else if (statusDiv.textContent.includes("Processing")) {
    // If processing, cancel it (if possible)
    setStatus("Cancelled");
    window.electronAPI.setTaskbarState("idle");
  } else {
    // If idle, start recording
    recordBtn.click(); // Simulate clicking the record button
  }
});

function setStatus(msg) {
  statusDiv.textContent = msg;
  // Update taskbar state based on status message
  if (msg.includes("Recording")) {
    window.electronAPI.setTaskbarState("listening");
  } else if (
    msg.includes("Processing") ||
    msg.includes("Uploading") ||
    msg.includes("Transcribing")
  ) {
    window.electronAPI.setTaskbarState("processing");
  } else {
    window.electronAPI.setTaskbarState("idle");
  }
}

// Add pin button functionality
let isPinned = false;

pinButton.addEventListener("click", async () => {
  isPinned = await window.electronAPI.toggleAlwaysOnTop();
  pinButton.classList.toggle("active", isPinned);
});

recordBtn.onclick = async () => {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        setStatus("Uploading audio...");
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        try {
          const uploadRes = await fetch(ASSEMBLY_AI_UPLOAD_URL, {
            method: "POST",
            headers: { authorization: ASSEMBLY_AI_API_KEY },
            body: audioBlob,
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.upload_url) throw new Error("Upload failed");
          setStatus("Transcribing...");
          const transcriptRes = await fetch(ASSEMBLY_AI_API_URL, {
            method: "POST",
            headers: {
              authorization: ASSEMBLY_AI_API_KEY,
              "content-type": "application/json",
            },
            body: JSON.stringify({ audio_url: uploadData.upload_url }),
          });
          const transcriptData = await transcriptRes.json();
          if (!transcriptData.id)
            throw new Error("Transcription request failed");
          let completed = false,
            transcriptText = "";
          while (!completed) {
            await new Promise((r) => setTimeout(r, 1500));
            const pollRes = await fetch(
              `${ASSEMBLY_AI_API_URL}/${transcriptData.id}`,
              {
                headers: { authorization: ASSEMBLY_AI_API_KEY },
              }
            );
            const pollData = await pollRes.json();
            if (pollData.status === "completed") {
              transcriptText = pollData.text;
              completed = true;
            } else if (pollData.status === "failed") {
              throw new Error("Transcription failed");
            }
          }
          transcriptArea.value = transcriptText;
          if (transcriptText) {
            await window.electronAPI.copyToClipboard(transcriptText);
            setStatus("Transcription complete! (Copied to clipboard)");
            // Show notification
            window.electronAPI.showNotification({
              title: "Transcription Complete",
              body: "The transcription has been copied to your clipboard.",
            });
          } else {
            setStatus("Transcription complete.");
          }
        } catch (err) {
          setStatus("Error: " + err.message);
          window.electronAPI.showNotification({
            title: "Transcription Error",
            body: err.message,
          });
        }
      };
      mediaRecorder.start();
      isRecording = true;
      recordBtn.textContent = "Stop Recording";
      setStatus("Recording...");
    } catch (err) {
      setStatus("Microphone error: " + err.message);
      window.electronAPI.showNotification({
        title: "Microphone Error",
        body: err.message,
      });
    }
  } else {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      isRecording = false;
      recordBtn.textContent = "Start Recording";
      setStatus("Processing audio...");
    }
  }
};
