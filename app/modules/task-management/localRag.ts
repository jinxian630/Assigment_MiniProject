// src/config/localRag.ts
import { Platform } from "react-native";

export const RAG_API_HOST =
  Platform.OS === "web"
    ? "http://127.0.0.1:8000" // FastAPI on your PC
    : "http://192.168.68.113:8000"; // <== use your laptop's IP
