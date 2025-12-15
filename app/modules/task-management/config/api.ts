// src/config/localRag.ts
import { Platform } from "react-native";

// Task AI backend (fastapi_chroma_fixed) – use a different port from Money AI
// so you can run both at the same time.
export const RAG_API_HOST =
  Platform.OS === "web"
    ? "http://127.0.0.1:8001" // Task FastAPI on your PC
    : "http://192.168.0.14:8001"; // <== your laptop IP with port 8001
