import { useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface HabitDialogValue {
	name: string;
	target: number;
	unit: string;
	scheduleMode: "weekdays" | "weekly";
	weekdays: number[];
	weeklyTarget: number;
	reminders: string[];
	archived: boolean;
}

export interface HabitDialogModel {
	title: string;
	initial: HabitDialogValue;
	canManage: boolean;
	onCancel: () => void;
	onDelete: () => boolean | void | Promise<boolean | void>;
	onArchive: (archived: boolean) => void | Promise<void>;
	onSave: (value: HabitDialogValue) => void | Promise<void>;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitDialog({ model }: { model: HabitDialogModel }): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState(model.initial);
	const [pending, setPending] = useState<"save" | "delete" | "archive" | null>(null);
	const [error, setError] = useState("");
	const update = <K extends keyof HabitDialogValue>(key: K, next: HabitDialogValue[K]): void =>
		setValue((current) => ({ ...current, [key]: next }));
	const toggleDay = (day: number): void =>
		update(
			"weekdays",
			value.weekdays.includes(day)
				? value.weekdays.filter((item) => item !== day)
				: [...value.weekdays, day].toSorted(),
		);
	const run = async (action: "save" | "delete" | "archive"): Promise<void> => {
		if (pending) return;
		if (
			action === "save" &&
			(!value.name.trim() || (value.scheduleMode === "weekdays" && !value.weekdays.length))
		)
			return;
		setPending(action);
		setError("");
		try {
			if (action === "delete") {
				const accepted = await model.onDelete();
				if (accepted === false) setPending(null);
			} else if (action === "archive") await model.onArchive(!value.archived);
			else
				await model.onSave({
					...value,
					name: value.name.trim(),
					target: Math.max(1, Math.min(999, Number(value.target) || 1)),
					unit: value.unit.trim() || t("habitDialog.defaultUnit"),
					weekdays: value.scheduleMode === "weekly" ? [0, 1, 2, 3, 4, 5, 6] : value.weekdays,
					weeklyTarget: Math.max(1, Math.min(7, Number(value.weeklyTarget) || 1)),
					reminders: [...new Set(value.reminders.filter(Boolean))].toSorted(),
				});
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("habitDialog.error.save"));
			setPending(null);
		}
	};
	const field =
		"grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 max-[520px]:grid-cols-1 max-[520px]:gap-1 [&>span]:text-xs [&>span]:text-[var(--text-muted)] [&_input]:min-h-9 [&_select]:min-h-9 max-[520px]:[&_input]:min-h-11 max-[520px]:[&_select]:min-h-11";
	const invalidSchedule = value.scheduleMode === "weekdays" && !value.weekdays.length;
	const dayLabels = DAYS.map((day) => t(`habitDialog.day.${day}`));
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void run("save");
			}}
			className="grid gap-3"
			aria-busy={Boolean(pending)}
		>
			<h2 className="m-0 text-lg font-semibold">{model.title}</h2>
			<label className={field}>
				<span>{t("habitDialog.name")}</span>
				<input
					autoFocus
					aria-label={t("habitDialog.name")}
					value={value.name}
					onChange={(event) => update("name", event.target.value)}
					placeholder={t("habitDialog.namePlaceholder")}
				/>
			</label>
			<label className={field}>
				<span>{t("habitDialog.dailyTarget")}</span>
				<span className="grid grid-cols-[minmax(72px,.45fr)_minmax(0,1fr)] gap-2">
					<input
						aria-label={t("habitDialog.target")}
						type="number"
						min="1"
						max="999"
						value={value.target}
						onChange={(event) => update("target", Number(event.target.value))}
					/>
					<input
						aria-label={t("habitDialog.unit")}
						maxLength={12}
						value={value.unit}
						onChange={(event) => update("unit", event.target.value)}
						placeholder={t("habitDialog.unitPlaceholder")}
					/>
				</span>
			</label>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("habitDialog.frequency")}
				</legend>
				<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
					<span>{t("habitDialog.repeatMode")}</span>
					<select
						aria-label={t("habitDialog.frequency")}
						value={value.scheduleMode}
						onChange={(event) =>
							update("scheduleMode", event.target.value as HabitDialogValue["scheduleMode"])
						}
						className="min-h-9 max-[520px]:min-h-11"
					>
						<option value="weekdays">{t("habitDialog.weekdays")}</option>
						<option value="weekly">{t("habitDialog.weekly")}</option>
					</select>
				</label>
				{value.scheduleMode === "weekdays" ? (
					<div>
						<span className="mb-1 block text-[11px] text-[var(--text-muted)]">
							{t("habitDialog.activeDays")}
						</span>
						<div className="grid grid-cols-7 gap-1.5">
							{DAYS.map((day) => (
								<label
									key={day}
									className="grid min-h-11 cursor-pointer place-items-center gap-0.5 rounded-md border border-[var(--background-modifier-border)] py-1 text-[11px] has-[:checked]:border-[var(--interactive-accent)] has-[:checked]:bg-[var(--background-modifier-active-hover)]"
								>
									<input
										aria-label={t("habitDialog.weekday", { day: dayLabels[day] })}
										type="checkbox"
										checked={value.weekdays.includes(day)}
										onChange={() => toggleDay(day)}
									/>
									<span>{dayLabels[day]}</span>
								</label>
							))}
						</div>
						{invalidSchedule ? (
							<p role="alert" className="mb-0 mt-1 text-xs text-[var(--text-error)]">
								{t("habitDialog.error.days")}
							</p>
						) : null}
					</div>
				) : (
					<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
						<span>{t("habitDialog.weeklyTarget")}</span>
						<input
							aria-label={t("habitDialog.weeklyTarget")}
							type="number"
							min="1"
							max="7"
							value={value.weeklyTarget}
							onChange={(event) => update("weeklyTarget", Number(event.target.value))}
							className="min-h-9 max-w-24 max-[520px]:min-h-11"
						/>
					</label>
				)}
			</fieldset>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("habitDialog.notifications")}
				</legend>
				<div className="flex flex-wrap gap-2">
					{value.reminders.map((time, index) => (
						<span key={`${index}-${time}`} className="flex items-center gap-1">
							<input
								aria-label={t("habitDialog.notificationTime", { number: index + 1 })}
								type="time"
								value={time}
								onChange={(event) =>
									update(
										"reminders",
										value.reminders.map((item, itemIndex) =>
											itemIndex === index ? event.target.value : item,
										),
									)
								}
								className="min-h-9 w-28 max-[520px]:min-h-11"
							/>
							<button
								type="button"
								aria-label={t("habitDialog.removeNotification", {
									time: time || t("habitDialog.unset"),
								})}
								onClick={() =>
									update(
										"reminders",
										value.reminders.filter((_, itemIndex) => itemIndex !== index),
									)
								}
								className="grid min-h-9 min-w-9 place-items-center p-1 max-[520px]:min-h-11 max-[520px]:min-w-11"
							>
								×
							</button>
						</span>
					))}
					<button
						type="button"
						onClick={() => update("reminders", [...value.reminders, "09:00"])}
						className="min-h-9 max-[520px]:min-h-11"
					>
						{t("habitDialog.addNotification")}
					</button>
				</div>
			</fieldset>
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="mt-1 flex flex-wrap items-center gap-2 max-[520px]:sticky max-[520px]:bottom-0 max-[520px]:-mx-1 max-[520px]:bg-[var(--background-primary)] max-[520px]:px-1 max-[520px]:py-2 max-[520px]:[&>button]:min-h-11">
				{model.canManage ? (
					<>
						<button type="button" disabled={Boolean(pending)} onClick={() => void run("archive")}>
							{pending === "archive"
								? t("habitDialog.updating")
								: value.archived
									? t("habitDialog.unarchive")
									: t("habitDialog.archive")}
						</button>
						<button
							type="button"
							className="mr-auto text-[var(--text-error)]"
							disabled={Boolean(pending)}
							onClick={() => void run("delete")}
						>
							{pending === "delete" ? t("taxonomy.deleting") : t("taxonomy.delete")}
						</button>
					</>
				) : (
					<span className="mr-auto" />
				)}
				<button type="button" disabled={Boolean(pending)} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button
					type="submit"
					className="mod-cta"
					disabled={Boolean(pending) || !value.name.trim() || invalidSchedule}
				>
					{pending === "save" ? t("taxonomy.saving") : t("taxonomy.save")}
				</button>
			</footer>
		</form>
	);
}
