import { stripEdgeEmptyBlocks } from "@reactive-resume/utils/string";

// The fields that hold rich text in a resume: every one of them prints as HTML.
const RICH_TEXT_FIELDS = new Set(["content", "description"]);

const visit = (node: unknown): void => {
	if (Array.isArray(node)) {
		for (const item of node) visit(item);
		return;
	}

	if (!node || typeof node !== "object") return;

	for (const [key, value] of Object.entries(node)) {
		if (RICH_TEXT_FIELDS.has(key) && typeof value === "string") {
			(node as Record<string, unknown>)[key] = stripEdgeEmptyBlocks(value);
			continue;
		}

		visit(value);
	}
};

/**
 * Removes the empty blocks at the edges of every rich-text field.
 *
 * An editor leaves an empty paragraph behind when the caret leaves a list. It holds no text but prints
 * as blank space, so it makes the row it belongs to taller than its neighbours. Cleaning it on the way
 * in keeps every export (PDF, DOCX, ODT) and every preview alike.
 */
export function normalizeRichTextFields<T>(data: T): T {
	visit(data);
	return data;
}
