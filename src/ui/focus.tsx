import { useEffect, useState, type ReactElement } from "react";
import { FocusedPage } from "./page-shell";
import { useI18n } from "./i18n";

export interface FocusTaskOption {
	key: string;
	title: string;
}

export interface FocusDurationOption {
	label: string;
	seconds: number;
}

export interface FocusDay {
	date: string;
	label: string;
	minutes: number;
}

export interface FocusSummaryItem {
	label: string;
	value: string;
}

export interface FocusTaskStat {
	minutes: number;
	title: string;
}

export interface FocusModel {
	tasks: FocusTaskOption[];
	selectedTaskKey: string;
	mode: "timer" | "stopwatch";
	running: boolean;
	duration: number;
	durationOptions: FocusDurationOption[];
	getSeconds: () => number;
	days: FocusDay[];
	summary: FocusSummaryItem[];
	taskStats: FocusTaskStat[];
	onTaskChange: (key: string) => Promise<void> | void;
	onModeChange: (mode: "timer" | "stopwatch") => Promise<void> | void;
	onDurationChange: (seconds: number) => Promise<void> | void;
	onToggle: () => Promise<void> | void;
	onReset: () => Promise<void> | void;
	onRecord: () => Promise<void> | void;
}

function formatTime(seconds: number): string {
	const safe = Math.max(0, seconds);
	return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function Focus({ model }: { model: FocusModel }): ReactElement {
	const t = useI18n();
	const [clock, setClock] = useState(() => ({
		source: model.getSeconds,
		seconds: model.getSeconds(),
	}));
	const seconds = clock.source === model.getSeconds ? clock.seconds : model.getSeconds();
	useEffect(() => {
		if (!model.running) return;
		const interval = window.setInterval(
			() => setClock({ source: model.getSeconds, seconds: model.getSeconds() }),
			1000,
		);
		return () => window.clearInterval(interval);
	}, [model]);
	const max = Math.max(25, ...model.days.map((day) => day.minutes));
	const selectedTask = model.tasks.find((task) => task.key === model.selectedTaskKey);

	return (
		<FocusedPage className="min-[821px]:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
			<section
				aria-labelledby="focus-timer-title"
				className="grid content-start gap-4 rounded-lg border border-[var(--background-modifier-border)] p-4"
			>
				<div>
					<h2 id="focus-timer-title" className="m-0 text-sm font-semibold">
						{t("focus.session")}
					</h2>
					<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
						{t("focus.sessionDescription")}
					</p>
				</div>
				<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
					<span>{t("focus.task")}</span>
					<select
						aria-label={t("focus.task")}
						value={model.selectedTaskKey}
						onChange={(event) => void model.onTaskChange(event.currentTarget.value)}
						className="h-9 w-full min-w-0 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 text-[12px] max-[620px]:h-11"
						disabled={model.running}
					>
						<option value="">{t("focus.noTask")}</option>
						{model.tasks.map((task) => (
							<option key={task.key} value={task.key}>
								{task.title}
							</option>
						))}
					</select>
				</label>
				<div
					role="group"
					aria-label={t("focus.method")}
					className="grid grid-cols-2 gap-1 rounded-md bg-[var(--background-secondary)] p-1"
				>
					{(
						[
							["timer", "focus.timer"],
							["stopwatch", "focus.stopwatch"],
						] as const
					).map(([mode, key]) => (
						<button
							key={mode}
							type="button"
							aria-pressed={model.mode === mode}
							disabled={model.running}
							onClick={() => void model.onModeChange(mode)}
							className={`min-h-8 border-0 px-2 text-[11px] shadow-none max-[620px]:min-h-11 ${model.mode === mode ? "bg-[var(--background-primary)] font-semibold text-[var(--interactive-accent)]" : "bg-transparent text-[var(--text-muted)]"}`}
						>
							{t(key)}
						</button>
					))}
				</div>
				<div
					aria-label={`${t(model.mode === "timer" ? "focus.remaining" : "focus.elapsed")} ${formatTime(seconds)}`}
					className="py-2 text-center text-[clamp(46px,8vw,72px)] font-bold leading-none tracking-[-0.055em] tabular-nums"
				>
					{formatTime(seconds)}
				</div>
				{model.mode === "timer" ? (
					<div
						role="group"
						aria-label={t("focus.duration")}
						className="flex flex-wrap justify-center gap-1.5"
					>
						{model.durationOptions.map((option) => (
							<button
								key={option.seconds}
								type="button"
								aria-pressed={model.duration === option.seconds}
								disabled={model.running}
								onClick={() => void model.onDurationChange(option.seconds)}
								className={`min-h-8 px-2.5 text-[11px] max-[620px]:min-h-11 ${model.duration === option.seconds ? "border-[var(--interactive-accent)] bg-[var(--background-modifier-active-hover)] text-[var(--interactive-accent)]" : ""}`}
							>
								{option.label}
							</button>
						))}
					</div>
				) : null}
				<div className="flex flex-wrap justify-center gap-2 border-t border-[var(--background-modifier-border)] pt-4">
					<button
						type="button"
						onClick={() => void model.onToggle()}
						className="mod-cta min-h-9 min-w-24 px-4 text-[12px] max-[620px]:min-h-11"
					>
						{t(model.running ? "focus.pause" : "focus.start")}
					</button>
					<button
						type="button"
						onClick={() => {
							void model.onReset();
							setClock({
								source: model.getSeconds,
								seconds: model.mode === "timer" ? model.duration : 0,
							});
						}}
						className="min-h-9 px-3 text-[11px] max-[620px]:min-h-11"
					>
						{t("focus.reset")}
					</button>
					{model.mode === "stopwatch" ? (
						<button
							type="button"
							disabled={seconds < 1}
							onClick={() => void model.onRecord()}
							className="min-h-9 px-3 text-[11px] max-[620px]:min-h-11"
						>
							{t("focus.record")}
						</button>
					) : null}
				</div>
				<p className="m-0 truncate text-center text-[11px] text-[var(--text-muted)]">
					{selectedTask
						? t("focus.target", { title: selectedTask.title })
						: t("focus.noTargetHint")}
				</p>
			</section>

			<section
				aria-labelledby="focus-history-title"
				className="grid content-start gap-4 rounded-lg border border-[var(--background-modifier-border)] p-4"
			>
				<div>
					<h2 id="focus-history-title" className="m-0 text-sm font-semibold">
						{t("focus.history")}
					</h2>
					<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
						{t("focus.historyDescription")}
					</p>
				</div>
				<div
					role="img"
					aria-label={t("focus.last7", {
						minutes: model.days.reduce((sum, day) => sum + day.minutes, 0),
					})}
					className="grid h-44 grid-cols-7 gap-2 max-[520px]:h-36 max-[520px]:gap-1"
				>
					{model.days.map((day) => (
						<div
							key={day.date}
							title={t("focus.dayMinutes", { date: day.date, minutes: day.minutes })}
							className="grid min-w-0 grid-rows-[18px_minmax(0,1fr)_18px] items-end text-center"
						>
							<span className="text-[11px] text-[var(--text-faint)]">
								{day.minutes ? t("focus.minutes", { minutes: day.minutes }) : ""}
							</span>
							<div
								aria-hidden="true"
								className="mx-auto min-h-[3px] w-[min(28px,70%)] rounded-t bg-[var(--interactive-accent)]"
								style={{ height: `${Math.max(3, (day.minutes / max) * 100)}%` }}
							/>
							<small className="text-[11px] text-[var(--text-muted)]">{day.label}</small>
						</div>
					))}
				</div>
				<div className="grid grid-cols-4 overflow-hidden rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-modifier-border)] gap-px max-[620px]:grid-cols-2">
					{model.summary.map((item) => (
						<div
							key={item.label}
							className="grid gap-0.5 bg-[var(--background-primary)] px-2.5 py-2"
						>
							<span className="text-[11px] text-[var(--text-muted)]">{item.label}</span>
							<strong className="text-[13px] tabular-nums">{item.value}</strong>
						</div>
					))}
				</div>
				{model.taskStats.length ? (
					<div>
						<h3 className="mb-1.5 mt-0 text-[11px] font-medium text-[var(--text-muted)]">
							{t("focus.byTask")}
						</h3>
						<ul className="m-0 list-none p-0">
							{model.taskStats.map((item) => (
								<li
									key={item.title}
									className="flex min-w-0 justify-between gap-3 border-b border-[var(--background-modifier-border)] py-1.5 text-[11px] last:border-0"
								>
									<span className="truncate">{item.title}</span>
									<strong className="shrink-0 tabular-nums">
										{t("focus.minutes", { minutes: item.minutes })}
									</strong>
								</li>
							))}
						</ul>
					</div>
				) : (
					<p className="m-0 text-[11px] text-[var(--text-muted)]">{t("focus.noTaskHistory")}</p>
				)}
			</section>
		</FocusedPage>
	);
}
