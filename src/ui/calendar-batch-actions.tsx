import { useState, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface CalendarBatchActionsModel {
	date: string;
	selectedCount: number;
	onClear: () => Promise<void>;
	onMoveTo: (date: string) => Promise<void>;
	onShift: (days: number) => Promise<void>;
}

export function CalendarBatchActions({
	model,
}: {
	model: CalendarBatchActionsModel;
}): ReactElement {
	const t = useI18n();
	const [date, setDate] = useState(model.date);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const disabled = pending || model.selectedCount === 0;
	const run = async (action: () => Promise<void>): Promise<void> => {
		if (disabled) return;
		setPending(true);
		setError("");
		try {
			await action();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t("calendarBatch.error"));
		} finally {
			setPending(false);
		}
	};
	return (
		<div className="-mt-0.5 mb-2 rounded-lg border border-[color-mix(in_srgb,var(--ttd-blue)_32%,var(--background-modifier-border))] bg-[var(--ttd-blue-soft)] px-2 py-1.5">
			<div className="flex min-h-10 flex-wrap items-center gap-1.5">
				<strong aria-live="polite" className="min-w-16 text-xs">
					{pending
						? t("calendarBatch.moving")
						: t("calendarBatch.selected", { count: model.selectedCount })}
				</strong>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void run(() => model.onShift(1))}
					className="h-8 px-2.5 text-[11px] max-[620px]:min-h-11"
				>
					{t("calendarBatch.day")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void run(() => model.onShift(7))}
					className="h-8 px-2.5 text-[11px] max-[620px]:min-h-11"
				>
					{t("calendarBatch.week")}
				</button>
				<input
					type="date"
					aria-label={t("calendarBatch.destination")}
					value={date}
					disabled={pending}
					onChange={(event) => setDate(event.currentTarget.value)}
					className="ml-1 h-8 w-32 text-[11px] max-[620px]:ml-0 max-[620px]:min-h-11"
				/>
				<button
					type="button"
					disabled={disabled || !date}
					onClick={() => void run(() => model.onMoveTo(date))}
					className="h-8 px-2.5 text-[11px] max-[620px]:min-h-11"
				>
					{t("calendarBatch.move")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void run(model.onClear)}
					className="ml-auto h-8 px-2.5 text-[11px] max-[720px]:ml-0 max-[620px]:min-h-11"
				>
					{t("calendarBatch.clear")}
				</button>
			</div>
			{error ? (
				<p role="alert" className="mb-0 mt-1 text-[11px] text-[var(--text-error)]">
					{error}
				</p>
			) : null}
		</div>
	);
}
