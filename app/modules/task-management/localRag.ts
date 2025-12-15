// src/config/localRag.ts
import { Platform } from "react-native";

export const RAG_API_HOST =
  Platform.OS === "web"
    ? "http://127.0.0.1:8000" // FastAPI on your PC
    : "http://10.10.19.245:8000"; // <== use your laptop's IP
