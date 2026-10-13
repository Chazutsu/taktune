import { useId, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface QuickAddTemplate {
	description: string;
	id: string;
	name: string;
	resolvedDue: string;
}

export interface QuickAddModel {
	templates: QuickAddTemplate[];
	onPreview: (description: string, due: string) => string[];
	onSubmit: (value: { description: string; due: string; templateId: string }) => Promise<boolean>;
}

export function QuickAdd({ model }: { model: QuickAddModel }): ReactElement {
	const t = useI18n();
	const [description, setDescription] = useState("");
	const [due, setDue] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const templateSelectId = useId();
	const preview = useMemo(() => model.onPreview(description, due), [description, due, model]);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (!description.trim() || submitting) return;
		setSubmitting(true);
		try {
			if (await model.onSubmit({ description, due, templateId })) {
				setDescription("");
				setDue("");
				setTemplateId("");
			}
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={(event) => void submit(event)}
			className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2 border-y border-ttd-border bg-transparent px-1 py-2.5 focus-within:border-ttd-accent max-[620px]:grid-cols-1"
		>
			<label className="flex min-w-0 items-center gap-2">
				<span className="text-[var(--interactive-accent)]">
					<Icon name="plus" />
				</span>
				<span className="sr-only">{t("quickAdd.description")}</span>
				<input
					autoComplete="off"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
					placeholder={t("quickAdd.placeholder")}
					className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none outline-none focus:shadow-none max-[620px]:h-11"
				/>
			</label>
			<button
				type="submit"
				disabled={!description.trim() || submitting}
				className="h-8 rounded-md border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] px-3 text-xs font-semibold text-[var(--text-on-accent)] shadow-none disabled:opacity-40 max-[620px]:h-11 max-[620px]:w-full"
			>
				{submitting ? t("quickAdd.adding") : t("quickAdd.add")}
			</button>
			<div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 pl-6 max-[620px]:col-span-1 max-[620px]:pl-0">
				<label className="sr-only" htmlFor={templateSelectId}>
					{t("quickAdd.taskTemplate")}
				</label>
				<select
					id={templateSelectId}
					value={templateId}
					onChange={(event) => {
						const nextId = event.target.value;
						setTemplateId(nextId);
						const template = model.templates.find((item) => item.id === nextId);
						if (template) {
							setDescription(template.description);
							setDue(template.resolvedDue);
						}
					}}
					className="h-8 min-w-32 max-w-48 text-[11px] max-[620px]:h-11"
				>
					<option value="">{t("quickAdd.template")}</option>
					{model.templates.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
				<label className="flex h-8 items-center gap-1 text-[11px] text-[var(--text-muted)] max-[620px]:h-11">
					<Icon name="calendar-days" />
					<span className="sr-only">{t("quickAdd.due")}</span>
					<input
						type="date"
						value={due}
						onChange={(event) => setDue(event.target.value)}
						className="h-8 w-[132px] text-[11px] max-[620px]:h-11"
					/>
				</label>
				<div aria-live="polite" className="flex min-w-0 flex-1 flex-wrap gap-1">
					{preview.map((value, index) => (
						<span
							key={`${value}-${index}`}
							className={`rounded-sm px-1.5 py-0.5 text-[11px] ${index === 0 ? "bg-[var(--background-modifier-active-hover)] font-semibold text-[var(--text-normal)]" : "bg-[var(--background-secondary)] text-[var(--text-muted)]"}`}
						>
							{value}
						</span>
					))}
				</div>
			</div>
		</form>
	);
}
