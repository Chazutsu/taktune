import { useMemo, useRef, useState, type ReactElement, type SyntheticEvent } from "react";
import { useI18n } from "./i18n";

export interface QuickAddDialogTemplate {
	id: string;
	name: string;
	description: string;
	resolvedDue: string;
}

export interface QuickAddDialogModel<TParsed = unknown> {
	templates: QuickAddDialogTemplate[];
	parse: (description: string) => TParsed;
	preview: (description: string, due: string) => string[];
	onCancel: () => void;
	onSubmit: (parsed: TParsed, due: string, templateId: string) => void | Promise<void>;
}

export function QuickAddDialog<TParsed>({
	model,
}: {
	model: QuickAddDialogModel<TParsed>;
}): ReactElement {
	const t = useI18n();
	const inputRef = useRef<HTMLInputElement>(null);
	const [description, setDescription] = useState("");
	const [due, setDue] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [templateQuery, setTemplateQuery] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const templates = useMemo(() => {
		const locale = t("taskEdit.dateLocale");
		const query = templateQuery.trim().toLocaleLowerCase(locale);
		if (!query) return model.templates;
		return model.templates.filter((template) =>
			`${template.name} ${template.description}`.toLocaleLowerCase(locale).includes(query),
		);
	}, [model.templates, t, templateQuery]);
	const preview = model.preview(description, due);

	const selectTemplate = (id: string): void => {
		setTemplateId(id);
		const template = model.templates.find((item) => item.id === id);
		if (!template) return;
		setDescription(template.description);
		setDue(template.resolvedDue);
		window.requestAnimationFrame(() => inputRef.current?.focus());
	};

	const submit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		if (!description.trim() || pending) return;
		setPending(true);
		setError("");
		try {
			await model.onSubmit(model.parse(description), due, templateId);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("quickAdd.error"));
			setPending(false);
			window.requestAnimationFrame(() => inputRef.current?.focus());
		}
	};

	return (
		<form onSubmit={(event) => void submit(event)} className="grid gap-3" aria-busy={pending}>
			<header>
				<h2 className="m-0 text-lg font-semibold">{t("quickAdd.title")}</h2>
				<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
					{t("quickAdd.descriptionText")}
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
					placeholder={t("quickAdd.dialogPlaceholder")}
					className="h-11 w-full px-3 text-sm"
				/>
			</label>
			<div className="grid grid-cols-[minmax(130px,1fr)_minmax(130px,1fr)_auto] gap-2 max-[520px]:grid-cols-1">
				<label className="grid gap-1">
					<span className="text-[11px] text-[var(--text-muted)]">
						{t("quickAdd.templateSearch")}
					</span>
					<input
						type="search"
						value={templateQuery}
						onChange={(event) => setTemplateQuery(event.target.value)}
						placeholder={t("quickAdd.templateSearchPlaceholder")}
						className="min-h-9 min-w-0 max-[520px]:min-h-11"
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-[11px] text-[var(--text-muted)]">{t("quickAdd.template")}</span>
					<select
						aria-label={t("quickAdd.template")}
						value={templateId}
						onChange={(event) => selectTemplate(event.target.value)}
						className="min-h-9 min-w-0 max-[520px]:min-h-11"
					>
						<option value="">{t("quickAdd.noTemplate")}</option>
						{templates.map((template) => (
							<option key={template.id} value={template.id}>
								{template.name}
							</option>
						))}
					</select>
				</label>
				<label className="grid gap-1">
					<span className="text-[11px] text-[var(--text-muted)]">{t("quickAdd.due")}</span>
					<input
						aria-label={t("quickAdd.due")}
						type="date"
						value={due}
						onChange={(event) => setDue(event.target.value)}
						className="min-h-9 max-[520px]:min-h-11"
					/>
				</label>
			</div>
			{preview.length ? (
				<div aria-live="polite" className="flex min-h-5 flex-wrap gap-1">
					{preview.map((value, index) => (
						<span
							key={`${index}:${value}`}
							className={`rounded-full bg-[var(--background-secondary)] px-1.5 py-0.5 text-[11px] ${index === 0 ? "font-semibold text-[var(--text-normal)]" : "text-[var(--text-muted)]"}`}
						>
							{value}
						</span>
					))}
				</div>
			) : null}
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
