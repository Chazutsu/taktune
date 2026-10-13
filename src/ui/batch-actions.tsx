import { useState, type ReactElement } from "react";
import { useI18n } from "./i18n";

export type BatchAction =
	| "list"
	| "priority"
	| "tag-add"
	| "tag-remove"
	| "due"
	| "complete"
	| "wontdo"
	| "delete";

export interface BatchActionsModel {
	canMerge: boolean;
	lists: string[];
	selectedCount: number;
	wontDoLabel: string;
	wontDoValue: string;
	onApply: (action: BatchAction, value?: string) => Promise<void>;
	onMerge: () => void;
}

export function BatchActions({ model }: { model: BatchActionsModel }): ReactElement {
	const t = useI18n();
	const [list, setList] = useState("");
	const [priority, setPriority] = useState("3");
	const [tag, setTag] = useState("");
	const [due, setDue] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const disabled = pending || model.selectedCount === 0;
	const apply = async (action: BatchAction, value = ""): Promise<void> => {
		if (disabled) return;
		setPending(true);
		setError("");
		try {
			await model.onApply(action, value);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t("batch.error"));
		} finally {
			setPending(false);
		}
	};
	const remove = (): void => {
		setConfirmingDelete(false);
		void apply("delete");
	};
	const control = "h-[30px] min-w-0 text-[11px] max-[620px]:h-11";
	const button = "min-h-[30px] px-[9px] text-[11px] max-[620px]:min-h-11";
	return (
		<div className="sticky -top-px z-[5] -mt-1 mb-2.5 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-1.5 shadow-[0_4px_14px_rgb(0_0_0/0.08)]">
			<div className="flex min-h-11 flex-wrap items-center gap-[7px]">
				<span aria-live="polite" className="min-w-[74px] text-xs text-[var(--text-muted)]">
					{pending ? t("batch.processing") : t("batch.selected", { count: model.selectedCount })}
				</span>
				<select
					aria-label={t("batch.destinationList")}
					value={list}
					onChange={(event) => setList(event.currentTarget.value)}
					disabled={pending}
					className={`${control} max-w-[150px]`}
				>
					<option value="">{t("nav.inbox")}</option>
					{model.lists.map((value) => (
						<option value={value} key={value}>
							{value}
						</option>
					))}
				</select>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void apply("list", list)}
					className={button}
				>
					{t("batch.move")}
				</button>
				<select
					aria-label={t("batch.priority")}
					value={priority}
					onChange={(event) => setPriority(event.currentTarget.value)}
					disabled={pending}
					className={`${control} max-w-[150px]`}
				>
					<option value="3">{t("batch.priorityHigh")}</option>
					<option value="2">{t("batch.priorityMedium")}</option>
					<option value="1">{t("batch.priorityNone")}</option>
					<option value="0">{t("batch.priorityLow")}</option>
				</select>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void apply("priority", priority)}
					className={button}
				>
					{t("batch.applyPriority")}
				</button>
				<input
					type="text"
					aria-label={t("batch.tag")}
					placeholder={t("batch.tagPlaceholder")}
					value={tag}
					onChange={(event) => setTag(event.currentTarget.value)}
					disabled={pending}
					className={`${control} w-[110px]`}
				/>
				<button
					type="button"
					disabled={disabled || !tag.trim()}
					onClick={() => void apply("tag-add", tag)}
					className={button}
				>
					{t("batch.addTag")}
				</button>
				<button
					type="button"
					disabled={disabled || !tag.trim()}
					onClick={() => void apply("tag-remove", tag)}
					className={button}
				>
					{t("batch.removeTag")}
				</button>
				<input
					type="date"
					aria-label={t("batch.due")}
					value={due}
					onChange={(event) => setDue(event.currentTarget.value)}
					disabled={pending}
					className={`${control} w-[132px]`}
				/>
				<button
					type="button"
					disabled={disabled || !due}
					onClick={() => void apply("due", due)}
					className={button}
				>
					{t("batch.applyDue")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void apply("due")}
					className={button}
				>
					{t("batch.clearDue")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void apply("complete")}
					className={button}
				>
					{t("batch.complete")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => void apply("wontdo", model.wontDoValue)}
					className={button}
				>
					{model.wontDoLabel}
				</button>
				<button
					type="button"
					disabled={pending || !model.canMerge}
					onClick={model.onMerge}
					className={button}
				>
					{t("batch.merge")}
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => setConfirmingDelete(true)}
					className={`mod-warning ${button}`}
				>
					{t("batch.delete")}
				</button>
			</div>
			{confirmingDelete ? (
				<div
					role="alertdialog"
					aria-label={t("batch.confirmDelete", { count: model.selectedCount })}
					className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-[var(--background-modifier-error)] px-2 py-1.5 max-[620px]:grid"
				>
					<p className="m-0 text-[11px] text-[var(--text-normal)]">
						{t("batch.confirmDelete", { count: model.selectedCount })}
					</p>
					<div className="flex shrink-0 gap-1.5">
						<button type="button" onClick={() => setConfirmingDelete(false)} className={button}>
							{t("common.cancel")}
						</button>
						<button type="button" onClick={remove} className={`mod-warning ${button}`}>
							{t("batch.delete")}
						</button>
					</div>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="mb-0 mt-1 text-[11px] text-[var(--text-error)]">
					{error}
				</p>
			) : null}
		</div>
	);
}
