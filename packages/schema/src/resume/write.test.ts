import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./data";
import { defaultResumeData } from "./default";
import { sampleResumeData } from "./sample";
import { parseResumeDataForWrite, writableResumeDataSchema } from "./write";

describe("writableResumeDataSchema", () => {
	it.each([defaultResumeData, sampleResumeData])("accepts canonical initial resume data", (data) => {
		expect(parseResumeDataForWrite(data)).toEqual(resumeDataSchema.parse(data));
	});

	it("defaults absent legacy style rules while rejecting an explicitly invalid value", () => {
		const { styleRules: _, ...metadata } = defaultResumeData.metadata;
		const data = { ...defaultResumeData, metadata };
		expect(parseResumeDataForWrite(data).metadata.styleRules).toEqual([]);
		expect(
			writableResumeDataSchema.safeParse({
				...data,
				metadata: { ...metadata, styleRules: null },
			}).success,
		).toBe(false);
	});

	it("preserves historical stylesheet normalization", () => {
		const source = { languageVersion: 1, text: "@version 1;\nname { color: red; }\n" };
		const data = {
			...defaultResumeData,
			metadata: { ...defaultResumeData.metadata, stylesheet: { mode: "semantic", source, applied: source } },
		};
		expect(parseResumeDataForWrite(data).metadata.stylesheet).toEqual({ mode: "semantic", source });
	});

	it("does not change existing legacy style-rule filtering", () => {
		const data = {
			...defaultResumeData,
			metadata: {
				...defaultResumeData.metadata,
				styleRules: [
					{
						id: "legacy",
						label: "",
						enabled: true,
						target: { scope: "global" },
						slots: { heading: { lineHeight: 5 } },
					},
				],
			},
		};
		expect(parseResumeDataForWrite(data).metadata.styleRules).toEqual([]);
	});

	it("rejects bounds within custom-section item arrays", () => {
		const data = {
			...defaultResumeData,
			customSections: [
				{
					...sampleResumeData.sections.skills,
					id: "custom-skills",
					type: "skills",
					items: [{ ...sampleResumeData.sections.skills.items[0], level: 6 }],
				},
			],
		};
		expect(writableResumeDataSchema.safeParse(data).success).toBe(false);
	});

	it("cleans the empty blocks at the edges of every rich-text field", () => {
		const data = {
			...sampleResumeData,
			summary: { ...sampleResumeData.summary, content: "<p>Summary</p><p></p>" },
			sections: {
				...sampleResumeData.sections,
				experience: {
					...sampleResumeData.sections.experience,
					items: [
						{
							...sampleResumeData.sections.experience.items[0],
							description: "<p>Work</p><p></p>",
						},
					],
				},
			},
			customSections: [
				{
					id: "custom-summary",
					type: "summary",
					title: "Skills",
					icon: "compass-tool",
					columns: 1,
					hidden: false,
					showHeading: true,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "item-1", hidden: false, content: "<ul><li>Node</li></ul><p></p>" }],
				},
			],
		};

		const parsed = parseResumeDataForWrite(data);
		expect(parsed.summary.content).toBe("<p>Summary</p>");
		expect(parsed.sections.experience.items[0]?.description).toBe("<p>Work</p>");
		const [customSection] = parsed.customSections;
		expect(customSection?.items[0]).toMatchObject({ content: "<ul><li>Node</li></ul>" });
	});
});
