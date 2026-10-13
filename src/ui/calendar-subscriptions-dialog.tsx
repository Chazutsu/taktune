import { useState, type ReactElement, type SyntheticEvent } from "react";
import { useI18n } from "./i18n";

export interface CalendarSubscriptionValue {
	id: string;
	name: string;
	url: string;
	color: string;
	enabled: boolean;
}

export interface CalendarSubscriptionsModel {
	initial: CalendarSubscriptionValue[];
	onCancel: () => void;
	onSave: (values: CalendarSubscriptionValue[]) => void | Promise<void>;
}

export function CalendarSubscriptionsDialog({
	model,
}: {
	model: CalendarSubscriptionsModel;
}): ReactElement {
	const t = useI18n();
	const [values, setValues] = useState(() => model.initial.map((item) => ({ ...item })));
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const update = <K extends keyof CalendarSubscriptionValue>(
		index: number,
		key: K,
		value: CalendarSubscriptionValue[K],
	): void =>
		setValues((current) =>
			current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
		);
	const save = async (): Promise<void> => {
		if (pending) return;
		const normalized = values
			.map((item) => ({ ...item, name: item.name.trim(), url: item.url.trim() }))
			.filter((item) => item.url);
		if (normalized.some((item) => !/^(?:https?|webcal):\/\//iu.test(item.url))) {
			setError(t("subscriptions.error.url"));
			return;
		}
		setPending(true);
		setError("");
		try {
			await model.onSave(normalized);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("subscriptions.error.save"));
			setPending(false);
		}
	};
	return (
		<form
			onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
				event.preventDefault();
				void save();
			}}
			className="grid min-w-0 gap-3"
			aria-busy={pending}
		>
			<div>
				<h2 className="m-0 text-lg font-semibold">{t("subscriptions.title")}</h2>
				<p className="mb-0 mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
					{t("subscriptions.description")}
				</p>
			</div>
			<div className="grid max-h-[56vh] gap-2 overflow-y-auto">
				{values.map((subscription, index) => (
					<fieldset
						key={subscription.id}
						className="m-0 grid grid-cols-[24px_minmax(100px,.6fr)_minmax(220px,1.5fr)_44px_44px] items-center gap-1.5 rounded-lg border border-[var(--background-modifier-border)] p-2 max-[620px]:grid-cols-[24px_minmax(0,1fr)_44px_44px]"
					>
						<legend className="sr-only">
							{subscription.name || t("subscriptions.number", { number: index + 1 })}
						</legend>
						<input
							aria-label={t("subscriptions.show", {
								name: subscription.name || t("subscriptions.subscription"),
							})}
							type="checkbox"
							checked={subscription.enabled}
							onChange={(event) => update(index, "enabled", event.target.checked)}
						/>
						<input
							aria-label={t("subscriptions.name", { number: index + 1 })}
							value={subscription.name}
							onChange={(event) => update(index, "name", event.target.value)}
							placeholder={t("subscriptions.displayName")}
							className="min-h-11 min-w-0"
						/>
						<input
							aria-label={t("subscriptions.url", { number: index + 1 })}
							type="password"
							value={subscription.url}
							onChange={(event) => update(index, "url", event.target.value)}
							placeholder="webcal:// or https://…ics"
							className="min-h-11 min-w-0 max-[620px]:col-[2/-1] max-[620px]:row-start-2"
						/>
						<input
							aria-label={t("subscriptions.color", { number: index + 1 })}
							type="color"
							value={subscription.color}
							onChange={(event) => update(index, "color", event.target.value)}
							className="size-11 p-1"
						/>
						<button
							type="button"
							aria-label={t("subscriptions.remove", {
								name: subscription.name || t("subscriptions.subscription"),
							})}
							disabled={pending}
							onClick={() =>
								setValues((current) => current.filter((_, itemIndex) => itemIndex !== index))
							}
							className="grid size-11 place-items-center p-0 text-[var(--text-error)]"
						>
							×
						</button>
					</fieldset>
				))}
			</div>
			<button
				type="button"
				disabled={pending}
				onClick={() =>
					setValues((current) => [
						...current,
						{
							id: `${Date.now()}-${current.length}`,
							name: "",
							url: "",
							color: "#5aa38b",
							enabled: true,
						},
					])
				}
				className="min-h-11 justify-self-start"
			>
				{t("subscriptions.add")}
			</button>
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
					{pending ? t("taxonomy.saving") : t("taxonomy.save")}
				</button>
			</footer>
		</form>
	);
}
