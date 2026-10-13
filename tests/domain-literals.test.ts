import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = (name: string) => readFileSync(resolve(process.cwd(), "src", name), "utf8");
const japaneseLines = (value: string) =>
	value.split("\n").filter((line) => /[ぁ-んァ-ヶ一-龠々ー]/u.test(line));

describe("domain locale literal boundary", () => {
	it("表示生成ファイルに日本語literalを残さない", () => {
		for (const name of ["stats-domain.cjs", "dashboard-shell-domain.cjs", "ui/contracts.ts"])
			expect(japaneseLines(src(name)), name).toEqual([]);
	});

	it("task inputの日本語は自然文parser互換だけに限定する", () => {
		const source = src("task-input-domain.cjs");
		const parserEnd = source.indexOf("function offsetReminder");
		expect(parserEnd).toBeGreaterThan(0);
		expect(japaneseLines(source).every((line) => source.indexOf(line) < parserEnd)).toBe(true);
	});

	it("task structureの日本語は旧履歴認識定数だけに限定する", () => {
		expect(japaneseLines(src("task-structure-domain.cjs"))).toEqual([
			'const LEGACY_TASK_CREATED_ACTIVITY = "タスクを作成";',
		]);
	});
});
