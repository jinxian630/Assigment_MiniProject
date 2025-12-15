/**
 * Firestore Compatibility Utilities
 *
 * Firestore does not accept undefined values in documents.
 * Fields must be either omitted entirely or have valid values (null, string, number, etc.)
 */

/**
 * Removes undefined fields from an object for Firestore compatibility
 *
 * @param obj - Object that may contain undefined values
 * @returns New object with undefined fields removed
 *
 * @example
 * const data = { name: 'John', age: undefined, role: null };
 * const cleaned = removeUndefinedFields(data);
 * // Result: { name: 'John', role: null }
 */
export function removeUndefinedFields<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const cleaned: Partial<T> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      // Skip undefined values - these should be omitted from Firestore documents
      if (value === undefined) {
        continue;
      }

      // Handle arrays by cleaning each element
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? removeUndefinedFields(item)
            : item
        ) as any;
      }
      // Recursively clean nested objects
      else if (value !== null && typeof value === 'object') {
        cleaned[key] = removeUndefinedFields(value) as any;
      } else {
        // Preserve all other values including null and primitives
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}
