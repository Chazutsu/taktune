import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
	collectionEntryNeedsRefresh,
	createCollectionRunMetrics,
	recordCollectionLookup,
	statusCollectionSignature,
} = require("../src/collection-index-domain.cjs");

describe("collection index domain", () => {
	it("全status定義のID・記号・完了属性を安定署名へ含める", () => {
		const base = [
			{ id: "todo", symbol: "", completed: false },
			{ id: "doing", symbol: "🚦", completed: false },
		];
		const signature = statusCollectionSignature(base);

		expect(statusCollectionSignature(base.map((status) => ({ ...status })))).toBe(signature);
		expect(statusCollectionSignature([base[0], { ...base[1], id: "review" }])).not.toBe(signature);
		expect(statusCollectionSignature([base[0], { ...base[1], symbol: "🔎" }])).not.toBe(signature);
		expect(statusCollectionSignature([base[0], { ...base[1], completed: true }])).not.toBe(
			signature,
		);
	});
	it("同じfile・signature・収集結果なら再解析しない", () => {
		const file = { path: "notes/a.md" };
		const entry = {
			file,
			signature: "10:20:todo",
			value: Promise.resolve({ tasks: [], notes: [] }),
		};

		expect(collectionEntryNeedsRefresh(entry, file, "10:20:todo")).toBe(false);
	});

	it("変更されたfileだけを再解析対象にする", () => {
		const file = { path: "notes/a.md" };
		const value = Promise.resolve({ tasks: [], notes: [] });

		expect(
			collectionEntryNeedsRefresh({ file, signature: "10:20:todo", value }, file, "11:20:todo"),
		).toBe(true);
		expect(
			collectionEntryNeedsRefresh(
				{ file: { ...file }, signature: "10:20:todo", value },
				file,
				"10:20:todo",
			),
		).toBe(true);
		expect(
			collectionEntryNeedsRefresh(
				{ file, signature: "10:20:todo", value: null },
				file,
				"10:20:todo",
			),
		).toBe(true);
	});

	it("signatureを得られない環境では更新を逃さず再解析する", () => {
		const file = { path: "notes/a.md" };
		const entry = {
			file,
			signature: "10:20:todo",
			value: Promise.resolve({ tasks: [], notes: [] }),
		};

		expect(collectionEntryNeedsRefresh(entry, file, "")).toBe(true);
	});

	it("描画単位でcache hitと再解析数を計測する", () => {
		const metrics = createCollectionRunMetrics();
		recordCollectionLookup(metrics, false);
		recordCollectionLookup(metrics, false);
		recordCollectionLookup(metrics, true);

		expect(metrics).toEqual({ lookups: 3, cacheHits: 2, reparsedFiles: 1 });
	});
});
