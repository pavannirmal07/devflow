/**
 * Formats a project display name.
 * Normalizes project display names such as "lekhni" -> "Lekhani"
 * without modifying the underlying GitHub repository identifier.
 */
export function formatProjectName(name: string | null | undefined): string {
  if (!name) return "";
  if (name.trim().toLowerCase() === "lekhni") {
    return "Lekhani";
  }
  return name;
}
