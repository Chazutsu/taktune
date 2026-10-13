import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const endpoint = process.env.OBSIDIAN_CDP_URL || "http://127.0.0.1:9222";
const artifactDirectory = new URL("../../test-results/obsidian-shell/", import.meta.url);
const manifest = JSON.parse(
	await readFile(new URL("../../manifest.json", import.meta.url), "utf8"),
);

function visibleButton(page, name) {
	return page.getByRole("button", { name }).filter({ visible: true }).first();
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function selectView(page, buttonName, heading) {
	const button = visibleButton(page, buttonName);
	await button.waitFor({ state: "visible", timeout: 10_000 });
	await button.click();
	await page
		.getByRole("heading", { name: heading, exact: true })
		.filter({ visible: true })
		.waitFor({ timeout: 10_000 });
}

async function expectTouchTarget(locator, label) {
	const box = await boundingBoxWithRerenderRetry(locator);
	if (!box || box.width < 44 || box.height < 44) {
		throw new Error(
			`${label}の操作領域が44px未満: ${box ? `${box.width}x${box.height}` : "計測不能"}`,
		);
	}
}

async function boundingBoxWithRerenderRetry(locator) {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		await locator.waitFor({ state: "visible", timeout: 10_000 });
		const box = await locator.boundingBox();
		if (box) return box;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return null;
}

async function computedStyleWithRerenderRetry(locator, property) {
	let value = "";
	for (let attempt = 0; attempt < 5; attempt += 1) {
		await locator.waitFor({ state: "visible", timeout: 10_000 });
		value = await locator.evaluate(
			(element, name) => (element.isConnected ? getComputedStyle(element)[name] : ""),
			property,
		);
		if (value) return value;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return value;
}

async function dismissCommandPalette(page) {
	const palette = page.locator(".prompt").filter({ visible: true }).first();
	if (!(await palette.isVisible())) return;
	await page.keyboard.press("Escape");
	await palette.waitFor({ state: "hidden", timeout: 5_000 });
}

async function reloadDashboardPlugin(page) {
	const visibleModal = page.locator(".modal-container").filter({ visible: true }).first();
	if (await visibleModal.isVisible())
		throw new Error("入力中のモーダルが開いているため、Taktuneを再読み込みできない");
	const result = await page.evaluate(
		async ({ pluginId }) => {
			const plugins = globalThis.app?.plugins;
			if (!plugins?.enabledPlugins?.has(pluginId)) return { enabled: false, version: "" };
			await plugins.disablePlugin(pluginId);
			await plugins.enablePlugin(pluginId);
			return {
				enabled: plugins.enabledPlugins.has(pluginId),
				version: plugins.plugins[pluginId]?.manifest?.version || "",
			};
		},
		{ pluginId: manifest.id },
	);
	if (!result.enabled) throw new Error("Taktuneを再読み込みできなかった");
	if (result.version !== manifest.version)
		throw new Error(
			`実行中プラグインの版が不一致: ${result.version || "不明"} / 期待 ${manifest.version}`,
		);
}

const browser = await chromium.connectOverCDP(endpoint);
try {
	const pages = browser.contexts().flatMap((context) => context.pages());
	const page =
		pages.find((candidate) => candidate.url().startsWith("app://obsidian.md")) ?? pages[0];
	if (!page) throw new Error("Obsidianのウィンドウが見つからない");
	await page.setViewportSize({ width: 1440, height: 1000 });
	await dismissCommandPalette(page);
	await reloadDashboardPlugin(page);
	const capabilities = await page.evaluate(() => ({
		secretStorage: Boolean(globalThis.app?.secretStorage),
	}));
	if (!capabilities.secretStorage)
		throw new Error(`最低対応版${manifest.minAppVersion}で必須のSecretStorageを利用できない`);

	const activation = await page.evaluate(async () => {
		const obsidian = globalThis.app;
		if (!obsidian?.commands) throw new Error("Obsidian app APIを取得できない");
		for (let attempt = 0; attempt < 3; attempt += 1) {
			await obsidian.commands.executeCommandById("ticktick-dashboard:open-dashboard");
		}
		return {
			enabled: obsidian.plugins?.enabledPlugins?.has("ticktick-dashboard") ?? false,
			leaves: obsidian.workspace.getLeavesOfType("ticktick-dashboard-view").length,
		};
	});
	if (!activation.enabled) throw new Error("Taktuneが有効化されていない");
	if (activation.leaves !== 1)
		throw new Error(`連続起動後にDashboardタブが${activation.leaves}件ある`);

	const dashboard = page.locator(".ttd-app").filter({ visible: true }).first();
	await dashboard.waitFor({ state: "visible", timeout: 15_000 });
	await selectView(page, /^今日(?:、\d+件)?$/u, "今日");
	await selectView(page, /^受信箱(?:、\d+件)?$/u, "受信箱");
	await selectView(page, /^時間割(?:、\d+件)?$/u, "時間割");

	const sidebarToggle = visibleButton(page, /すべてのビューと分類を開く|ナビゲーションを閉じる/u);
	if ((await sidebarToggle.getAttribute("aria-expanded")) !== "true") await sidebarToggle.click();
	const originalPlanningSection = await page.evaluate(() =>
		Boolean(
			globalThis.app.plugins.plugins["ticktick-dashboard"].settings.sidebarSections?.planning,
		),
	);
	try {
		await page
			.getByLabel(originalPlanningSection ? "計画を閉じる" : "計画を開く")
			.filter({ visible: true })
			.first()
			.click();
		await page.waitForFunction(
			(expected) =>
				Boolean(
					globalThis.app.plugins.plugins["ticktick-dashboard"].settings.sidebarSections?.planning,
				) === expected,
			!originalPlanningSection,
		);
		await page.evaluate(async () => {
			const view = globalThis.app.workspace.getLeavesOfType("ticktick-dashboard-view")[0]?.view;
			await view?.render();
		});
		await page
			.getByLabel(originalPlanningSection ? "計画を開く" : "計画を閉じる")
			.filter({ visible: true })
			.first()
			.waitFor({ state: "visible" });
	} finally {
		const restorePlanning = page
			.getByLabel(originalPlanningSection ? "計画を開く" : "計画を閉じる")
			.filter({ visible: true })
			.first();
		if (await restorePlanning.isVisible()) await restorePlanning.click();
		await page.waitForFunction(
			(expected) =>
				Boolean(
					globalThis.app.plugins.plugins["ticktick-dashboard"].settings.sidebarSections?.planning,
				) === expected,
			originalPlanningSection,
		);
	}

	await selectView(page, /^振り返り(?:、\d+件)?$/u, "振り返り");
	await page.evaluate(async () => {
		const view = globalThis.app.workspace.getLeavesOfType("ticktick-dashboard-view")[0]?.view;
		if (!view) throw new Error("Dashboard Viewが見つからない");
		view.filter = "stats";
		await view.render();
	});
	await page
		.getByRole("heading", { name: "実績", exact: true })
		.filter({ visible: true })
		.waitFor({ timeout: 10_000 });
	const desktopSummary = page.getByLabel("直近7日の実績概要").filter({ visible: true }).first();
	if ((await desktopSummary.locator(":scope > div").count()) !== 4)
		throw new Error("実績概要が4指標ではない");
	if (!(await desktopSummary.getByText("直近7日の計画実行", { exact: true }).isVisible()))
		throw new Error("実績概要に計画実行が表示されない");
	const completionTrend = page
		.getByRole("heading", { name: "14日間の完了数" })
		.filter({ visible: true })
		.first()
		.locator("xpath=ancestor::section[1]");
	const priorityBreakdown = page
		.getByRole("heading", { name: "未完了の優先度" })
		.filter({ visible: true })
		.first()
		.locator("xpath=ancestor::section[1]");
	const listBreakdown = page
		.getByRole("heading", { name: "未完了のリスト" })
		.filter({ visible: true })
		.first()
		.locator("xpath=ancestor::section[1]");
	const [trendBox, priorityBox, listBox] = await Promise.all([
		completionTrend.boundingBox(),
		priorityBreakdown.boundingBox(),
		listBreakdown.boundingBox(),
	]);
	if (
		!trendBox ||
		!priorityBox ||
		!listBox ||
		Math.abs(trendBox.y - priorityBox.y) > 2 ||
		Math.abs(trendBox.y - listBox.y) > 2
	) {
		throw new Error("横長画面で実績の推移・優先度・リストが同じ分析行に並んでいない");
	}
	if (trendBox.height > 190)
		throw new Error(`14日推移が縦幅を使いすぎている: ${trendBox.height}px`);

	await mkdir(artifactDirectory, { recursive: true });
	await dashboard.screenshot({
		path: new URL("major-routes.png", artifactDirectory).pathname,
		animations: "disabled",
	});

	const desktopViewport = await page.evaluate(() => ({
		width: window.innerWidth,
		height: window.innerHeight,
	}));
	await page.setViewportSize({ width: 390, height: 844 });
	const activeVaultName = await page.evaluate(() => globalThis.app.vault.getName());
	await page.evaluate(async () =>
		globalThis.app.commands.executeCommandById("ticktick-dashboard:diagnostics"),
	);
	const diagnosticsHeading = page
		.getByRole("heading", { name: "Taktune 診断" })
		.filter({ visible: true })
		.first();
	await diagnosticsHeading.waitFor({ state: "visible", timeout: 10_000 });
	const diagnosticsPanel = diagnosticsHeading.locator("xpath=ancestor::section[1]");
	if (
		!(await diagnosticsPanel
			.getByText(new RegExp(`Vault: ${escapeRegExp(activeVaultName)}`, "u"))
			.isVisible())
	)
		throw new Error(`モバイル診断に起動元Vault名「${activeVaultName}」が表示されない`);
	const connectionButton = diagnosticsPanel.getByRole("button", { name: "接続を確認" });
	await expectTouchTarget(connectionButton, "接続を確認");
	let integrationResults = [];
	if (process.env.TTD_TEST_INTEGRATIONS === "1") {
		await connectionButton.click();
		await diagnosticsPanel
			.getByRole("button", { name: "再確認" })
			.waitFor({ state: "visible", timeout: 60_000 });
		integrationResults = await diagnosticsPanel
			.getByRole("list", { name: "接続確認結果" })
			.getByRole("listitem")
			.allTextContents();
		if (integrationResults.length !== 4)
			throw new Error(`外部連携の接続結果が${integrationResults.length}件しかない`);
		const failures = integrationResults.filter((result) => result.includes("失敗"));
		if (failures.length) throw new Error(`設定済み外部連携に失敗した: ${failures.join(" / ")}`);
	}
	await expectTouchTarget(
		diagnosticsPanel.getByRole("button", { name: "診断結果をコピー" }),
		"診断結果をコピー",
	);
	await page.keyboard.press("Escape");
	await diagnosticsHeading.waitFor({ state: "hidden" });
	const closeNavigation = visibleButton(page, "ナビゲーションを閉じる");
	if (await closeNavigation.isVisible()) await closeNavigation.click();
	for (const item of [
		{ button: /^今日(?:、\d+件)?$/u, heading: "今日", label: "今日" },
		{ button: /^受信箱(?:、\d+件)?$/u, heading: "受信箱", label: "受信箱" },
		{ button: /^時間割(?:、\d+件)?$/u, heading: "時間割", label: "時間割" },
	]) {
		const target = visibleButton(page, item.button);
		await expectTouchTarget(target, item.label);
		await selectView(page, item.button, item.heading);
	}
	const calendarScroll = page.locator("[data-calendar-scroll]").filter({ visible: true }).first();
	const scrollMetrics = await calendarScroll.evaluate((element) => ({
		clientHeight: element.clientHeight,
		scrollHeight: element.scrollHeight,
		scrollTop: element.scrollTop,
	}));
	if (scrollMetrics.scrollHeight <= scrollMetrics.clientHeight) {
		throw new Error(
			`モバイル時間軸が内部スクロール領域になっていない: ${scrollMetrics.scrollHeight}px <= ${scrollMetrics.clientHeight}px`,
		);
	}
	const currentTime = page
		.getByLabel(/^現在時刻 /u)
		.filter({ visible: true })
		.first();
	if (await currentTime.isVisible()) {
		const [scrollBox, currentBox] = await Promise.all([
			calendarScroll.boundingBox(),
			currentTime.boundingBox(),
		]);
		if (
			!scrollBox ||
			!currentBox ||
			currentBox.y < scrollBox.y ||
			currentBox.y > scrollBox.y + scrollBox.height
		) {
			throw new Error(
				`現在時刻がモバイル時間軸の可視範囲にない: scrollTop=${scrollMetrics.scrollTop}px`,
			);
		}
	}
	const expandTray = visibleButton(page, "未配置タスクを開く");
	if (await expandTray.isVisible()) {
		await expandTray.click();
	}
	const collapseTray = visibleButton(page, "未配置タスクをたたむ");
	await expectTouchTarget(collapseTray, "未配置タスクをたたむ");
	const expandedTimeline = await calendarScroll.boundingBox();
	await collapseTray.click();
	const collapsedPlanTray = page
		.getByRole("complementary")
		.filter({ hasText: "未配置タスク", visible: true })
		.first();
	await collapsedPlanTray.waitFor({ state: "visible" });
	const collapsedCalendarScroll = page
		.locator("[data-calendar-scroll]")
		.filter({ visible: true })
		.first();
	const collapsedTimeline = await collapsedCalendarScroll.boundingBox();
	if (
		!expandedTimeline ||
		!collapsedTimeline ||
		collapsedTimeline.height <= expandedTimeline.height
	) {
		throw new Error(
			`未配置トレイをたたんでも時間軸が広がらない: ${expandedTimeline?.height ?? 0}px → ${collapsedTimeline?.height ?? 0}px`,
		);
	}
	const openNavigation = visibleButton(page, "すべてのビューと分類を開く");
	await expectTouchTarget(openNavigation, "ナビゲーションを開く");
	await openNavigation.click();
	await expectTouchTarget(visibleButton(page, "ナビゲーションを閉じる"), "ナビゲーションを閉じる");
	await visibleButton(page, "ナビゲーションを閉じる").click();
	const persistedCollapsedTray = visibleButton(page, "未配置タスクを開く");
	await persistedCollapsedTray.waitFor({ state: "visible" });
	const rerenderedTimelineHeight = await page.evaluate(() =>
		Math.max(
			0,
			...Array.from(document.querySelectorAll("[data-calendar-scroll]"))
				.map((element) => element.getBoundingClientRect())
				.filter((rect) => rect.width > 0 && rect.height > 0)
				.map((rect) => rect.height),
		),
	);
	if (rerenderedTimelineHeight < collapsedTimeline.height - 1) {
		throw new Error(
			`再描画後に未配置トレイの縮小状態が失われた: ${collapsedTimeline.height}px → ${rerenderedTimelineHeight}px`,
		);
	}
	const dashboardWidth = await dashboard.evaluate((element) => ({
		client: element.clientWidth,
		scroll: element.scrollWidth,
	}));
	if (dashboardWidth.scroll > dashboardWidth.client + 1) {
		throw new Error(
			`390px幅でDashboardが横溢れしている: ${dashboardWidth.scroll}px > ${dashboardWidth.client}px`,
		);
	}
	await dashboard.screenshot({
		path: new URL("mobile-shell.png", artifactDirectory).pathname,
		animations: "disabled",
	});
	await page.evaluate(async () => {
		const view = globalThis.app.workspace.getLeavesOfType("ticktick-dashboard-view")[0]?.view;
		if (!view) throw new Error("Dashboard Viewが見つからない");
		view.filter = "stats";
		await view.render();
	});
	await page
		.getByRole("heading", { name: "実績", exact: true })
		.filter({ visible: true })
		.waitFor({ timeout: 10_000 });
	await page.waitForFunction(
		() =>
			Array.from(document.querySelectorAll('[aria-label="直近7日の実績概要"]')).some((element) => {
				const rect = element.getBoundingClientRect();
				return (
					rect.width > 0 &&
					rect.height > 0 &&
					Array.from(element.children).every((child) => {
						const childRect = child.getBoundingClientRect();
						return childRect.width > 0 && childRect.height > 0;
					})
				);
			}),
		undefined,
		{ timeout: 10_000 },
	);
	const summaryBoxes = await page.evaluate(() => {
		const element = Array.from(document.querySelectorAll('[aria-label="直近7日の実績概要"]')).find(
			(candidate) => {
				const rect = candidate.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			},
		);
		return element
			? Array.from(element.children).map((child) => {
					const rect = child.getBoundingClientRect();
					return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
				})
			: [];
	});
	if (summaryBoxes.length !== 4)
		throw new Error(`390px幅の実績概要が4指標ではない: ${summaryBoxes.length}件`);
	if (
		summaryBoxes.some((box) => box.width <= 0 || box.height <= 0) ||
		Math.abs(summaryBoxes[0].y - summaryBoxes[1].y) > 2 ||
		Math.abs(summaryBoxes[2].y - summaryBoxes[3].y) > 2 ||
		summaryBoxes[2].y <= summaryBoxes[0].y
	) {
		throw new Error(`390px幅の実績概要が2×2に配置されていない: ${JSON.stringify(summaryBoxes)}`);
	}
	await dashboard.screenshot({
		path: new URL("mobile-stats.png", artifactDirectory).pathname,
		animations: "disabled",
	});
	const openReview = visibleButton(page, "振り返りを始める");
	await openReview.scrollIntoViewIfNeeded();
	await expectTouchTarget(openReview, "振り返りを始める");
	await openReview.click();
	await page
		.getByRole("heading", { name: "振り返り", exact: true })
		.filter({ visible: true })
		.waitFor({ timeout: 10_000 });
	const reviewScrollTop = await page
		.locator("main[data-mobile-safe-area='content']")
		.filter({ visible: true })
		.first()
		.evaluate((element) => element.scrollTop);
	if (reviewScrollTop > 1)
		throw new Error(
			`実績から振り返りへ移動しても画面先頭へ戻っていない: scrollTop=${reviewScrollTop}px`,
		);
	const mobileNavigationClose = visibleButton(page, "ナビゲーションを閉じる");
	if (await mobileNavigationClose.isVisible()) await mobileNavigationClose.click();
	const reviewAction = page
		.locator("[data-mobile-safe-area='review-action']")
		.filter({ visible: true })
		.first();
	await reviewAction.waitFor({ state: "visible", timeout: 10_000 });
	const reviewActionPosition = await computedStyleWithRerenderRetry(reviewAction, "position");
	if (reviewActionPosition !== "static")
		throw new Error(
			`390px幅の振り返り保存領域が入力を覆う可能性がある: position=${reviewActionPosition}`,
		);
	const reviewSave = reviewAction.getByRole("button", { name: "保存して今日へ" });
	await reviewSave.scrollIntoViewIfNeeded();
	await expectTouchTarget(reviewSave, "保存して今日へ");
	const [reviewActionBox, reviewSaveBox] = await Promise.all([
		boundingBoxWithRerenderRetry(reviewAction),
		boundingBoxWithRerenderRetry(reviewSave),
	]);
	if (!reviewActionBox || !reviewSaveBox || reviewSaveBox.width < reviewActionBox.width - 2) {
		throw new Error(
			`390px幅の振り返り保存CTAが全幅ではない: ${reviewSaveBox?.width ?? 0}px / ${reviewActionBox?.width ?? 0}px`,
		);
	}
	await dashboard.screenshot({
		path: new URL("mobile-review.png", artifactDirectory).pathname,
		animations: "disabled",
	});
	await page.setViewportSize(desktopViewport);

	const integrations = integrationResults.length
		? ` · 実連携 ${integrationResults.join(" / ")}`
		: "";
	console.log(
		`Obsidian shell smoke: READY (${manifest.id}@${manifest.version}再読込 · API >= ${manifest.minAppVersion} · SecretStorage · 連続起動1タブ · 主要5導線 · サイドバー開閉保持 · Vault診断 · 実績4指標/390px 2×2 · 実績CTA→振り返り · 390px主要操作44px · 未配置トレイ縮小 · ビュー切替で先頭復帰 · 振り返り非遮蔽 · 横溢れなし${integrations})`,
	);
	process.exit(0);
} catch (error) {
	await mkdir(artifactDirectory, { recursive: true });
	const page = browser.contexts().flatMap((context) => context.pages())[0];
	if (page)
		await page
			.screenshot({ path: new URL("failure.png", artifactDirectory).pathname })
			.catch(() => {});
	console.error(error);
	process.exit(1);
}
