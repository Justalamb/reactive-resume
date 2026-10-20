import _slugify from "@sindresorhus/slugify";
import { adjectives, animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import { v7 as uuidv7 } from "uuid";

/**
 * Generates a unique ID using the UUIDv7 algorithm.
 * @returns The generated ID.
 */
export function generateId() {
	return uuidv7();
}

/** Slugifies a string, with some pre-defined options.
 *
 * @param value - The value to slugify.
 * @returns The slugified value.
 */
export function slugify(value: string) {
	const slug = _slugify(value, { decamelize: false });
	if (slug || !value.trim()) return slug;
	return slugify(generateRandomName());
}

/**
 * Generates initials from a name.
 * @param name - The name to generate initials from.
 * @returns The initials.
 */
export function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

/**
 * Transforms a string to a valid username (lowercase, no special characters except for dots, hyphens and underscores).
 * @param value - The value to transform.
 * @returns The transformed username.
 */
export function toUsername(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]/g, "")
		.slice(0, 64);
}

/**
 * Generates a random name using the unique-names-generator library.
 * @returns The random name.
 */
export function generateRandomName() {
	return uniqueNamesGenerator({
		dictionaries: [adjectives, colors, animals],
		style: "capital",
		separator: " ",
		length: 3,
	});
}

/**
 * Strips HTML tags from a string and returns the text content.
 * @param html - The HTML string to strip.
 * @returns The text content without HTML tags.
 */
/** Text safe to place inside HTML: markup characters and both quote marks become entities. */
export const escapeHtml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

export function stripHtml(html: string | undefined): string {
	if (!html) return "";
	return html.replace(/<[^>]*>/g, "").trim();
}

// An empty block holds no text: it prints as blank space, so one left at the end of a field makes the
// row it belongs to taller than its neighbours. Editors leave them behind when the caret leaves a list.
const EMPTY_EDGE_BLOCK = "(?:<br\\s*/?>|<p\\b[^>]*>\\s*</p>)+";

/**
 * Removes the empty blocks at both edges of a rich-text fragment.
 * @param html - The HTML string to clean.
 * @returns The HTML without its leading or trailing empty blocks.
 */
export function stripEdgeEmptyBlocks(html: string): string {
	if (!html) return html;
	return html
		.replace(new RegExp(`^${EMPTY_EDGE_BLOCK}`, "i"), "")
		.replace(new RegExp(`${EMPTY_EDGE_BLOCK}\\s*$`, "i"), "");
}
