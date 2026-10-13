import { useId, useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { CalendarTaskRow } from "./calendar-task-row";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface PlanTrayItem {
	color?: string;
	context?: string;
	dragPayload: string;
	key: string;
	meta?: string;
	onOpen?: () => void;
	onSelect: () => void | Promise<void>;
	onToggle?: () => void | Promise<void>;
	plainTitle: string;
	searchText: string;
	selected: boolean;
	title: HTMLElement;
}

export interface PlanTrayModel {
	collapsed: boolean;
	date: string;
	items: PlanTrayItem[];
	onSchedule: (date: string, time: string, duration: number) => void | Promise<void>;
	onScheduleAvailable: (date: string, time: string, duration: number) => void | Promise<void>;
	onSort: (sort: string) => void | Promise<void>;
	onToggleCollapsed: () => void | Promise<void>;
	onToggleSelection: () => void | Promise<void>;
	selectedCount: number;
	selectionMode: boolean;
	sort: string;
}

function PlanItem({
	item,
	selectionMode,
}: {
	item: PlanTrayItem;
	selectionMode: boolean;
}): ReactElement {
	return (
		<CalendarTaskRow
			model={{
				color: item.color,
				context: item.context,
				dragPayload: item.dragPayload,
				meta: item.meta,
				onOpen: item.onOpen,
				onToggle: selectionMode ? item.onSelect : item.onToggle,
				plainTitle: item.plainTitle,
				selected: item.selected,
				selectionMode,
				title: item.title,
			}}
		/>
	);
}

export function PlanTray({ model }: { model: PlanTrayModel }): ReactElement {
	const t = useI18n();
	const [query, setQuery] = useState("");
	const [dateDraft, setDateDraft] = useState({ source: model.date, value: model.date });
	const date = dateDraft.source === model.date ? dateDraft.value : model.date;
	const setDate = (value: string): void => setDateDraft({ source: model.date, value });
	const [time, setTime] = useState("09:00");
	const [duration, setDuration] = useState(60);
	const [scheduling, setScheduling] = useState(false);
	const [scheduleError, setScheduleError] = useState("");
	const searchId = useId();
	const visible = model.items.filter(
		(item) =>
			item.selected || !query.trim() || item.searchText.includes(query.trim().toLowerCase()),
	);
	const schedule = async (available: boolean) => {
		if (scheduling || !model.selectedCount || !date || !time) return;
		setScheduling(true);
		setScheduleError("");
		try {
			await (available
				? model.onScheduleAvailable(date, time, duration)
				: model.onSchedule(date, time, duration));
		} catch (cause) {
			setScheduleError(cause instanceof Error ? cause.message : t("timeBlocks.error.drop"));
		} finally {
			setScheduling(false);
		}
	};
	return (
		<aside
			className={`flex h-full min-h-0 flex-col bg-ttd-surface p-2 max-[720px]:max-h-64 max-[720px]:border-b max-[720px]:border-ttd-border ${model.collapsed ? "max-[720px]:h-auto" : ""}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<h2 className="m-0 text-[13px]">
						{t("planTray.title")}{" "}
						<span className="font-normal text-ttd-faint">{model.items.length}</span>
					</h2>
					<p className="m-0 text-[11px] text-ttd-faint">
						<span className="max-[720px]:hidden">{t("planTray.drag")}</span>
						<span className="hidden max-[720px]:inline">
							{t(model.collapsed ? "planTray.collapsed" : "planTray.multiHint")}
						</span>
					</p>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						aria-pressed={model.selectionMode}
						onClick={() => void model.onToggleSelection()}
						className={`h-7 shrink-0 rounded-md px-2 text-[11px] max-[720px]:min-h-11 max-[720px]:px-3 ${model.collapsed ? "max-[720px]:hidden" : ""} ${model.selectionMode ? "border-ttd-accent text-ttd-accent" : ""}`}
					>
						{t(model.selectionMode ? "planTray.endSelection" : "planTray.multiSelect")}
					</button>
					<button
						type="button"
						aria-label={t(model.collapsed ? "planTray.open" : "planTray.collapse")}
						aria-expanded={!model.collapsed}
						onClick={() => void model.onToggleCollapsed()}
						className="hidden size-11 shrink-0 place-items-center rounded-md border border-ttd-border bg-ttd-canvas p-0 text-ttd-muted shadow-none max-[720px]:grid"
					>
						<Icon name={model.collapsed ? "chevron-down" : "chevron-up"} />
					</button>
				</div>
			</div>
			<div
				className={`mt-2 grid grid-cols-[minmax(0,1fr)_72px] gap-1 ${model.collapsed ? "max-[720px]:hidden" : ""}`}
			>
				<label className="sr-only" htmlFor={searchId}>
					{t("planTray.search")}
				</label>
				<input
					id={searchId}
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t("planTray.searchPlaceholder")}
					className="h-7 min-w-0 px-1.5 text-[11px] max-[720px]:h-11"
				/>
				<select
					aria-label={t("planTray.sort")}
					value={model.sort}
					onChange={(event) => void model.onSort(event.target.value)}
					className="h-7 min-w-0 px-1 text-[11px] max-[720px]:h-11"
				>
					<option value="priority">{t("filter.priority")}</option>
					<option value="due">{t("filter.due")}</option>
					<option value="title">{t("taxonomy.name")}</option>
				</select>
			</div>
			{model.selectionMode ? (
				<div
					className={`mt-1.5 grid grid-cols-2 gap-1 rounded-md border border-[color-mix(in_srgb,var(--ttd-color-accent)_35%,var(--ttd-color-border))] bg-ttd-selected p-1.5 ${model.collapsed ? "max-[720px]:hidden" : ""}`}
				>
					<strong aria-live="polite" className="col-span-2 text-[11px] text-ttd-accent">
						{t("planTray.selected", { count: model.selectedCount })}
					</strong>
					<input
						aria-label={t("planTray.date")}
						type="date"
						value={date}
						disabled={scheduling}
						onChange={(event) => setDate(event.target.value)}
						className="col-span-2 h-7 text-[11px] max-[720px]:h-11"
					/>
					<input
						aria-label={t("planTray.startTime")}
						type="time"
						step="900"
						value={time}
						disabled={scheduling}
						onChange={(event) => setTime(event.target.value)}
						className="h-7 min-w-0 text-[11px] max-[720px]:h-11"
					/>
					<select
						aria-label={t("planTray.duration")}
						value={duration}
						disabled={scheduling}
						onChange={(event) => setDuration(Number(event.target.value))}
						className="h-7 min-w-0 text-[11px] max-[720px]:h-11"
					>
						<option value={30}>{t("calendarTask.minutes", { count: 30 })}</option>
						<option value={60}>{t("calendarTask.minutes", { count: 60 })}</option>
						<option value={90}>{t("calendarTask.minutes", { count: 90 })}</option>
					</select>
					<Button
						tone="primary"
						size="compact"
						disabled={scheduling || !model.selectedCount || !date || !time}
						onClick={() => void schedule(true)}
						className="col-span-2 max-[720px]:min-h-11"
					>
						{scheduling ? t("timeBlocks.dropping") : t("planTray.available")}
					</Button>
					<Button
						tone="ghost"
						size="compact"
						disabled={scheduling || !model.selectedCount || !date || !time}
						onClick={() => void schedule(false)}
						className="col-span-2 max-[720px]:min-h-11"
					>
						{t("planTray.exact")}
					</Button>
					{scheduleError ? (
						<p role="alert" className="col-span-2 m-0 text-[11px] text-ttd-danger">
							{scheduleError}
						</p>
					) : null}
				</div>
			) : null}
			<div
				className={`mt-1.5 grid min-h-0 flex-1 gap-1 overflow-y-auto ${model.collapsed ? "max-[720px]:hidden" : ""}`}
			>
				{visible.length ? (
					visible.map((item) => (
						<PlanItem key={item.key} item={item} selectionMode={model.selectionMode} />
					))
				) : (
					<p className="m-0 px-2 py-6 text-center text-[11px] text-ttd-faint">
						{t(model.items.length ? "planTray.noMatch" : "planTray.allScheduled")}
					</p>
				)}
			</div>
		</aside>
	);
}
