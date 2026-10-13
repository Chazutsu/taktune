import { useState, type ReactElement } from "react";
import { useI18n } from "./i18n";

export type ReminderAction = "snooze" | "dismiss" | "open" | "complete";

export interface ReminderDialogModel {
	description: string;
	meta: string[];
	isCountdown: boolean;
	onAction: (action: ReminderAction, value?: number) => void | Promise<void>;
}

export function ReminderDialog({ model }: { model: ReminderDialogModel }): ReactElement {
	const t = useI18n();
	const [pending, setPending] = useState<string | null>(null);
	const [error, setError] = useState("");
	const run = async (action: ReminderAction, value?: number): Promise<void> => {
		if (pending) return;
		setPending(`${action}-${value ?? ""}`);
		setError("");
		try {
			await model.onAction(action, value);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("reminder.error.update"));
			setPending(null);
		}
	};
	return (
		<section className="grid gap-3" aria-busy={Boolean(pending)}>
			<header className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
				<span
					aria-hidden="true"
					className="grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-orange)_15%,transparent)] text-xl text-[var(--color-orange)]"
				>
					◷
				</span>
				<div>
					<h2 className="m-0 text-lg font-semibold">{t("reminder.title")}</h2>
					<p className="m-0 mt-0.5 text-sm leading-relaxed text-[var(--text-normal)]">
						{model.description}
					</p>
				</div>
			</header>
			{model.meta.length ? (
				<div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
					{model.meta.map((item) => (
						<span key={item} className="break-all">
							{item}
						</span>
					))}
				</div>
			) : null}
			<div>
				<p className="mb-1.5 mt-1 text-xs text-[var(--text-muted)]">{t("reminder.snooze")}</p>
				<div className="grid grid-cols-3 gap-2 max-[420px]:grid-cols-1">
					{[5, 15, 60].map((minutes) => (
						<button
							key={minutes}
							type="button"
							disabled={Boolean(pending)}
							onClick={() => void run("snooze", minutes)}
							className="min-h-10 w-full max-[420px]:min-h-11"
						>
							{pending === `snooze-${minutes}`
								? t("reminder.setting")
								: t(`reminder.duration.${minutes}`)}
						</button>
					))}
				</div>
			</div>
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="mt-1 flex flex-wrap justify-end gap-2 max-[420px]:grid max-[420px]:grid-cols-1 max-[420px]:[&>button]:min-h-11">
				<button type="button" disabled={Boolean(pending)} onClick={() => void run("dismiss")}>
					{t("reminder.dismiss")}
				</button>
				<button type="button" disabled={Boolean(pending)} onClick={() => void run("open")}>
					{model.isCountdown ? t("reminder.openCountdown") : t("reminder.openTask")}
				</button>
				{model.isCountdown ? null : (
					<button
						type="button"
						className="mod-cta"
						disabled={Boolean(pending)}
						onClick={() => void run("complete")}
					>
						{pending === "complete-" ? t("reminder.completing") : t("reminder.complete")}
					</button>
				)}
			</footer>
		</section>
	);
}
