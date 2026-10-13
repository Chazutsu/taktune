import type { ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { FocusedPage } from "./page-shell";

export interface HabitDayModel {
	date: string;
	done: boolean;
	label: string;
	scheduled: boolean;
	today: boolean;
	value: number;
}

export interface HabitHeatCell {
	date: string;
	state: "done" | "partial" | "empty";
	scheduled: boolean;
	title: string;
}

export interface HabitCardModel {
	id: string;
	name: string;
	archived: boolean;
	streakLabel: string;
	targetLabel: string;
	reminders: string[];
	days: HabitDayModel[];
	heatmap: HabitHeatCell[];
	weeklyProgress: string | null;
	target: number;
	unit: string;
	onEdit: () => void;
	onToggle: (date: string) => Promise<void> | void;
}

export interface HabitsModel {
	archivedCount: number;
	showArchived: boolean;
	todayScheduled: number;
	todayCompleted: number;
	habits: HabitCardModel[];
	onAdd: () => void;
	onToggleArchiveView: () => Promise<void> | void;
}

function HabitCard({ habit }: { habit: HabitCardModel }): ReactElement {
	const t = useI18n();
	return (
		<article
			className={`grid min-w-0 gap-3 rounded-lg border border-[var(--background-modifier-border)] p-3 ${habit.archived ? "opacity-70" : ""}`}
		>
			<header className="flex min-w-0 items-start justify-between gap-2">
				<div className="min-w-0">
					<h2 className="m-0 truncate text-sm font-semibold">{habit.name}</h2>
					<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
						<strong className="font-semibold text-[var(--color-orange)]">
							{habit.streakLabel}
						</strong>
						<span> · {habit.targetLabel}</span>
					</p>
					{habit.reminders.length ? (
						<p className="mb-0 mt-1 truncate text-[11px] text-[var(--text-faint)]">
							{t("habits.reminders", { times: habit.reminders.join(" · ") })}
						</p>
					) : null}
				</div>
				<button
					type="button"
					aria-label={t("habits.edit", { name: habit.name })}
					onClick={habit.onEdit}
					className="grid size-8 shrink-0 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
				>
					<Icon name="ellipsis" />
				</button>
			</header>
			<div className="grid grid-cols-7 gap-1" aria-label={t("habits.last7", { name: habit.name })}>
				{habit.days.map((day) => (
					<button
						key={day.date}
						type="button"
						disabled={!day.scheduled}
						aria-label={t("habits.dayAction", {
							date: day.date,
							value: day.value,
							target: habit.target,
							unit: habit.unit,
							action: t(day.done ? "habits.reset" : "habits.increment"),
						})}
						onClick={() => void habit.onToggle(day.date)}
						className={`grid min-h-11 min-w-0 justify-items-center gap-1 border-0 bg-transparent px-0 py-1 text-[11px] shadow-none ${day.scheduled ? "text-[var(--text-muted)]" : "opacity-25"} ${day.today ? "font-semibold text-[var(--interactive-accent)]" : ""}`}
					>
						<span>{day.label}</span>
						<span
							className={`grid size-8 place-items-center rounded-full border text-[11px] font-semibold ${day.done ? "border-[var(--interactive-accent)] bg-[var(--interactive-accent)] text-[var(--text-on-accent)]" : "border-[var(--background-modifier-border)] bg-[var(--background-primary)]"}`}
						>
							{habit.target === 1 && day.done ? (
								<Icon name="check" />
							) : (
								`${day.value}/${habit.target}`
							)}
						</span>
					</button>
				))}
			</div>
			{habit.weeklyProgress ? (
				<p className="m-0 text-right text-[11px] text-[var(--text-muted)]">
					{habit.weeklyProgress}
				</p>
			) : null}
			<div aria-label={t("habits.last35", { name: habit.name })} className="grid grid-cols-7 gap-1">
				{habit.heatmap.map((cell) => (
					<span
						key={cell.date}
						title={cell.title}
						className={`aspect-square min-h-2 rounded-sm ${cell.state === "done" ? "bg-[var(--interactive-accent)]" : cell.state === "partial" ? "bg-[color-mix(in_srgb,var(--interactive-accent)_42%,var(--background-modifier-border))]" : "bg-[var(--background-modifier-border)]"} ${cell.scheduled ? "" : "opacity-25"}`}
					/>
				))}
			</div>
		</article>
	);
}

export function Habits({ model }: { model: HabitsModel }): ReactElement {
	const t = useI18n();
	return (
		<FocusedPage>
			<header className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--background-modifier-border)] p-3">
				<div className="min-w-0 flex-1">
					<h2 className="m-0 text-sm font-semibold">
						{t(model.showArchived ? "habits.archivedTitle" : "habits.todayTitle")}
					</h2>
					{!model.showArchived ? (
						<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
							{model.todayScheduled
								? t("habits.completed", {
										completed: model.todayCompleted,
										scheduled: model.todayScheduled,
									})
								: t("habits.noneToday")}
						</p>
					) : (
						<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
							{t("habits.archivedDescription")}
						</p>
					)}
				</div>
				{model.archivedCount > 0 ? (
					<button
						type="button"
						aria-pressed={model.showArchived}
						onClick={() => void model.onToggleArchiveView()}
						className="min-h-8 px-2.5 text-[11px] max-[620px]:min-h-11"
					>
						{model.showArchived
							? t("habits.showActive")
							: t("habits.archiveCount", { count: model.archivedCount })}
					</button>
				) : null}
				<button
					type="button"
					onClick={model.onAdd}
					className="mod-cta min-h-8 px-3 text-[11px] max-[620px]:min-h-11"
				>
					{t("habits.add")}
				</button>
			</header>
			{model.habits.length ? (
				<div className="grid gap-3 min-[701px]:grid-cols-2">
					{model.habits.map((habit) => (
						<HabitCard key={habit.id} habit={habit} />
					))}
				</div>
			) : (
				<section className="grid min-h-44 place-items-center rounded-lg border border-dashed border-[var(--background-modifier-border)] p-5 text-center">
					<div>
						<span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-[var(--background-modifier-hover)] text-[var(--text-muted)]">
							<Icon name="flame" />
						</span>
						<h2 className="m-0 text-sm font-semibold">
							{t(model.showArchived ? "habits.emptyArchive" : "habits.emptyTitle")}
						</h2>
						<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
							{t(model.showArchived ? "habits.emptyArchiveDescription" : "habits.emptyDescription")}
						</p>
					</div>
				</section>
			)}
		</FocusedPage>
	);
}
