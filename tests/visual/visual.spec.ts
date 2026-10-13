import { expect, test } from "@playwright/test";

for (const scenario of [
	{
		name: "desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "today",
	},
	{ name: "desktop-dark", viewport: { width: 1280, height: 900 }, theme: "dark", screen: "today" },
	{
		name: "compact-720-light",
		viewport: { width: 720, height: 900 },
		theme: "light",
		screen: "today",
	},
	{ name: "mobile-light", viewport: { width: 390, height: 844 }, theme: "light", screen: "today" },
	{
		name: "collection-loading-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "collection-loading",
	},
	{
		name: "collection-loading-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "collection-loading",
	},
	{
		name: "collection-partial-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "collection-partial",
	},
	{
		name: "collection-partial-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "collection-partial",
	},
	{
		name: "collection-fatal-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "collection-fatal",
	},
	{
		name: "collection-fatal-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "collection-fatal",
	},
	{
		name: "task-detail-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "task-detail",
	},
	{
		name: "task-detail-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "task-detail",
	},
	{
		name: "planning-guide-desktop-light",
		viewport: { width: 780, height: 520 },
		theme: "light",
		screen: "planning-guide",
	},
	{
		name: "planning-guide-mobile-light",
		viewport: { width: 390, height: 520 },
		theme: "light",
		screen: "planning-guide",
	},
	{
		name: "calendar-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "calendar",
	},
	{
		name: "calendar-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "calendar",
	},
	{
		name: "calendar-planning-desktop-light",
		viewport: { width: 900, height: 700 },
		theme: "light",
		screen: "calendar-planning",
	},
	{
		name: "calendar-planning-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "calendar-planning",
	},
	{
		name: "calendar-view-options-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "calendar-view-options",
	},
	{
		name: "calendar-month-mobile-320",
		viewport: { width: 320, height: 700 },
		theme: "light",
		screen: "calendar-month",
	},
	{
		name: "calendar-month-mobile-390",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "calendar-month",
	},
	{
		name: "matrix-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "matrix",
	},
	{
		name: "matrix-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "matrix",
	},
	{
		name: "inbox-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "inbox",
	},
	{
		name: "inbox-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "inbox",
	},
	{
		name: "external-issues-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "external-issues",
	},
	{
		name: "external-issues-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "external-issues",
	},
	{
		name: "stats-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "stats",
	},
	{
		name: "stats-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "stats",
	},
	{
		name: "review-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "review",
	},
	{
		name: "review-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "review",
	},
	{
		name: "review-history-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "review-history",
	},
	{
		name: "review-history-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "review-history",
	},
	{
		name: "review-overflow-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "review-overflow",
	},
	{
		name: "review-overflow-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "review-overflow",
	},
	{
		name: "review-overflow-tasks-desktop-light",
		viewport: { width: 1280, height: 900 },
		theme: "light",
		screen: "review-overflow-tasks",
	},
	{
		name: "review-overflow-tasks-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "review-overflow-tasks",
	},
	{
		name: "view-options-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "view-options",
	},
	{
		name: "review-disabled-mobile-light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		screen: "review-disabled",
	},
] as const) {
	test(scenario.name, async ({ page }) => {
		await page.setViewportSize(scenario.viewport);
		await page.goto(`./?theme=${scenario.theme}&scenario=${scenario.screen}`);
		await expect(page.locator("html")).toHaveAttribute("data-virtual-obsidian-engine", "rust");
		const root = page.locator(".ttd-app");
		await expect(root).toBeVisible();
		await expect(root.locator("[data-missing-icon]")).toHaveCount(0);
		if (scenario.screen === "planning-guide")
			await page.getByRole("button", { name: "今日を計画" }).click();
		if (scenario.viewport.width === 390 && scenario.screen === "review-overflow")
			await page.getByRole("button", { name: "2持ち越し" }).click();
		if (
			scenario.viewport.width === 390 &&
			(scenario.screen === "review-history" || scenario.screen === "review-disabled")
		)
			await page.getByRole("button", { name: "3次週" }).click();
		if (scenario.screen === "today" && scenario.viewport.width === 390) {
			const focus = page.getByTitle(
				"次回リリースに向けて移行順序とロールバック条件を関係者と確定する",
			);
			const box = await focus.locator("..").boundingBox();
			expect(box?.height ?? 0).toBeGreaterThan(24);
			const disclosure = page.getByText("他の重点 1件を表示");
			expect((await disclosure.boundingBox())?.height ?? 0).toBeGreaterThan(24);
			const width = await root.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
			expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
		}
		if (scenario.screen === "collection-loading") {
			await expect(page.getByRole("status")).toContainText("タスクを読み込み中");
		}
		if (scenario.screen === "collection-partial" || scenario.screen === "collection-fatal") {
			await expect(page.getByRole("alert")).toContainText("iCloud");
			const retry = page.getByRole("button", { name: "再試行" });
			await expect(retry).toBeVisible();
			if (scenario.screen === "collection-partial")
				await expect(page.getByText("移行手順を確定し、関係者レビューへ出す")).toBeVisible();
			else await expect(page.getByRole("heading", { name: "今日" })).toHaveCount(0);
			if (scenario.viewport.width === 390) {
				expect((await retry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			}
		}
		if (scenario.screen === "today" && scenario.viewport.width > 390) {
			await page.getByRole("button", { name: "その他の操作" }).first().click();
			const menu = page.getByRole("menu", { name: "その他の操作" });
			const firstItem = menu.getByRole("menuitem").first();
			await expect(firstItem).toBeFocused();
			const styles = await menu.evaluate((element) => {
				const menuStyle = getComputedStyle(element);
				const itemStyle = getComputedStyle(element.querySelector('[role="menuitem"]')!);
				return {
					background: menuStyle.backgroundColor,
					canvasToken: menuStyle.getPropertyValue("--ttd-color-canvas"),
					outlineWidth: itemStyle.outlineWidth,
				};
			});
			expect(styles.background).not.toBe("rgba(0, 0, 0, 0)");
			expect(styles.canvasToken.trim()).not.toBe("");
			expect(Number.parseFloat(styles.outlineWidth)).toBeGreaterThanOrEqual(2);
			await page.keyboard.press("Escape");
			await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		}
		if (scenario.screen === "today" && scenario.viewport.width === 720) {
			const width = await root.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
			expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			await expect(page.getByRole("heading", { name: "今日" })).toBeVisible();
			await expect(page.getByRole("region", { name: "次にやる" })).toBeVisible();
		}
		if (scenario.screen === "task-detail") {
			const detail = page.locator('[aria-label="タスクを編集"]').last();
			await expect(detail).toBeVisible();
			expect(await detail.evaluate((element) => element.scrollTop)).toBe(0);
			const width = await root.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
			expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
		}
		if (scenario.screen === "view-options") {
			await page.getByRole("button", { name: "表示" }).click();
			await expect(page.getByRole("dialog", { name: "表示" })).toBeVisible();
			await expect(page.getByRole("combobox", { name: "並び順" })).toBeFocused();
		}
		if (scenario.screen === "calendar-month") {
			const width = await root.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
			expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			const rootBox = await root.boundingBox();
			for (const day of await root.getByRole("button").all()) {
				const box = await day.boundingBox();
				expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				if (!box || !rootBox) continue;
				const visibleWidth =
					Math.min(box.x + box.width, rootBox.x + rootBox.width) - Math.max(box.x, rootBox.x);
				expect(visibleWidth).toBeGreaterThanOrEqual(44);
			}
			await expect(page.getByText("移行手順を確定する")).toBeHidden();
		}
		if (scenario.screen === "matrix") {
			await expect(page.getByLabel("移行手順を確定するの象限")).toBeVisible();
			if (scenario.viewport.width === 390) {
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
				const box = await page.getByLabel("移行手順を確定するの象限").boundingBox();
				expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
			}
		}
		if (scenario.screen === "inbox") {
			await expect(page.getByRole("alert")).toContainText("Jira");
			await expect(page.getByRole("button", { name: "すべて見る（7）" })).toBeVisible();
			await expect(page.getByText("Linear", { exact: true })).toBeVisible();
			await expect(page.getByText("Jira", { exact: true })).toBeVisible();
			await expect(page.getByText("Slack", { exact: true })).toBeVisible();
			if (scenario.viewport.width === 390) {
				for (const control of await page
					.getByLabel("候補の操作")
					.first()
					.locator("button:visible, a:visible")
					.all()) {
					const box = await control.boundingBox();
					expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				}
				await page
					.getByRole("button", { name: /のその他の操作$/u })
					.first()
					.click();
				for (const name of ["タスク化", "候補から外す"]) {
					const box = await page.getByRole("menuitem", { name, exact: true }).first().boundingBox();
					expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				}
				await page
					.getByRole("button", { name: /のその他の操作$/u })
					.first()
					.click();
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			}
		}
		if (scenario.screen === "stats") {
			await expect(page.getByRole("img", { name: /14日間で/u })).toBeVisible();
			await expect(
				page.getByText("期限超過が2件ある。持ち越す理由と次の行動を整理する。"),
			).toBeVisible();
			const review = page.getByRole("button", { name: "振り返りを始める" });
			await expect(review).toBeVisible();
			if (scenario.viewport.width === 390) {
				const box = await review.boundingBox();
				expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			}
		}
		if (scenario.screen === "external-issues") {
			await expect(page.getByLabel("Issueラベル")).toBeVisible();
			await expect(page.getByText("タスク化済み")).toBeVisible();
			await expect(page.getByRole("button", { name: "未処理だけ" })).toBeVisible();
			if (scenario.viewport.width === 390) {
				for (const name of ["backend", "タスク化", "候補から外す"]) {
					const box = await page.getByRole("button", { name, exact: true }).first().boundingBox();
					expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				}
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			}
		}
		if (scenario.screen === "review-history") {
			const details = page.locator("details").filter({ hasText: "過去の振り返り" });
			await details.locator("summary").click();
			await expect(details).toHaveAttribute("open", "");
			const historyButtons = details.getByRole("button");
			await expect(historyButtons).toHaveCount(3);
			for (const label of ["2026-10-09", "2026-10-02", "2026-09-25"]) {
				await expect(historyButtons.getByText(label, { exact: true })).toBeVisible();
			}
			if (scenario.viewport.width === 390) {
				for (const button of await historyButtons.all()) {
					const box = await button.boundingBox();
					expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
				}
			}
		}
		if (scenario.screen === "review-overflow") {
			await expect(page.getByRole("note")).toContainText("ほか6件");
			const allTasks = page.getByRole("button", { name: "残り6件を確認" });
			await expect(allTasks).toBeVisible();
			if (scenario.viewport.width === 390) {
				const box = await allTasks.boundingBox();
				expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
			}
		}
		if (scenario.screen === "review-overflow-tasks") {
			await expect(page.getByRole("note")).toContainText("まだ判断していない持ち越しだけ");
			const back = page.getByRole("button", { name: "振り返りへ戻る" });
			await expect(back).toBeVisible();
			if (scenario.viewport.width === 390) {
				const backBox = await back.boundingBox();
				expect(backBox?.height ?? 0).toBeGreaterThanOrEqual(44);
				const width = await root.evaluate((element) => ({
					client: element.clientWidth,
					scroll: element.scrollWidth,
				}));
				expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			}
		}
		if (
			(scenario.screen === "review-history" || scenario.screen === "review-disabled") &&
			scenario.viewport.width === 390
		) {
			const save = page.getByRole("button", { name: "保存して今日へ" });
			const saveBox = await save.boundingBox();
			expect(saveBox?.height ?? 0).toBeGreaterThanOrEqual(44);
			const width = await root.evaluate((element) => ({
				client: element.clientWidth,
				scroll: element.scrollWidth,
			}));
			expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
			if (scenario.screen === "review-disabled") {
				await expect(save).toBeDisabled();
				await expect(page.getByText("次の7日間の重点を1件以上決める")).toBeVisible();
			}
		}
		if (scenario.screen === "review" && scenario.viewport.width === 390) {
			const next = page.getByRole("button", { name: "持ち越しを判断" });
			const box = await next.boundingBox();
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		}
		await expect(root).toHaveScreenshot(`${scenario.name}.png`, { animations: "disabled" });
	});
}
