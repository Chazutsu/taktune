import { useState, type CSSProperties, type ReactElement } from "react";
import { CalendarTaskRow } from "./calendar-task-row";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export type CalendarAgendaEntry =
	| {
			kind: "activity";
			achieved: boolean;
			icon: string;
			label: string;
			meta: string;
			title: string;
			type: string;
	  }
	| { kind: "event"; color: string; meta: string; time: string; title: string; url: string }
	| {
			kind: "task";
			color: string;
			done: boolean;
			dragPayload: string | null;
			list: string;
			onEdit: () => void;
			onToggle: () => void | Promise<void>;
			repeat: boolean;
			time: string;
			title: HTMLElement;
	  };

export interface CalendarAgendaDay {
	count: number;
	date: string;
	day: number;
	entries: CalendarAgendaEntry[];
	label: string;
	onDrop: (payload: string) => void | Promise<void>;
	onOpenDay: () => void | Promise<void>;
	today: boolean;
}

export interface CalendarAgendaModel {
	compact: boolean;
	days: CalendarAgendaDay[];
	hideDetails: boolean;
}

function activityTone(type: string): { border: string; background: string; text: string } {
	if (type === "focus")
		return {
			border: "border-l-[#8a6fd1]",
			background: "bg-[color-mix(in_srgb,#8a6fd1_7%,transparent)]",
			text: "text-[#8a6fd1]",
		};
	if (type === "countdown")
		return {
			border: "border-l-[#e58b3e]",
			background: "bg-[color-mix(in_srgb,#e58b3e_7%,transparent)]",
			text: "text-[#e58b3e]",
		};
	return {
		border: "border-l-[#d49735]",
		background: "bg-[color-mix(in_srgb,#d49735_7%,transparent)]",
		text: "text-[#d49735]",
	};
}

function AgendaEntry({
	entry,
	compact,
	hideDetails,
}: {
	entry: CalendarAgendaEntry;
	compact: boolean;
	hideDetails: boolean;
}): ReactElement {
	const t = useI18n();
	const base = `grid min-h-8 min-w-0 items-center gap-2 border-l-[3px] px-2 text-[11px] text-[var(--text-normal)] no-underline hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] hover:no-underline max-[620px]:min-h-11 ${compact ? "py-0.5" : "py-1"}`;
	if (entry.kind === "activity") {
		const tone = activityTone(entry.type);
		return (
			<div
				aria-label={t("calendarEntry.activity", { title: entry.title })}
				className={`${base} grid-cols-[32px_50px_minmax(0,1fr)_auto] ${tone.border} ${tone.background} ${entry.achieved ? "ring-1 ring-inset ring-current" : ""}`}
			>
				<Icon name={entry.icon} className={`size-3.5 ${tone.text}`} />
				<span className="text-[11px] tabular-nums text-[var(--text-faint)]">{entry.label}</span>
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{entry.title}</span>
				{hideDetails ? null : (
					<span className="whitespace-nowrap text-[11px] text-[var(--text-faint)]">
						{entry.meta}
					</span>
				)}
			</div>
		);
	}
	if (entry.kind === "event")
		return (
			<a
				href={entry.url}
				target="_blank"
				rel="noreferrer"
				aria-label={t("calendarEntry.event", { title: entry.title })}
				style={{ "--entry-color": entry.color } as CSSProperties}
				className={`${base} grid-cols-[50px_minmax(0,1fr)_auto] border-l-[var(--entry-color)]`}
			>
				<span className="text-[11px] tabular-nums text-[var(--text-faint)]">{entry.time}</span>
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">
					<span className="mr-1 inline-flex align-middle">
						<Icon name="calendar-days" className="size-3" />
					</span>
					{entry.title}
				</span>
				{hideDetails ? null : (
					<span className="whitespace-nowrap text-[11px] text-[var(--text-faint)]">
						{entry.meta}
					</span>
				)}
			</a>
		);
	const plainTitle = entry.title.textContent || t("calendarEntry.untitled");
	return (
		<CalendarTaskRow
			compact={compact}
			hideDetails={hideDetails}
			model={{
				ariaLabel: t("calendarEntry.task", { title: plainTitle }),
				color: entry.color,
				context: entry.repeat ? t("calendarEntry.recurring") : entry.list,
				done: entry.done,
				dragPayload: entry.dragPayload,
				meta: entry.time,
				onOpen: entry.onEdit,
				onToggle: entry.onToggle,
				plainTitle,
				repeat: entry.repeat,
				title: entry.title,
			}}
		/>
	);
}

