import { useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface CountdownDialogValue {
	title: string;
	date: string;
	note: string;
	repeat: string;
	dayMode: string;
	reminder: string;
	reminderDays: number;
	color: string;
}

export interface CountdownDialogModel {
	title: string;
	initial: CountdownDialogValue;
	canDelete: boolean;
	onCancel: () => void;
	onDelete: () => boolean | void | Promise<boolean | void>;
	onSave: (value: CountdownDialogValue) => void | Promise<void>;
}

const REPEATS = [
	"none",
	"monthly-date",
	"monthly-last",
	"monthly-weekday",
	"yearly-date",
	"yearly-last",
	"yearly-weekday",
] as const;
const ADVANCES = [0, 1, 3, 7, 14, 30] as const;

export function CountdownDialog({ model }: { model: CountdownDialogModel }): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState(model.initial);
	const [reminderEnabled, setReminderEnabled] = useState(Boolean(model.initial.reminder));
	const [pending, setPending] = useState<"save" | "delete" | null>(null);
	const [error, setError] = useState("");
	const update = <K extends keyof CountdownDialogValue>(
		key: K,
		next: CountdownDialogValue[K],
	): void => setValue((current) => ({ ...current, [key]: next }));
	const run = async (action: "save" | "delete"): Promise<void> => {
		if (pending || (action === "save" && (!value.title.trim() || !value.date))) return;
		setPending(action);
		setError("");
		try {
			if (action === "delete") {
				const accepted = await model.onDelete();
				if (accepted === false) setPending(null);
			} else
				await model.onSave({
					...value,
					title: value.title.trim(),
					note: value.note.trim(),
					reminder: reminderEnabled ? value.reminder || "09:00" : "",
				});
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("countdownDialog.error.save"));
			setPending(null);
		}
	};
	const field =
		"grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 max-[520px]:grid-cols-1 max-[520px]:gap-1 [&>span]:text-xs [&>span]:text-[var(--text-muted)] [&>input]:min-h-9 [&>select]:min-h-9 max-[520px]:[&>input]:min-h-11 max-[520px]:[&>select]:min-h-11";
	const repeatLabels = REPEATS.map((id) => t(`countdownDialog.repeat.${id}`));
	const advanceLabels = ADVANCES.map((days) => t(`countdownDialog.advance.${days}`));
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
				<span>{t("countdownDialog.name")}</span>
				<input
					autoFocus
					aria-label={t("countdownDialog.name")}
					value={value.title}
					onChange={(event) => update("title", event.target.value)}
					placeholder={t("countdownDialog.namePlaceholder")}
				/>
			</label>
			<label className={field}>
				<span>{t("countdownDialog.date")}</span>
				<input
					aria-label={t("countdownDialog.date")}
					type="date"
					value={value.date}
					onChange={(event) => update("date", event.target.value)}
				/>
			</label>
			<label className={field}>
				<span>{t("countdownDialog.note")}</span>
				<input
					aria-label={t("countdownDialog.note")}
					value={value.note}
					onChange={(event) => update("note", event.target.value)}
					placeholder={t("countdownDialog.notePlaceholder")}
				/>
			</label>
			<label className={field}>
				<span>{t("countdownDialog.repeat")}</span>
				<select
					aria-label={t("countdownDialog.repeat")}
					value={value.repeat}
					onChange={(event) => update("repeat", event.target.value)}
				>
					{REPEATS.map((id, index) => (
						<option key={id} value={id}>
							{repeatLabels[index]}
						</option>
					))}
				</select>
			</label>
			<label className={field}>
				<span>{t("countdownDialog.dayMode")}</span>
				<select
					aria-label={t("countdownDialog.dayMode")}
					value={value.dayMode}
					onChange={(event) => update("dayMode", event.target.value)}
				>
					<option value="standard">{t("countdownDialog.dayMode.standard")}</option>
					<option value="plus-one">{t("countdownDialog.dayMode.plusOne")}</option>
				</select>
			</label>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("countdownDialog.notification")}
				</legend>
				<label className="flex min-h-9 items-center gap-2 text-xs max-[520px]:min-h-11">
					<input
						aria-label={t("countdownDialog.enableNotification")}
						type="checkbox"
						checked={reminderEnabled}
						onChange={(event) => setReminderEnabled(event.target.checked)}
					/>
					<span>{t("countdownDialog.enableNotification")}</span>
				</label>
				<div className="grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
					<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
						<span>{t("countdownDialog.time")}</span>
						<input
							aria-label={t("countdownDialog.notificationTime")}
							type="time"
							disabled={!reminderEnabled}
							value={value.reminder || "09:00"}
							onChange={(event) => update("reminder", event.target.value)}
							className="min-h-9 max-[520px]:min-h-11"
						/>
					</label>
					<label className="grid gap-1 text-[11px] text-[var(--text-muted)]">
						<span>{t("countdownDialog.timing")}</span>
						<select
							aria-label={t("countdownDialog.advance")}
							disabled={!reminderEnabled}
							value={value.reminderDays}
							onChange={(event) => update("reminderDays", Number(event.target.value))}
							className="min-h-9 max-[520px]:min-h-11"
						>
							{ADVANCES.map((days, index) => (
								<option key={days} value={days}>
									{advanceLabels[index]}
								</option>
							))}
						</select>
					</label>
				</div>
			</fieldset>
			<label className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
				<span>{t("countdownDialog.color")}</span>
				<input
					aria-label={t("countdownDialog.color")}
					type="color"
					value={value.color}
					onChange={(event) => update("color", event.target.value)}
					className="h-11 w-16 p-1"
				/>
			</label>
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="mt-1 flex flex-wrap items-center gap-2 max-[520px]:[&>button]:min-h-11">
				{model.canDelete ? (
					<button
						type="button"
						className="mr-auto text-[var(--text-error)]"
						disabled={Boolean(pending)}
						onClick={() => void run("delete")}
					>
						{pending === "delete" ? t("taxonomy.deleting") : t("taxonomy.delete")}
					</button>
				) : (
					<span className="mr-auto" />
				)}
				<button type="button" disabled={Boolean(pending)} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button
					type="submit"
					className="mod-cta"
					disabled={Boolean(pending) || !value.title.trim() || !value.date}
				>
					{pending === "save" ? t("taxonomy.saving") : t("taxonomy.save")}
				</button>
			</footer>
		</form>
	);
}
