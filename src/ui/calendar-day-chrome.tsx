import type { CSSProperties, ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface CalendarAllDayEvent {
	color: string;
	title: string;
	url: string;
}

export interface CalendarActivity {
	achieved: boolean;
	icon: string;
	meta: string;
	title: string;
	type: string;
}

export interface CalendarDayChromeModel {
	activities: CalendarActivity[];
	allDayEvents: CalendarAllDayEvent[];
	date: string;
	dayNumber: number;
	showHeader: boolean;
	today: boolean;
	weekday: string;
}

function activityTone(type: string): string {
	if (type === "focus")
		return "bg-[color-mix(in_srgb,#8a6fd1_15%,var(--background-primary))] text-[#7655c2]";
	if (type === "countdown")
		return "bg-[color-mix(in_srgb,#e58b3e_15%,var(--background-primary))] text-[#b66d2e]";
	return "bg-[color-mix(in_srgb,#d49735_15%,var(--background-primary))] text-[#a56b0f]";
}

export function CalendarDayChrome({ model }: { model: CalendarDayChromeModel }): ReactElement {
	const t = useI18n();
	const hasAllDay = model.allDayEvents.length > 0 || model.activities.length > 0;
	const activityLabel = (type: string): string =>
		type === "habit"
			? t("calendarDay.habit")
			: type === "focus"
				? t("calendarDay.focus")
				: type === "countdown"
					? t("calendarDay.countdown")
					: t("calendarDay.activity");
	return (
		<>
			{model.showHeader ? (
				<header className="sticky top-0 z-[4] flex h-[42px] items-center justify-center gap-1.5 border-b border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[11px] text-[var(--text-muted)]">
					<span>{model.weekday}</span>
					<strong
						aria-current={model.today ? "date" : undefined}
						className={`grid size-[25px] place-items-center rounded-full text-xs ${model.today ? "bg-[var(--ttd-blue)] text-white" : ""}`}
					>
						{model.dayNumber}
					</strong>
				</header>
			) : null}
			{hasAllDay ? (
				<section
					aria-label={t("calendarDay.allDayFor", { date: model.date })}
					className={`grid min-h-[38px] border-b border-[var(--background-modifier-border)] text-[11px] text-[var(--text-faint)] ${model.showHeader ? "grid-cols-1 gap-1 p-1.5" : "grid-cols-[56px_minmax(0,1fr)] gap-2.5 px-2.5 py-[7px]"}`}
				>
					{model.showHeader ? null : <span>{t("calendarDay.allDay")}</span>}
					<div className="flex min-w-0 flex-wrap gap-1.5">
						{model.allDayEvents.map((event, index) => (
							<a
								key={`${event.url}:${index}`}
								href={event.url}
								target="_blank"
								rel="noreferrer"
								aria-label={t("calendarEntry.event", { title: event.title })}
								style={{ "--event-color": event.color } as CSSProperties}
								className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded px-[7px] py-[3px] bg-[color-mix(in_srgb,var(--event-color)_15%,var(--background-primary))] text-[var(--text-normal)] no-underline hover:text-[var(--text-normal)] hover:no-underline"
							>
								{event.title}
							</a>
						))}
						{model.activities.map((activity, index) => (
							<span
								key={`${activity.type}:${activity.title}:${index}`}
								aria-label={`${activityLabel(activity.type)}: ${activity.title}`}
								className={`inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded px-[7px] py-[3px] ${activityTone(activity.type)} ${activity.achieved ? "ring-1 ring-current" : ""}`}
							>
								<Icon name={activity.icon} />
								<span className="overflow-hidden text-ellipsis">
									{activity.title} · {activity.meta}
								</span>
							</span>
						))}
					</div>
				</section>
			) : null}
		</>
	);
}
