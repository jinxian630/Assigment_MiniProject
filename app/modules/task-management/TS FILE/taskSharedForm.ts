import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

/* ---------------------- Email helpers ---------------------- */

export const isValidGmail = (email: string) =>
  /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());

export const addUniqueEmail = (list: string[], email: string) => {
  const trimmed = email.trim();
  if (!trimmed) return list;
  const exists = list.some((x) => x.toLowerCase() === trimmed.toLowerCase());
  return exists ? list : [...list, trimmed];
};

export const removeAtIndex = <T>(list: T[], index: number) =>
  list.filter((_, i) => i !== index);

/** Accepts string OR array OR "a,b;c" style */
export const normalizeEmailList = (value: any): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[;,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

/* ---------------------- Image picker ---------------------- */

export const pickImagesFromLibrary = async (): Promise<string[]> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled) return [];
  return result.assets.map((a) => a.uri).filter(Boolean);
};

export const ensureMediaPermission = async () => {
  if (Platform.OS === "web") return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
};

/* ---------------------- Storage upload ---------------------- */

export const uploadUrisToFirebaseStorage = async (args: {
  folder: string; // e.g. "EventAttachments"
  uris: string[];
}): Promise<string[]> => {
  const storage = getStorage();
  const uploadedURLs: string[] = [];

  for (const fileUri of args.uris) {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storageRef = ref(storage, `${args.folder}/${id}`);

    const snap = await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(snap.ref);
    uploadedURLs.push(url);
  }

  return uploadedURLs;
};
