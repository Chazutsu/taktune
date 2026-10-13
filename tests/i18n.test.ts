import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { relative, join } from "node:path";

const {
	createTranslator,
	displayLocale,
	formatDisplayDate,
	resolveLocale,
	translate,
} = require("../src/i18n.cjs");
const { migrateSettings } = require("../src/settings.cjs");
const en = require("../src/locales/en.cjs");
const ja = require("../src/locales/ja.cjs");

describe("Taktune i18n", () => {
	it("uses English for fresh installs and unsupported locales", () => {
		expect(migrateSettings({}).locale).toBe("en");
		expect(resolveLocale("system", "fr-FR")).toBe("en");
		expect(translate("en", "nav.today")).toBe("Today");
	});

	it("keeps Japanese for existing pre-i18n settings", () => {
		expect(migrateSettings({ settingsVersion: 10, lists: ["仕事"] }).locale).toBe("ja");
		expect(migrateSettings({ settingsVersion: 10, locale: "invalid" }).locale).toBe("ja");
	});

	it("follows Japanese system locale", () => {
		expect(resolveLocale("system", "ja-JP")).toBe("ja");
		expect(createTranslator("ja")("nav.today")).toBe("今日");
	});

	it("honors explicit locale and interpolates values", () => {
		expect(resolveLocale("en", "ja-JP")).toBe("en");
		expect(translate("en", "sidebar.incomplete", { count: 3 })).toBe("3 incomplete");
	});

	it.each([
		["en", "en-US", "Mon"],
		["ja", "ja-JP", "月"],
	] as const)("formats calendar weekdays with the %s interface locale", (locale, tag, weekday) => {
		const dateKey = "2026-10-12";
		expect(displayLocale(locale)).toBe(tag);
		expect(formatDisplayDate(locale, new Date(`${dateKey}T00:00:00`), { weekday: "short" })).toBe(
			weekday,
		);
		expect(dateKey).toBe("2026-10-12");
	});

	it("keeps agenda, stats, and reminder date labels aligned with the interface locale", () => {
		const date = new Date("2026-10-12T13:05:00");
		const options: Intl.DateTimeFormatOptions = {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		};
		expect(formatDisplayDate("en", date, options)).toMatch(/Oct/u);
		expect(formatDisplayDate("ja", date, options)).toMatch(/10月/u);
	});

	it("does not hard-code Japanese display formatters in the plugin", () => {
		const plugin = readFileSync(join(__dirname, "../src/plugin.cjs"), "utf8");
		expect(plugin).not.toContain('Intl.DateTimeFormat("ja-JP"');
	});

	it("keeps English and Japanese catalogs complete and English-first", () => {
		expect(Object.keys(en).toSorted()).toEqual(Object.keys(ja).toSorted());
		expect(Object.values(en).filter((value) => /[ぁ-んァ-ヶ一-龯]/u.test(String(value)))).toEqual(
			[],
		);
	});

	it("keeps every source file English-first except strict compatibility parsing", () => {
		const sourceRoot = join(__dirname, "../src");
		const files = readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && /\.(?:cjs|ts|tsx)$/u.test(entry.name))
			.map((entry) => join(entry.parentPath, entry.name));
		const compatibilityAllowlist: Record<string, RegExp[]> = {
			"plugin.cjs": [
				/const IMPORTANT_TAG = "#重要"/u,
				/const URGENT_TAG = "#緊急"/u,
				/#\(\?:重要\|緊急\)/u,
			],
			"settings.cjs": [
				/new Set\(\["未着手", "Not started"\]\)/u,
				/new Set\(\["進行中", "In progress"\]\)/u,
				/new Set\(\["待機", "Waiting"\]\)/u,
			],
			"task-input-domain.cjs": [
				/tag !== "重要" && tag !== "緊急"/u,
				/今日\|明日/u,
				/token === "今日"/u,
				/\?:分/u,
				/分\|時間\|日/u,
				/\{ 分: 1, 時間: 60, 日: 1440 \}/u,
				/高\|中\|低/u,
				/\{ 高: 3, 中: 2, 低: 0 \}/u,
				/\["重要", "緊急"\]/u,
				/毎日\|平日\|毎週\|毎月\|毎年/u,
				/^\s*(?:毎日|平日|毎週|毎月|毎年): "every (?:day|weekday|week|month|year)",?$/u,
			],
			"task-structure-domain.cjs": [/LEGACY_TASK_CREATED_ACTIVITY = "タスクを作成"/u],
		};
		const violations = files.flatMap((file) => {
			const path = relative(sourceRoot, file);
			if (path === "locales/ja.cjs") return [];
			return readFileSync(file, "utf8")
				.split("\n")
				.map((line, index) => ({ line, number: index + 1 }))
				.filter(({ line }) => /[ぁ-んァ-ヶ一-龯]/u.test(line))
				.filter(
					({ line }) => !(compatibilityAllowlist[path] || []).some((pattern) => pattern.test(line)),
				)
				.map(({ line, number }) => `src/${path}:${number}: ${line.trim()}`);
		});
		expect(violations).toEqual([]);
	});
});
