/**
 * Utilities for formatting player and team display names.
 * When names are too long (e.g. doubles pairs in padel, beach volleyball, or tennis),
 * first names are abbreviated to their initial (e.g. "Arturo Coello" -> "A. Coello").
 */

export function formatSinglePlayerName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  // Extract country/nationality or affiliation suffix in parentheses or brackets, e.g. "(BRA)", "[USA]"
  let suffix = "";
  let baseName = trimmed;
  const countryMatch = trimmed.match(/\s*(\([A-Za-z0-9\s-]+\)|\[[A-Za-z0-9\s-]+\])$/);
  if (countryMatch && countryMatch.index !== undefined) {
    suffix = " " + countryMatch[1].trim();
    baseName = trimmed.slice(0, countryMatch.index).trim();
  }

  const words = baseName.split(/\s+/);
  // If only 1 name (e.g. "Duda", "Hughes", "Cheng"), do not abbreviate
  if (words.length < 2) return baseName + suffix;

  const firstWord = words[0];
  // Preserve already abbreviated names ("A.", "J.") or team acronyms ("SL", "FC", "VC", "CD")
  if (
    firstWord.endsWith(".") ||
    (firstWord.length <= 3 && firstWord === firstWord.toUpperCase() && !firstWord.includes("-"))
  ) {
    return baseName + suffix;
  }

  const initial = firstWord.charAt(0).toUpperCase();
  const rest = words.slice(1).join(" ");
  return `${initial}. ${rest}${suffix}`;
}

export function formatTeamOrPlayerName(name?: string, maxLength: number = 22): string {
  if (!name) return "";
  const trimmed = name.trim();

  // If it is a doubles pair separated by "/" or " / "
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim());
    return parts.map((p) => formatSinglePlayerName(p)).join(" / ");
  }

  // If it is a doubles pair separated by " & "
  if (trimmed.includes(" & ")) {
    const parts = trimmed.split("&").map((p) => p.trim());
    return parts.map((p) => formatSinglePlayerName(p)).join(" & ");
  }

  // If the single name exceeds maxLength, abbreviate the first name
  if (trimmed.length > maxLength) {
    return formatSinglePlayerName(trimmed);
  }

  return trimmed;
}

export const getInitials = (name?: string): string => {
  if (!name) return "?";
  const cleaned = name.replace(/\(.+?\)/g, "").trim();
  if (!cleaned) return "?";
  return (
    cleaned
      .split(/[\s/]+/)
      .map((w) => w.replace(/[^a-zA-Z0-9À-ÿ]/g, ""))
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
};
