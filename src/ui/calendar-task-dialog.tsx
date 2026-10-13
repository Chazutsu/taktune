import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface CalendarTaskDialogModel<TParsed = unknown> {
	dateLabel: string;
	lists: string[];
	parse: (description: string) => TParsed;
	onCancel: () => void;
	onSubmit: (parsed: TParsed, duration: number, list: string) => void | Promise<void>;
}

const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export function CalendarTaskDialog<TParsed>({
	model,
}: {
	model: CalendarTaskDialogModel<TParsed>;
}): ReactElement {
	const t = useI18n();
	const inputRef = useRef<HTMLInputElement>(null);
	const [description, setDescription] = useState("");
	const [duration, setDuration] = useState(60);
	const [list, setList] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	const submit = async (event: FormEvent): Promise<void> => {
		event.preventDefault();
		if (!description.trim() || pending) return;
		setPending(true);
		setError("");
		try {
			await model.onSubmit(model.parse(description), duration, list);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("calendarTask.error"));
			setPending(false);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	};

	return (
		<form onSubmit={(event) => void submit(event)} className="grid gap-3" aria-busy={pending}>
			<header>
				<h2 className="m-0 text-lg font-semibold">{t("calendarTask.title")}</h2>
				<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
					{t("calendarTask.starts", { date: model.dateLabel })}
				</p>
			</header>
			<label className="grid gap-1">
				<span className="text-xs text-[var(--text-muted)]">{t("quickAdd.description")}</span>
				<input
					ref={inputRef}
					autoFocus
					type="text"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
					placeholder={t("calendarTask.placeholder")}
					className="h-11 w-full px-3 text-sm"
				/>
			</label>
			<div className="grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
				<label className="grid gap-1">
					<span className="text-[11px] text-[var(--text-muted)]">{t("calendarTask.duration")}</span>
					<select
						aria-label={t("calendarTask.duration")}
						value={duration}
						onChange={(event) => setDuration(Number(event.target.value))}
						className="min-h-9 min-w-0 max-[520px]:min-h-11"
					>
						{DURATIONS.map((value) => (
							<option key={value} value={value}>
								{t("calendarTask.minutes", { count: value })}
							</option>
						))}
					</select>
				</label>
				<label className="grid gap-1">
					<span className="text-[11px] text-[var(--text-muted)]">{t("filter.list")}</span>
					<select
						aria-label={t("filter.list")}
						value={list}
						onChange={(event) => setList(event.target.value)}
						className="min-h-9 min-w-0 max-[520px]:min-h-11"
					>
						<option value="">{t("nav.inbox")}</option>
						{model.lists.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
				</label>
			</div>
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="mt-1 flex flex-wrap justify-end gap-2 max-[520px]:[&>button]:min-h-11 max-[520px]:[&>button]:flex-1">
				<button type="button" onClick={model.onCancel} disabled={pending}>
					{t("taxonomy.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={!description.trim() || pending}>
					{pending ? t("quickAdd.addingEllipsis") : t("quickAdd.add")}
				</button>
			</footer>
		</form>
	);
}
