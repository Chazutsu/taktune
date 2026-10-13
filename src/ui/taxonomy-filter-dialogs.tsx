import { useState, type FormEvent, type ReactElement } from "react";
import { useI18n } from "./i18n";

export interface TaxonomyEditDialogModel {
	label: string;
	name: string;
	color: string;
	showColor: boolean;
	onCancel: () => void;
	onDelete: () => boolean | void | Promise<boolean | void>;
	onSave: (name: string, color: string) => void | Promise<void>;
}

export function TaxonomyEditDialog({ model }: { model: TaxonomyEditDialogModel }): ReactElement {
	const t = useI18n();
	const [name, setName] = useState(model.name);
	const [color, setColor] = useState(model.color);
	const [pending, setPending] = useState<"save" | "delete" | null>(null);
	const [error, setError] = useState("");
	const run = async (action: "save" | "delete"): Promise<void> => {
		if (pending || (action === "save" && !name.trim())) return;
		setPending(action);
		setError("");
		try {
			if (action === "save") await model.onSave(name, color);
			else {
				const accepted = await model.onDelete();
				if (accepted === false) setPending(null);
			}
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: t("taxonomy.error.update", { label: model.label }),
			);
			setPending(null);
		}
	};
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void run("save");
			}}
			className="grid gap-3"
			aria-busy={Boolean(pending)}
		>
			<h2 className="m-0 text-lg font-semibold">{t("taxonomy.edit", { label: model.label })}</h2>
			<label className="grid gap-1">
				<span className="text-xs text-[var(--text-muted)]">{t("taxonomy.name")}</span>
				<input
					autoFocus
					aria-label={t("taxonomy.name")}
					type="text"
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="h-11 w-full px-3 text-sm"
				/>
			</label>
			{model.showColor ? (
				<label className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
					<span>{t("taxonomy.color")}</span>
					<input
						aria-label={t("taxonomy.color")}
						type="color"
						value={color}
						onChange={(event) => setColor(event.target.value)}
						className="h-11 w-16 p-1"
					/>
				</label>
			) : null}
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer className="mt-1 flex flex-wrap items-center gap-2 max-[520px]:[&>button]:min-h-11">
				<button
					type="button"
					className="mr-auto text-[var(--text-error)]"
					disabled={Boolean(pending)}
					onClick={() => void run("delete")}
				>
					{pending === "delete" ? t("taxonomy.deleting") : t("taxonomy.delete")}
				</button>
				<button type="button" disabled={Boolean(pending)} onClick={model.onCancel}>
					{t("taxonomy.cancel")}
				</button>
				<button type="submit" className="mod-cta" disabled={Boolean(pending) || !name.trim()}>
					{pending === "save" ? t("taxonomy.saving") : t("taxonomy.save")}
				</button>
			</footer>
		</form>
	);
}

export interface SavedFilterValue {
	name: string;
	keyword: string;
	list: string;
	tag: string;
	priority: number | null;
	due: string;
}

export interface SavedFilterDialogModel {
	title: string;
	initial: SavedFilterValue;
	lists: string[];
	tags: string[];
	canDelete: boolean;
	onCancel: () => void;
	onDelete: () => void | Promise<void>;
	onSave: (value: SavedFilterValue) => void | Promise<void>;
}

const PRIORITIES = ["", "3", "2", "1", "0"] as const;
const DUE_OPTIONS = ["", "today", "tomorrow", "next", "overdue", "none"] as const;

export function SavedFilterDialog({ model }: { model: SavedFilterDialogModel }): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState(model.initial);
	const [pending, setPending] = useState<"save" | "delete" | null>(null);
	const [error, setError] = useState("");
	const update = <K extends keyof SavedFilterValue>(key: K, next: SavedFilterValue[K]): void =>
		setValue((current) => ({ ...current, [key]: next }));
	const run = async (action: "save" | "delete"): Promise<void> => {
		if (pending || (action === "save" && !value.name.trim())) return;
		setPending(action);
		setError("");
		try {
			if (action === "delete") await model.onDelete();
			else await model.onSave({ ...value, name: value.name.trim(), keyword: value.keyword.trim() });
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("filter.error.save"));
			setPending(null);
		}
	};
	const fieldClass =
		"grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 max-[520px]:grid-cols-1 max-[520px]:gap-1 [&>span]:text-xs [&>span]:text-[var(--text-muted)] [&>input]:min-h-9 [&>select]:min-h-9 max-[520px]:[&>input]:min-h-11 max-[520px]:[&>select]:min-h-11";
	const priorityLabels = [
		t("filter.all"),
		t("filter.priority.high"),
		t("filter.priority.medium"),
		t("filter.priority.normal"),
		t("filter.priority.low"),
	];
	const dueLabels = [
		t("filter.all"),
		t("filter.due.today"),
		t("filter.due.tomorrow"),
		t("filter.due.next"),
		t("filter.due.overdue"),
		t("filter.due.none"),
	];
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void run("save");
			}}
			className="grid gap-3"
			aria-busy={Boolean(pending)}
		>
			<h2 className="m-0 text-lg font-semibold">{model.title}</h2>
			<label className={fieldClass}>
				<span>{t("taxonomy.name")}</span>
				<input
					autoFocus
					aria-label={t("taxonomy.name")}
					value={value.name}
					onChange={(event) => update("name", event.target.value)}
					placeholder={t("filter.namePlaceholder")}
				/>
			</label>
			<label className={fieldClass}>
				<span>{t("filter.keyword")}</span>
				<input
					aria-label={t("filter.keyword")}
					value={value.keyword}
					onChange={(event) => update("keyword", event.target.value)}
					placeholder={t("filter.keywordPlaceholder")}
				/>
			</label>
			<label className={fieldClass}>
				<span>{t("filter.list")}</span>
				<select
					aria-label={t("filter.list")}
					value={value.list}
					onChange={(event) => update("list", event.target.value)}
				>
					<option value="">{t("filter.all")}</option>
					{model.lists.map((name) => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</select>
			</label>
			<label className={fieldClass}>
				<span>{t("filter.tag")}</span>
				<select
					aria-label={t("filter.tag")}
					value={value.tag}
					onChange={(event) => update("tag", event.target.value)}
				>
					<option value="">{t("filter.all")}</option>
					{model.tags.map((name) => (
						<option key={name} value={name}>
							#{name}
						</option>
					))}
				</select>
			</label>
			<label className={fieldClass}>
				<span>{t("filter.priority")}</span>
				<select
					aria-label={t("filter.priority")}
					value={value.priority === null ? "" : String(value.priority)}
					onChange={(event) =>
						update("priority", event.target.value === "" ? null : Number(event.target.value))
					}
				>
					{PRIORITIES.map((id, index) => (
						<option key={id || "all"} value={id}>
							{priorityLabels[index]}
						</option>
					))}
				</select>
			</label>
			<label className={fieldClass}>
				<span>{t("filter.due")}</span>
				<select
					aria-label={t("filter.due")}
					value={value.due}
					onChange={(event) => update("due", event.target.value)}
				>
					{DUE_OPTIONS.map((id, index) => (
						<option key={id || "all"} value={id}>
							{dueLabels[index]}
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
				<button type="submit" className="mod-cta" disabled={Boolean(pending) || !value.name.trim()}>
					{pending === "save" ? t("taxonomy.saving") : t("taxonomy.save")}
				</button>
			</footer>
		</form>
	);
}
