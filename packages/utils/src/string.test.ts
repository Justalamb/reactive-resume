import { describe, expect, it } from "vitest";
import { slugify, stripEdgeEmptyBlocks, toUsername } from "./string";

describe("slugify", () => {
	it("falls back to a non-empty slug for CJK input", () => {
		expect(slugify("中文简历")).not.toBe("");
	});
});

describe("toUsername", () => {
	it("removes characters outside [a-z0-9._-]", () => {
		expect(toUsername("  John!@#Doe$%^  ")).toBe("johndoe");
		expect(toUsername("john.doe_test-123")).toBe("john.doe_test-123");
	});

	it("truncates to 64 characters max", () => {
		const longName = "a".repeat(100);
		expect(toUsername(longName)).toHaveLength(64);
	});
});

describe("stripEdgeEmptyBlocks", () => {
	it("drops the empty paragraph a list leaves behind", () => {
		expect(stripEdgeEmptyBlocks("<ul><li>Node / Bun</li></ul><p></p>")).toBe("<ul><li>Node / Bun</li></ul>");
	});

	it("drops every empty paragraph at the end", () => {
		expect(stripEdgeEmptyBlocks("<ul><li>Node / Bun</li></ul><p></p><p></p>")).toBe("<ul><li>Node / Bun</li></ul>");
	});

	it("keeps the paragraph when it holds text", () => {
		expect(stripEdgeEmptyBlocks("<p>text</p>")).toBe("<p>text</p>");
		expect(stripEdgeEmptyBlocks("<p>text<br></p>")).toBe("<p>text<br></p>");
	});

	it("drops the empty blocks at the start", () => {
		expect(stripEdgeEmptyBlocks("<p></p><ul><li>Node / Bun</li></ul>")).toBe("<ul><li>Node / Bun</li></ul>");
	});

	it("keeps an empty paragraph in the middle, where it separates blocks", () => {
		expect(stripEdgeEmptyBlocks("<p>one</p><p></p><p>two</p>")).toBe("<p>one</p><p></p><p>two</p>");
	});

	it("keeps a paragraph that holds a non-breaking space", () => {
		expect(stripEdgeEmptyBlocks("<p>&nbsp;</p>")).toBe("<p>&nbsp;</p>");
	});

	it("handles empty input", () => {
		expect(stripEdgeEmptyBlocks("")).toBe("");
	});
});
