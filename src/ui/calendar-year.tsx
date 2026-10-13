import type { ReactElement } from "react";
import { useI18n } from "./i18n";

export interface CalendarYearDay {
	count: number;
	date: string;
	day: number;
	onOpen: () => void | Promise<void>;
	today: boolean;
}

export interface CalendarYearMonth {
	days: CalendarYearDay[];
	leading: number;
	month: number;
}

export interface CalendarYearModel {
	months: CalendarYearMonth[];
}

function levelClass(count: number): string {
	if (count >= 5) return "bg-[var(--interactive-accent)] text-[var(--text-on-accent)]";
	if (count === 4)
		return "bg-[color-mix(in_srgb,var(--interactive-accent)_68%,var(--background-primary))] text-[var(--text-on-accent)]";
	if (count === 3)
		return "bg-[color-mix(in_srgb,var(--interactive-accent)_48%,var(--background-primary))] text-[var(--text-on-accent)]";
	if (count === 2)
		return "bg-[color-mix(in_srgb,var(--interactive-accent)_32%,var(--background-primary))]";
	if (count === 1)
		return "bg-[color-mix(in_srgb,var(--interactive-accent)_18%,var(--background-primary))]";
	return "bg-[var(--background-secondary)]";
}

export function CalendarYear({ model }: { model: CalendarYearModel }): ReactElement {
	const t = useI18n();
	const weekdays = [1, 2, 3, 4, 5, 6, 0];
	return (
		<div className="grid h-full min-w-0 grid-cols-1 gap-2.5 overflow-auto p-1 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
			{model.months.map((month) => (
				<section
					key={month.month}
					className="min-w-0 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-2.5"
				>
					<h2 className="mb-2 mt-0 text-xs font-semibold">
						{t("calendarYear.month", { month: month.month })}
					</h2>
					<div className="mb-1 grid grid-cols-7 gap-[3px] text-center text-[11px] text-[var(--text-faint)]">
						{weekdays.map((day) => (
							<span key={day}>{t(`habitDialog.day.${day}`)}</span>
						))}
					</div>
					<div className="grid grid-cols-7 gap-[3px]">
						{Array.from({ length: month.leading }, (_, index) => (
							<span key={`blank:${index}`} aria-hidden="true" />
						))}
						{month.days.map((day) => (
							<button
								type="button"
								key={day.date}
								onClick={() => void day.onOpen()}
								aria-label={t("calendarYear.dayItems", { date: day.date, count: day.count })}
								aria-current={day.today ? "date" : undefined}
								title={t("calendarYear.dayItemsTitle", { date: day.date, count: day.count })}
								className={`grid aspect-square min-h-11 min-w-11 place-items-center rounded-[3px] border-0 p-0 text-[11px] text-[var(--text-muted)] shadow-none transition-transform hover:scale-105 hover:brightness-110 motion-reduce:transition-none motion-reduce:hover:scale-100 min-[721px]:min-h-8 min-[721px]:min-w-8 ${levelClass(day.count)} ${day.today ? "outline-2 outline-offset-1 outline-[var(--color-red)]" : ""}`}
							>
								{day.day}
							</button>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
