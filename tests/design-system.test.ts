// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Taktune design system", () => {
	const tokens = readFileSync(
		resolve(import.meta.dirname, "../src/design-system/tokens.css"),
		"utf8",
	);
	const entry = readFileSync(resolve(import.meta.dirname, "../src/styles.css"), "utf8");
	const productSurfaces = [
		"dashboard-main.tsx",
		"task-list.tsx",
		"inbox-triage.tsx",
		"external-issues.tsx",
		"calendar-controls.tsx",
		"calendar-time-blocks.tsx",
		"plan-tray.tsx",
		"review-reminder.tsx",
		"review.tsx",
		"stats.tsx",
	].map((file) => readFileSync(resolve(import.meta.dirname, `../src/ui/${file}`), "utf8"));

	it("Obsidianテーマをプロダクト固有の意味トークンへ変換する", () => {
		expect(tokens).toContain("--ttd-color-canvas: var(--background-primary)");
		expect(tokens).toContain("--ttd-control-height-touch: 44px");
		expect(tokens).toContain("prefers-reduced-motion: reduce");
	});

	it("Tailwindの入口から専用トークンを読み込む", () => {
		expect(entry).toContain('@import "./design-system/tokens.css"');
	});

	it("主要な判断面はObsidian変数ではなくプロダクト意味トークンを使う", () => {
		for (const source of productSurfaces) {
			expect(source).not.toMatch(/var\(--(?:background|text|interactive|color)-/);
			expect(source).toMatch(
				/ttd-(?:canvas|surface|hover|selected|border|text|muted|faint|accent|danger|priority)/,
			);
		}
	});
});
