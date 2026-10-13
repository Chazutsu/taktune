import { useState, type ReactElement, type SyntheticEvent } from "react";
import { useI18n } from "./i18n";

export interface NameDialogModel {
	title: string;
	placeholder: string;
	onCancel: () => void;
	onSubmit: (value: string) => void | Promise<void>;
}

export function NameDialog({ model }: { model: NameDialogModel }): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const submit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		if (!value.trim() || pending) return;
		setPending(true);
		setError("");
		try {
			await model.onSubmit(value);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("dialog.createFailed"));
			setPending(false);
		}
	};
	return (
		<form onSubmit={(event) => void submit(event)} className="grid gap-3" aria-busy={pending}>
			<h2 className="m-0 text-lg font-semibold">{model.title}</h2>
			<label className="grid gap-1">
				<span className="sr-only">{model.placeholder}</span>
				<input
					autoFocus
					type="text"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder={model.placeholder}
					aria-label={model.placeholder}
					className="h-11 w-full px-3 text-sm"
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
			<footer className="mt-1 flex flex-wrap justify-end gap-2 max-[520px]:[&>button]:min-h-11 max-[520px]:[&>button]:flex-1">
				<button type="button" onClick={model.onCancel} disabled={pending}>
					{t("common.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={!value.trim() || pending}>
					{t(pending ? "common.creating" : "common.create")}
				</button>
			</footer>
		</form>
	);
}

export interface MergeTaskOption {
	key: string;
	label: string;
}

export interface MergeTasksDialogModel {
	items: MergeTaskOption[];
	onCancel: () => void;
	onSubmit: (key: string) => void | Promise<void>;
}

export function MergeTasksDialog({ model }: { model: MergeTasksDialogModel }): ReactElement {
	const t = useI18n();
	const [targetKey, setTargetKey] = useState(model.items[0]?.key ?? "");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const submit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		if (!targetKey || pending) return;
		setPending(true);
		setError("");
		try {
			await model.onSubmit(targetKey);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("dialog.merge.failed"));
			setPending(false);
		}
	};
	return (
		<form onSubmit={(event) => void submit(event)} className="grid gap-3" aria-busy={pending}>
			<header>
				<h2 className="m-0 text-lg font-semibold">{t("dialog.merge.title")}</h2>
				<p className="mb-0 mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
					{t("dialog.merge.description")}
				</p>
			</header>
			<label className="grid gap-1">
				<span className="text-xs text-[var(--text-muted)]">{t("dialog.merge.parent")}</span>
				<select
					autoFocus
					aria-label={t("dialog.merge.destination")}
					value={targetKey}
					onChange={(event) => setTargetKey(event.target.value)}
					className="min-h-11 w-full min-w-0"
				>
					{model.items.map((item) => (
						<option key={item.key} value={item.key}>
							{item.label}
						</option>
					))}
				</select>
			</label>
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
					{t("common.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={!targetKey || pending}>
					{pending
						? t("dialog.merge.pending")
						: t("dialog.merge.submit", { count: model.items.length })}
				</button>
			</footer>
		</form>
	);
}
