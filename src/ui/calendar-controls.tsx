import { useEffect, useState, type ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { OverflowMenu } from "./overflow-menu";

export interface CalendarModeItem {
	id: string;
	label: string;
}

export interface CalendarControlsModel {
	activeMode: string;
	error?: string;
	filterLabel: string;
	googleLabel: string;
	label: string;
	modes: CalendarModeItem[];
	nextLabel: string;
	onMode: (mode: string) => void | Promise<void>;
	onNext: () => void | Promise<void>;
	onOpenFilter: () => void;
	onOpenGoogle: () => void | Promise<void>;
	onOpenSubscriptions: () => void;
	onOpenViewOptions: () => void;
	onPrevious: () => void | Promise<void>;
	onSearch: (query: string) => void;
	onSelectMode: () => void | Promise<void>;
	onToday: () => void | Promise<void>;
	previousLabel: string;
	search: string;
	selectionMode: boolean;
	subscriptionLabel: string;
}

export function CalendarControls({ model }: { model: CalendarControlsModel }): ReactElement {
	const t = useI18n();
	const { onSearch, search } = model;
	const [queryDraft, setQueryDraft] = useState({ source: search, value: search });
	const query = queryDraft.source === search ? queryDraft.value : search;
	const setQuery = (value: string): void => setQueryDraft({ source: search, value });
	useEffect(() => {
		if (query === search) return;
		const timer = window.setTimeout(() => onSearch(query), 180);
		return () => window.clearTimeout(timer);
	}, [onSearch, query, search]);
	return (
		<header className="mb-1.5 grid gap-1.5 border-b border-ttd-border pb-1.5">
			{model.error ? (
				<div
					role="alert"
					className="rounded-ttd-control bg-ttd-danger-soft px-2.5 py-1.5 text-[11px] text-ttd-danger"
				>
					{model.error}
				</div>
			) : null}
			<div className="flex min-w-0 items-center gap-1">
				<button
					type="button"
					aria-label={model.previousLabel}
					onClick={() => void model.onPrevious()}
					className="grid size-8 shrink-0 place-items-center rounded-ttd-control border border-ttd-border bg-transparent p-0 shadow-none max-[620px]:size-11"
				>
					<Icon name="chevron-left" />
				</button>
				<button
					type="button"
					onClick={() => void model.onToday()}
					className="h-8 shrink-0 rounded-ttd-control px-2.5 text-xs max-[620px]:h-11"
				>
					{t("nav.today")}
				</button>
				<button
					type="button"
					aria-label={model.nextLabel}
					onClick={() => void model.onNext()}
					className="grid size-8 shrink-0 place-items-center rounded-ttd-control border border-ttd-border bg-transparent p-0 shadow-none max-[620px]:size-11"
				>
					<Icon name="chevron-right" />
				</button>
				<strong className="min-w-0 truncate px-1 text-sm">{model.label}</strong>
				<label className="ml-auto flex h-8 min-w-36 max-w-56 flex-1 items-center gap-1.5 rounded-ttd-control border border-ttd-border bg-ttd-canvas px-2 focus-within:border-ttd-accent max-[620px]:hidden">
					<span className="text-ttd-faint">
						<Icon name="search" />
					</span>
					<span className="sr-only">{t("calendarControls.search")}</span>
					<input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("calendarControls.searchPlaceholder")}
						className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] shadow-none focus:shadow-none"
					/>
				</label>
				<OverflowMenu
					label={t("calendarControls.displayAndIntegrations")}
					triggerIcon="sliders-horizontal"
					triggerClassName="grid size-8 shrink-0 place-items-center rounded-ttd-control border border-ttd-border bg-transparent p-0 text-ttd-muted shadow-none max-[620px]:size-11"
					items={[
						{ label: model.filterLabel, icon: "list-filter", onSelect: model.onOpenFilter },
						{ label: model.googleLabel, icon: "calendar-days", onSelect: model.onOpenGoogle },
						{ label: model.subscriptionLabel, icon: "rss", onSelect: model.onOpenSubscriptions },
						{
							label: t("calendarControls.viewOptions"),
							icon: "settings-2",
							onSelect: model.onOpenViewOptions,
						},
						{
							label: model.selectionMode ? t("planTray.endSelection") : t("planTray.multiSelect"),
							icon: "list-checks",
							onSelect: model.onSelectMode,
						},
					]}
				/>
			</div>
			<label className="hidden h-8 items-center gap-1.5 rounded-ttd-control border border-ttd-border px-2 focus-within:border-ttd-accent max-[620px]:flex max-[620px]:min-h-11">
				<Icon name="search" />
				<span className="sr-only">{t("calendarControls.search")}</span>
				<input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t("calendarControls.searchPlaceholder")}
					className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] shadow-none"
				/>
			</label>
			<nav
				aria-label={t("calendarControls.period")}
				className="flex min-w-0 gap-0.5 overflow-x-auto rounded-ttd-control bg-ttd-surface p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{model.modes.map((mode) => (
					<button
						type="button"
						key={mode.id}
						aria-pressed={model.activeMode === mode.id}
						onClick={() => void model.onMode(mode.id)}
						className={`h-7 shrink-0 rounded px-2 text-[11px] shadow-none max-[620px]:h-11 max-[620px]:min-w-11 ${model.activeMode === mode.id ? "bg-ttd-canvas font-semibold text-ttd-accent" : "border-0 bg-transparent text-ttd-muted"}`}
					>
						{mode.label}
					</button>
				))}
			</nav>
		</header>
	);
}
