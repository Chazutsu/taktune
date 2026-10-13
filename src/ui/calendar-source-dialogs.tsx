import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

interface CalendarSource {
	id: string;
	name: string;
	color?: string;
	primary?: boolean;
}

interface BaseModel {
	onCancel: () => void;
}

export interface CalendarListFilterModel extends BaseModel {
	lists: string[];
	selected: string[];
	onSave: (selected: string[]) => void | Promise<void>;
}

export interface GoogleCalendarSourcesModel extends BaseModel {
	calendars: CalendarSource[];
	selected: string[];
	onSave: (selected: string[]) => void | Promise<void>;
}

function ErrorMessage({ message }: { message: string }): ReactElement | null {
	return message ? (
		<p
			role="alert"
			className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
		>
			{message}
		</p>
	) : null;
}

export function CalendarListFilterDialog({
	model,
}: {
	model: CalendarListFilterModel;
}): ReactElement {
	const t = useI18n();
	const [selected, setSelected] = useState(() => new Set(model.selected));
	const [pending, setPending] = useState<"all" | "save" | null>(null);
	const [error, setError] = useState("");
	const save = async (all: boolean): Promise<void> => {
		if (pending) return;
		setPending(all ? "all" : "save");
		setError("");
		try {
			await model.onSave(all ? [] : [...selected]);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("calendarSources.error.lists"));
			setPending(null);
		}
	};
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void save(false);
			}}
			className="grid gap-3"
			aria-busy={Boolean(pending)}
		>
			<div>
				<h2 className="m-0 text-lg font-semibold">{t("calendarSources.listsTitle")}</h2>
				<p className="mb-0 mt-1 text-xs text-[var(--text-muted)]">
					{t("calendarSources.listsDescription")}
				</p>
			</div>
			<div className="max-h-[52vh] overflow-y-auto rounded-lg border border-[var(--background-modifier-border)]">
				{model.lists.map((list) => (
					<label
						key={list}
						className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[color-mix(in_srgb,var(--background-modifier-border)_60%,transparent)] px-3 py-1.5 text-sm last:border-b-0"
					>
						<input
							aria-label={list}
							type="checkbox"
							checked={selected.has(list)}
							onChange={(event) =>
								setSelected((current) => {
									const next = new Set(current);
									if (event.target.checked) next.add(list);
									else next.delete(list);
									return next;
								})
							}
						/>
						<span className="min-w-0 truncate">{list}</span>
					</label>
				))}
			</div>
			<ErrorMessage message={error} />
			<footer className="flex flex-wrap items-center gap-2 max-[420px]:grid max-[420px]:grid-cols-1 max-[420px]:[&>button]:min-h-11">
				<button
					type="button"
					className="mr-auto max-[420px]:mr-0"
					disabled={Boolean(pending)}
					onClick={() => void save(true)}
				>
					{pending === "all" ? t("calendarSources.applying") : t("calendarSources.showAll")}
				</button>
				<button type="button" disabled={Boolean(pending)} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={Boolean(pending)}>
					{pending === "save" ? t("calendarSources.applying") : t("calendarSources.apply")}
				</button>
			</footer>
		</form>
	);
}

export function GoogleCalendarSourcesDialog({
	model,
}: {
	model: GoogleCalendarSourcesModel;
}): ReactElement {
	const t = useI18n();
	const [selected, setSelected] = useState(() => new Set(model.selected));
	const [query, setQuery] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const calendars = useMemo(() => {
		const locale = t("taskEdit.dateLocale");
		const normalized = query.trim().toLocaleLowerCase(locale);
		return model.calendars
			.filter(
				(calendar) =>
					!normalized ||
					`${calendar.name} ${calendar.id}`.toLocaleLowerCase(locale).includes(normalized),
			)
			.toSorted(
				(a, b) =>
					Number(selected.has(b.id)) - Number(selected.has(a.id)) ||
					a.name.localeCompare(b.name, locale),
			);
	}, [model.calendars, query, selected, t]);
	const save = async (): Promise<void> => {
		if (pending) return;
		if (!selected.size) {
			setError(t("calendarSources.error.select"));
			return;
		}
		setPending(true);
		setError("");
		try {
			await model.onSave([...selected]);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("calendarSources.error.google"));
			setPending(false);
		}
	};
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void save();
			}}
			className="grid min-w-0 gap-3"
			aria-busy={pending}
		>
			<div>
				<h2 className="m-0 text-lg font-semibold">{t("calendarSources.googleTitle")}</h2>
				<p className="mb-0 mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
					{t("calendarSources.googleDescription")}
				</p>
			</div>
			<input
				autoFocus
				aria-label={t("calendarSources.search")}
				type="search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={t("calendarSources.search")}
				className="min-h-9 w-full max-[520px]:min-h-11"
			/>
			<div className="max-h-[52vh] overflow-y-auto border-y border-[var(--background-modifier-border)]">
				{calendars.length ? (
					calendars.map((calendar) => (
						<label
							key={calendar.id}
							className="grid min-h-12 cursor-pointer grid-cols-[24px_12px_minmax(0,1fr)] items-center gap-2 border-b border-[color-mix(in_srgb,var(--background-modifier-border)_60%,transparent)] px-1 py-1.5 last:border-b-0"
						>
							<input
								aria-label={calendar.name}
								type="checkbox"
								checked={selected.has(calendar.id)}
								onChange={(event) =>
									setSelected((current) => {
										const next = new Set(current);
										if (event.target.checked) next.add(calendar.id);
										else next.delete(calendar.id);
										return next;
									})
								}
							/>
							<span
								aria-hidden="true"
								className="size-2.5 rounded-full"
								style={{ backgroundColor: calendar.color || "#7693e8" }}
							/>
							<span className="min-w-0">
								<span className="block truncate text-xs">{calendar.name}</span>
								<span className="block truncate text-[11px] text-[var(--text-faint)]">
									{calendar.primary ? t("calendarSources.primary") : calendar.id}
								</span>
							</span>
						</label>
					))
				) : (
					<p className="m-0 px-2 py-6 text-center text-xs text-[var(--text-muted)]">
						{t("calendarSources.empty")}
					</p>
				)}
			</div>
			<ErrorMessage message={error} />
			<footer className="flex justify-end gap-2 max-[420px]:grid max-[420px]:grid-cols-1 max-[420px]:[&>button]:min-h-11">
				<button type="button" disabled={pending} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={pending}>
					{pending
						? t("calendarSources.applying")
						: t("calendarSources.applyCount", { count: selected.size })}
				</button>
			</footer>
		</form>
	);
}
