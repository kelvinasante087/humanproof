/**
 * ENS name normalization — the single safe entry point for every name string.
 *
 * Correctness rule #1 (see docs/day-4-ens.md): normalize the WHOLE dotted name
 * at once with @adraffy/ens-normalize. NEVER `toLowerCase()`, never normalize
 * label-by-label. This is what makes `Kelvin.humanproof.eth` and
 * `kelvin.humanproof.eth` hash identically, and what rejects homoglyph attacks
 * (e.g. a Cyrillic "а" smuggled into an otherwise-ASCII name).
 *
 * Verified against the installed package @adraffy/ens-normalize@1.11.1:
 * `ens_normalize` and `ens_beautify` are named exports of the package root.
 */
import { ens_normalize, ens_beautify } from "@adraffy/ens-normalize";

/** Thrown when a user-supplied name/label can't be safely normalized. */
export class InvalidEnsNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEnsNameError";
  }
}

/**
 * Normalize a full dotted ENS name (e.g. "Kelvin.humanproof.eth"). Returns the
 * canonical form. Throws InvalidEnsNameError if the name is not normalizable.
 */
export function normalizeName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new InvalidEnsNameError("Name is empty.");
  try {
    return ens_normalize(trimmed);
  } catch (err) {
    throw new InvalidEnsNameError(
      err instanceof Error ? err.message : "Name is not a valid ENS name.",
    );
  }
}

/** Human-friendly display form (keeps emoji, canonical case). Never use for hashing. */
export function beautifyName(input: string): string {
  return ens_beautify(input.trim());
}

/**
 * Take a user-chosen label plus the parent we control, and return the normalized
 * full name and its single label — normalized as ONE whole name (rule #1), not
 * label-by-label. Guards that the chosen label is exactly one label (no dots,
 * not empty) so a user can't inject `foo.bar` to escape our parent.
 */
export function normalizeSubname(
  rawLabel: string,
  parent: string,
): { name: string; label: string; parent: string } {
  const normParent = normalizeName(parent);
  const label = rawLabel.trim();
  if (!label) throw new InvalidEnsNameError("Please choose a name.");
  if (label.includes(".")) {
    throw new InvalidEnsNameError("Your name can't contain a dot.");
  }

  // Normalize the WHOLE name at once, then read the label back out of it.
  const name = normalizeName(`${label}.${normParent}`);
  const suffix = `.${normParent}`;
  if (!name.endsWith(suffix)) {
    throw new InvalidEnsNameError("Name did not resolve under the expected parent.");
  }
  const normLabel = name.slice(0, name.length - suffix.length);
  if (!normLabel || normLabel.includes(".")) {
    throw new InvalidEnsNameError("That name isn't allowed.");
  }
  return { name, label: normLabel, parent: normParent };
}
