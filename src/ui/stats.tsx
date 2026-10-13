import { useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { Icon } from "./icon";
import { FocusedPage } from "./page-shell";
import { useI18n } from "./i18n";

export interface StatsSummaryItem {
	icon: string;
	label: string;
	value: string;
}

export interface StatsCompletionDay {
	count: number;
	date: string;
	label: string;
}

export interface StatsBreakdownItem {
	count: number;
	label: string;
}

export interface StatsModel {
	summary: StatsSummaryItem[];
	completionDays: StatsCompletionDay[];
	priorities: StatsBreakdownItem[];
	lists: StatsBreakdownItem[];
	openCount: number;
	overdueCount: number;
	onOpenReview: () => Promise<void> | void;
}

function Breakdown({
	title,
	items,
	total,
}: {
	title: string;
	items: StatsBreakdownItem[];
	total: number;
}): ReactElement {
	const t = useI18n();
	return (
		<section className="min-w-0 rounded-lg border border-ttd-border p-3">
			<h2 className="mb-2 mt-0 text-[13px] font-semibold">{title}</h2>
			{items.length === 0 ? (
				<p className="m-0 text-[11px] text-ttd-muted">{t("stats.noOpenTasks")}</p>
			) : (
				<ul className="m-0 grid list-none gap-2 p-0">
					{items.map((item) => {
						const percentage = total ? Math.round((item.count / total) * 100) : 0;
						return (
							<li
								key={item.label}
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[11px]"
							>
								<span className="truncate text-ttd-text">{item.label}</span>
								<strong className="tabular-nums">{item.count}</strong>
								<div
									aria-hidden="true"
									className="col-span-2 h-1 overflow-hidden rounded-full bg-ttd-border"
								>
									<div
										className="h-full rounded-full bg-ttd-accent"
										style={{ width: `${percentage}%` }}
									/>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

export function Stats({ model }: { model: StatsModel }): ReactElement {
	const t = useI18n();
	const [openingReview, setOpeningReview] = useState(false);
	const [openError, setOpenError] = useState("");
	const max = Math.max(1, ...model.completionDays.map((day) => day.count));
	const lastWeek = model.completionDays.slice(-7).reduce((sum, day) => sum + day.count, 0);
	const previousWeek = model.completionDays.slice(0, 7).reduce((sum, day) => sum + day.count, 0);
	const trend = lastWeek - previousWeek;
	const decision =
		model.overdueCount > 0
			? t("stats.decision.overdue", { count: model.overdueCount })
			: model.openCount > 0
				? t("stats.decision.open", { count: model.openCount })
				: t("stats.decision.clear");
	const openReview = async () => {
		if (openingReview) return;
		setOpeningReview(true);
		setOpenError("");
		try {
			await model.onOpenReview();
		} catch (cause) {
			setOpenError(cause instanceof Error ? cause.message : t("stats.error.review"));
		} finally {
			setOpeningReview(false);
		}
	};

	return (
		<FocusedPage>
			<section
				aria-label={t("stats.summary")}
				className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-ttd-border bg-ttd-border max-[800px]:grid-cols-2"
			>
				{model.summary.map((item) => (
					<div
						key={item.label}
						className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 bg-ttd-canvas px-3 py-2.5"
					>
						<span
							aria-hidden="true"
							className="grid size-7 place-items-center rounded-md bg-ttd-selected text-ttd-accent"
						>
							<Icon name={item.icon} />
						</span>
						<div className="grid min-w-0">
							<span className="text-[11px] text-ttd-muted">{item.label}</span>
							<strong className="text-lg leading-tight tabular-nums">{item.value}</strong>
						</div>
					</div>
				))}
			</section>

			<div
				data-stats-analysis
				className="grid gap-3 min-[721px]:grid-cols-2 min-[900px]:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]"
			>
				<section
					aria-labelledby="completion-trend"
					className="rounded-lg border border-ttd-border p-3 min-[721px]:col-span-2 min-[900px]:col-span-1"
				>
					<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
						<h2 id="completion-trend" className="m-0 text-[13px] font-semibold">
							{t("stats.completion14")}
						</h2>
						<p className="m-0 text-[11px] text-ttd-muted">
							{t("stats.weeklyChange")}{" "}
							<strong
								className={
									trend > 0 ? "text-ttd-success" : trend < 0 ? "text-ttd-warning" : "text-ttd-muted"
								}
							>
								{trend > 0 ? "+" : ""}
								{t("stats.count", { count: trend })}
							</strong>
						</p>
					</div>
					<div
						role="img"
						aria-label={t("stats.completed14", {
							count: model.completionDays.reduce((sum, day) => sum + day.count, 0),
						})}
						className="grid h-28 grid-cols-14 gap-1.5 max-[620px]:h-24 max-[620px]:gap-1"
					>
						{model.completionDays.map((day) => (
							<div
								key={day.date}
								title={t("stats.dayCount", { date: day.date, count: day.count })}
								className="grid min-w-0 grid-rows-[16px_minmax(0,1fr)_16px] items-end text-center"
							>
								<span className="text-[11px] text-ttd-faint">{day.count || ""}</span>
								<div
									aria-hidden="true"
									className="mx-auto min-h-[3px] w-[min(24px,72%)] rounded-t bg-ttd-accent"
									style={{ height: `${Math.max(3, (day.count / max) * 100)}%` }}
								/>
								<small className="text-[11px] text-ttd-faint">{day.label}</small>
							</div>
						))}
					</div>
				</section>
				<Breakdown title={t("stats.priority")} items={model.priorities} total={model.openCount} />
				<Breakdown title={t("stats.list")} items={model.lists} total={model.openCount} />
			</div>

			<section className="flex flex-wrap items-center gap-3 rounded-lg border border-ttd-border bg-ttd-surface p-3 max-[620px]:items-start max-[620px]:flex-col">
				<div className="min-w-0 flex-1">
					<h2 className="m-0 text-[13px] font-semibold">{t("stats.nextWeek")}</h2>
					<p className="mb-0 mt-1 text-[11px] leading-relaxed text-ttd-muted">{decision}</p>
				</div>
				<Button
					tone="primary"
					size="compact"
					disabled={openingReview}
					onClick={() => void openReview()}
					className="max-[620px]:min-h-11 max-[620px]:w-full"
				>
					{t(openingReview ? "stats.moving" : "stats.startReview")}
				</Button>
				{openError ? (
					<p role="alert" className="m-0 w-full text-[11px] text-ttd-danger">
						{openError}
					</p>
				) : null}
			</section>
		</FocusedPage>
	);
}