function AgendaDay({
	day,
	compact,
	hideDetails,
}: {
	day: CalendarAgendaDay;
	compact: boolean;
	hideDetails: boolean;
}): ReactElement {
	const t = useI18n();
	const [dropTarget, setDropTarget] = useState(false);
	return (
		<section
			onDragOver={(event) => {
				if (event.dataTransfer.types.includes("application/x-ttd-task")) {
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					setDropTarget(true);
				}
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDropTarget(false);
				const payload = event.dataTransfer.getData("application/x-ttd-task");
				if (payload) void day.onDrop(payload);
			}}
			className={`grid border-b border-[var(--background-modifier-border)] max-[720px]:grid-cols-[76px_minmax(0,1fr)] min-[721px]:grid-cols-[108px_minmax(0,1fr)] ${dropTarget ? "bg-[var(--background-modifier-active-hover)] shadow-[inset_0_0_0_2px_var(--interactive-accent)]" : ""}`}
		>
			<header
				className={`sticky top-0 flex self-start items-center justify-between gap-1 bg-[var(--background-primary)] px-2.5 text-[11px] text-[var(--text-faint)] ${compact ? "min-h-[38px] py-1" : "min-h-12 py-2"}`}
			>
				<button
					type="button"
					aria-label={t("calendarEntry.openDay", { date: day.date })}
					onClick={() => void day.onOpenDay()}
					className="flex min-h-8 items-baseline gap-1.5 border-0 bg-transparent px-1 py-0 text-[var(--text-muted)] shadow-none max-[620px]:min-h-11"
				>
					<strong
						aria-current={day.today ? "date" : undefined}
						className={`grid place-items-center font-semibold ${compact ? "text-[15px]" : "text-lg"} ${day.today ? "size-7 rounded-full bg-[var(--interactive-accent)] text-[var(--text-on-accent)]" : ""}`}
					>
						{day.day}
					</strong>
					<span>{day.label}</span>
				</button>
				<span className="whitespace-nowrap">{t("common.items", { count: day.count })}</span>
			</header>
			<div className={`min-w-0 pr-2 ${compact ? "py-1" : "py-1.5"}`}>
				{day.entries.map((entry, index) => (
					<AgendaEntry
						key={`${entry.kind}:${entry.title instanceof HTMLElement ? entry.title.textContent : entry.title}:${index}`}
						entry={entry}
						compact={compact}
						hideDetails={hideDetails}
					/>
				))}
			</div>
		</section>
	);
}

export function CalendarAgenda({ model }: { model: CalendarAgendaModel }): ReactElement {
	const t = useI18n();
	if (!model.days.length)
		return (
			<div className="grid min-h-52 place-items-center px-4 py-10 text-center">
				<div>
					<span className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-[var(--background-secondary)] text-[var(--text-muted)]">
						<Icon name="calendar-check" />
					</span>
					<h2 className="m-0 text-sm">{t("agenda.empty")}</h2>
					<p className="mt-1 text-xs text-[var(--text-muted)]">{t("agenda.emptyDescription")}</p>
				</div>
			</div>
		);
	return (
		<div className="h-full min-w-0 overflow-y-auto bg-[var(--background-primary)]">
			{model.days.map((day) => (
				<AgendaDay
					key={day.date}
					day={day}
					compact={model.compact}
					hideDetails={model.hideDetails}
				/>
			))}
		</div>
	);
}
