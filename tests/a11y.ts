import axe, { type AxeResults, type RunOptions } from "axe-core";
import { expect } from "vitest";

const options: RunOptions = {
	resultTypes: ["violations"],
	rules: {
		// jsdom does not provide layout or computed colors. Contrast remains a visual/Electron check.
		"color-contrast": { enabled: false },
	},
};

// axe probes canvas even with color contrast disabled; jsdom's stub emits a noisy not-implemented error.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
	configurable: true,
	value: () => null,
});

function seriousViolations(results: AxeResults) {
	return results.violations.filter(
		(violation) => violation.impact === "critical" || violation.impact === "serious",
	);
}

export async function expectNoSeriousA11yViolations(container: Element): Promise<void> {
	const results = await axe.run(container, options);
	const violations = seriousViolations(results);
	const summary = violations
		.map(
			(violation) =>
				`${violation.id}: ${violation.help}\n${violation.nodes
					.map((node) => `  ${node.target.join(" ")}: ${node.failureSummary || ""}`)
					.join("\n")}`,
		)
		.join("\n\n");
	expect(violations, summary).toEqual([]);
}
