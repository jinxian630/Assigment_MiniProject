/**
 * Extract Firebase Storage path from a download URL
 * Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
 */
export function extractStoragePathFromURL(downloadURL: string): string | null {
  try {
    // Check if it's a Firebase Storage URL
    if (!downloadURL.includes("firebasestorage.googleapis.com")) {
      // If it's already a path (starts with MemoryPosts/ or MemoryImages/), return as is
      if (downloadURL.startsWith("MemoryPosts/") || downloadURL.startsWith("MemoryImages/")) {
        return downloadURL;
      }
      return null;
    }

    // Extract the encoded path from the URL
    const url = new URL(downloadURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);
    
    if (!pathMatch) {
      return null;
    }

    // Decode the path (URL encoded)
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    return decodedPath;
  } catch (error) {
    console.error("Error extracting storage path from URL:", error);
    return null;
  }
}

