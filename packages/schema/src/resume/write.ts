import type { ResumeData } from "./data";
import z from "zod";
import { resumeDataSchema } from "./data";
import { createResumeDataJsonSchema } from "./json-schema";
import { normalizeRichTextFields } from "./rich-text";

const publishedInputSchema = z.fromJSONSchema(createResumeDataJsonSchema());

/** Validate submitted values before tolerant read-time fallbacks can replace them. */
export const writableResumeDataSchema = z.transform<z.input<typeof resumeDataSchema>, ResumeData>((input, ctx) => {
	// Keep canonical diagnostics and migrations, including historical stylesheet metadata.
	const canonical = resumeDataSchema.safeParse(input);
	if (!canonical.success) {
		for (const issue of canonical.error.issues) ctx.addIssue({ ...issue });
		return z.NEVER;
	}

	// The stylesheet parser already validates strictly and removes the historical `applied` field.
	// Preserve that migration without normalizing any submitted values with catch fallbacks.
	const submitted = publishedInputSchema.safeParse({
		...input,
		metadata: {
			...input.metadata,
			// JSON Schema cannot represent the fallback on this transformed historical field.
			styleRules: input.metadata.styleRules === undefined ? [] : input.metadata.styleRules,
			stylesheet: canonical.data.metadata.stylesheet,
		},
	});
	if (!submitted.success) {
		for (const issue of submitted.error.issues) ctx.addIssue({ ...issue });
		return z.NEVER;
	}

	// Use the canonical result so JSON Schema conversion cannot strip compatible extra data.
	// Rich text is cleaned on the way in: an empty block at the edge of a field prints as blank space.
	return normalizeRichTextFields(canonical.data);
});

export const parseResumeDataForWrite = (data: unknown): ResumeData => writableResumeDataSchema.parse(data);
