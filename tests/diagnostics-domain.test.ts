import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const {
	createEnvironmentDiagnostics,
	gwsExecutableCandidates,
	settledCalendarGroups,
} = require("../src/diagnostics-domain.cjs");

describe("diagnostics domain", () => {
	const diagnostics = createEnvironmentDiagnostics({
		cacheAgeOf: (cache: { age?: string } | null) =>
			cache?.age === "fresh"
				? { available: true, stale: false, hours: 2 }
				: cache?.age === "stale"
					? { available: true, stale: true, hours: 72 }
					: { available: false, stale: false, hours: 0 },
		inboxPath: "private/tasks/TODO Inbox.md",
		settingsSchemaVersion: 7,
		t: jaDomainTranslator,
	});

	it("モバイル環境の復旧対象を重要度付きで列挙する", () => {
		const items = diagnostics({
			googleCalendarCache: null,
			googleCalendarEnabled: true,
			inboxPresent: false,
			isMobile: true,
			nodeSupport: false,
			notificationPermission: "denied",
			performanceSnapshot: { noteCount: 30, scanMs: 420, taskCount: 100, totalMs: 1_200 },
			secretStorage: false,
			settingsVersion: 6,
			statusCount: 0,
		});

		expect(
			Object.fromEntries(items.map((item: { id: string; level: string }) => [item.id, item.level])),
		).toEqual({
			settings: "error",
			inbox: "info",
			secrets: "error",
			statuses: "error",
			node: "info",
			"calendar-cache": "error",
			notifications: "error",
			performance: "error",
		});
		expect(items.find((item: { id: string }) => item.id === "inbox")?.detail).toBe(
			"Inboxはまだ作成されていない",
		);
		expect(items.find((item: { id: string }) => item.id === "calendar-cache")?.repair).toContain(
			"デスクトップ",
		);
	});

	it("予定キャッシュの鮮度と描画時間の境界を反映する", () => {
		const base = {
			googleCalendarEnabled: true,
			inboxPresent: true,
			isMobile: false,
			nodeSupport: true,
			notificationPermission: "granted",
			secretStorage: true,
			settingsVersion: 7,
			statusCount: 3,
		};
		const fresh = diagnostics({
			...base,
			googleCalendarCache: { age: "fresh", items: [{}, {}] },
			performanceSnapshot: { noteCount: 5, scanMs: 10, taskCount: 20, totalMs: 300 },
		});
		const stale = diagnostics({
			...base,
			googleCalendarCache: { age: "stale", items: [{}] },
			performanceSnapshot: { noteCount: 5, scanMs: 10, taskCount: 20, totalMs: 301 },
		});

		expect(fresh.find((item: { id: string }) => item.id === "calendar-cache")).toMatchObject({
			level: "ok",
			detail: "2件 · 2時間前に更新",
		});
		expect(stale.find((item: { id: string }) => item.id === "calendar-cache")).toMatchObject({
			level: "info",
			detail: "1件 · 72時間前に更新",
		});
		expect(fresh.find((item: { id: string }) => item.id === "performance")?.level).toBe("ok");
		expect(stale.find((item: { id: string }) => item.id === "performance")?.level).toBe("info");
	});

	it("gws候補を優先順のまま重複排除する", () => {
		expect(gwsExecutableCandidates(" /custom/gws ", "/Users/test", "/custom/gws")).toEqual([
			"/custom/gws",
			"/Users/test/.volta/bin/gws",
			"/Users/test/.local/bin/gws",
			"/opt/homebrew/bin/gws",
			"/usr/local/bin/gws",
			"gws",
		]);
	});

	it("カレンダーの部分失敗でも取得済み予定を維持する", () => {
		const result = settledCalendarGroups(
			[{ label: "仕事" }, { label: "個人" }, {}],
			[
				{ status: "fulfilled", value: [{ id: "event-1" }] },
				{ status: "rejected", reason: new Error("認証切れ") },
				{ status: "rejected", reason: "タイムアウト" },
			],
			jaDomainTranslator,
		);

		expect(result.items).toEqual([{ id: "event-1" }]);
		expect(result.errors).toEqual(["個人: 認証切れ", "カレンダー: タイムアウト"]);
	});
});
