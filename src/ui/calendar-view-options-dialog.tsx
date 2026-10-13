import { useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface CalendarViewOptionsValue {
	colorMode: string;
	showCompleted: boolean;
	density: string;
	showDetails: boolean;
	showEvents: boolean;
	showHabits: boolean;
	showFocus: boolean;
	showFutureRepeats: boolean;
	showTasks: boolean;
	timeZones: string[];
}

export interface CalendarViewOptionsModel {
	initial: CalendarViewOptionsValue;
	onCancel: () => void;
	onSave: (value: CalendarViewOptionsValue) => void | Promise<void>;
	validateTimeZone: (value: string) => boolean;
}

function Toggle({
	label,
	description,
	checked,
	onChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}): ReactElement {
	return (
		<label className="grid min-h-11 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[color-mix(in_srgb,var(--background-modifier-border)_60%,transparent)] py-2 last:border-b-0">
			<span>
				<span className="block text-xs text-[var(--text-normal)]">{label}</span>
				<span className="block text-[11px] leading-relaxed text-[var(--text-muted)]">
					{description}
				</span>
			</span>
			<input
				aria-label={label}
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
			/>
		</label>
	);
}

export function CalendarViewOptionsDialog({
	model,
}: {
	model: CalendarViewOptionsModel;
}): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState(model.initial);
	const [visibleTimeZoneCount, setVisibleTimeZoneCount] = useState(() =>
		Math.min(4, Math.max(1, model.initial.timeZones.filter(Boolean).length + 1)),
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const update = <K extends keyof CalendarViewOptionsValue>(
		key: K,
		next: CalendarViewOptionsValue[K],
	): void => setValue((current) => ({ ...current, [key]: next }));
	const invalidZones = value.timeZones
		.map((zone) => zone.trim())
		.filter((zone) => zone && !model.validateTimeZone(zone));
	const save = async (): Promise<void> => {
		if (pending) return;
		if (invalidZones.length) {
			setError(t("viewOptions.error.timeZones", { zones: invalidZones.join(", ") }));
			return;
		}
		setPending(true);
		setError("");
		try {
			await model.onSave({
				...value,
				timeZones: value.timeZones.map((zone) => zone.trim()).filter(Boolean),
			});
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("viewOptions.error.save"));
			setPending(false);
		}
	};
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void save();
			}}
			className="grid gap-3"
			aria-busy={pending}
		>
			<h2 className="m-0 text-lg font-semibold">{t("viewOptions.title")}</h2>
			<fieldset className="m-0 grid grid-cols-2 gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5 max-[520px]:grid-cols-1">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("viewOptions.appearance")}
				</legend>
				<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
					<span>{t("viewOptions.taskColor")}</span>
					<select
						aria-label={t("viewOptions.taskColor")}
						value={value.colorMode}
						onChange={(event) => update("colorMode", event.target.value)}
						className="min-h-9 max-[520px]:min-h-11"
					>
						<option value="list">{t("filter.list")}</option>
						<option value="tag">{t("viewOptions.firstTag")}</option>
						<option value="priority">{t("filter.priority")}</option>
					</select>
				</label>
				<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
					<span>{t("viewOptions.density")}</span>
					<select
						aria-label={t("viewOptions.density")}
						value={value.density}
						onChange={(event) => update("density", event.target.value)}
						className="min-h-9 max-[520px]:min-h-11"
					>
						<option value="comfortable">{t("viewOptions.comfortable")}</option>
						<option value="compact">{t("viewOptions.compact")}</option>
					</select>
				</label>
			</fieldset>
			<fieldset className="m-0 rounded-lg border border-[var(--background-modifier-border)] px-2.5 py-1">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("viewOptions.information")}
				</legend>
				<Toggle
					label={t("viewOptions.tasks")}
					description={t("viewOptions.tasksDescription")}
					checked={value.showTasks}
					onChange={(checked) => update("showTasks", checked)}
				/>
				<Toggle
					label={t("viewOptions.events")}
					description={t("viewOptions.eventsDescription")}
					checked={value.showEvents}
					onChange={(checked) => update("showEvents", checked)}
				/>
				<Toggle
					label={t("viewOptions.habits")}
					description={t("viewOptions.habitsDescription")}
					checked={value.showHabits}
					onChange={(checked) => update("showHabits", checked)}
				/>
				<Toggle
					label={t("viewOptions.focus")}
					description={t("viewOptions.focusDescription")}
					checked={value.showFocus}
					onChange={(checked) => update("showFocus", checked)}
				/>
				<Toggle
					label={t("viewOptions.completed")}
					description={t("viewOptions.completedDescription")}
					checked={value.showCompleted}
					onChange={(checked) => update("showCompleted", checked)}
				/>
				<Toggle
					label={t("viewOptions.futureRepeats")}
					description={t("viewOptions.futureRepeatsDescription")}
					checked={value.showFutureRepeats}
					onChange={(checked) => update("showFutureRepeats", checked)}
				/>
				<Toggle
					label={t("viewOptions.details")}
					description={t("viewOptions.detailsDescription")}
					checked={value.showDetails}
					onChange={(checked) => update("showDetails", checked)}
				/>
			</fieldset>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("viewOptions.timeZones")}
				</legend>
				<p className="m-0 text-[11px] text-[var(--text-muted)]">
					{t("viewOptions.timeZonesDescription")}
				</p>
				<div className="grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
					{Array.from({ length: visibleTimeZoneCount }, (_, index) => (
						<input
							key={index}
							aria-label={t("viewOptions.timeZone", { number: index + 1 })}
							value={value.timeZones[index] || ""}
							onChange={(event) => {
								const next = [...value.timeZones];
								next[index] = event.target.value;
								update("timeZones", next);
							}}
							placeholder={index === 0 ? "America/New_York" : t("habitDialog.unset")}
							className="min-h-9 max-[520px]:min-h-11"
						/>
					))}
				</div>
				{visibleTimeZoneCount < 4 ? (
					<button
						type="button"
						onClick={() => setVisibleTimeZoneCount((count) => Math.min(4, count + 1))}
						className="min-h-9 justify-self-start border-0 bg-transparent px-1 text-xs text-[var(--interactive-accent)] shadow-none max-[520px]:min-h-11"
					>
						{t("viewOptions.addTimeZone")}
					</button>
				) : null}
			</fieldset>
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="flex justify-end gap-2 max-[420px]:grid max-[420px]:grid-cols-1 max-[420px]:[&>button]:min-h-11">
				<button type="button" disabled={pending} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={pending}>
					{pending ? t("calendarSources.applying") : t("calendarSources.apply")}
				</button>
			</footer>
		</form>
	);
}
