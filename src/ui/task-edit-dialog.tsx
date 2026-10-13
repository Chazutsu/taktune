import {
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
	type FormEvent,
	type ReactElement,
} from "react";
import { useI18n } from "./i18n";

export interface EditableSubtask {
	line: number;
	description: string;
	reminders: string[];
}
export interface TaskEditValue {
	description: string;
	due: string;
	startAt: string;
	endAt: string;
	status: string;
	priority: number;
	important: boolean;
	urgent: boolean;
	list: string;
	section: string;
	tags: string[];
	repeat: string;
	reminders: string[];
	progress: number;
	progressAuto: boolean;
	estimatedPomos: number;
	estimatedMinutes: number;
	note: string;
	newComment: string;
	attachments: File[];
	existingSubtasks: EditableSubtask[];
	newSubtasks: string[];
}
interface StatusOption {
	id: string;
	name: string;
}
interface TemporalRecord {
	text: string;
	timestamp: string;
}
interface ExistingAttachment {
	token: string;
	path: string;
}
export interface TaskEditDialogModel {
	initial: TaskEditValue;
	lists: string[];
	statuses: StatusOption[];
	comments: TemporalRecord[];
	activities: TemporalRecord[];
	validateRepeat: (value: string) => boolean;
	attachmentsOf: (note: string) => ExistingAttachment[];
	removeAttachment: (note: string, token: string) => string;
	onOpenAttachment: (path: string) => void | Promise<void>;
	onCancel: () => void;
	onSave: (value: TaskEditValue) => void | Promise<void>;
	onSaveTemplate: (value: TaskEditValue) => void | Promise<void>;
}

const REPEATS = [
	"every day",
	"every weekday",
	"every week",
	"every monday,wednesday,friday",
	"every month",
	"every month on day 15",
	"every month on last day",
	"every month on first monday",
	"every month on last friday",
	"every year",
];

export function TaskEditDialog({
	model,
	compact = false,
}: {
	model: TaskEditDialogModel;
	compact?: boolean;
}): ReactElement {
	const t = useI18n();
	const [value, setValue] = useState(model.initial);
	const [subtasks, setSubtasks] = useState(model.initial.existingSubtasks);
	const [newSubtasks, setNewSubtasks] = useState(model.initial.newSubtasks.join("\n"));
	const [files, setFiles] = useState<File[]>([]);
	const [pending, setPending] = useState<"save" | "template" | null>(null);
	const [error, setError] = useState("");
	const noteRef = useRef<HTMLTextAreaElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const update = <K extends keyof TaskEditValue>(key: K, next: TaskEditValue[K]): void =>
		setValue((current) => ({ ...current, [key]: next }));
	const existingAttachments = useMemo(() => model.attachmentsOf(value.note), [model, value.note]);
	const addFiles = (incoming: FileList | File[]): void =>
		setFiles((current) => {
			const next = [...current];
			for (const file of Array.from(incoming))
				if (
					!next.some(
						(item) =>
							item.name === file.name &&
							item.size === file.size &&
							item.lastModified === file.lastModified,
					)
				)
					next.push(file);
			return next;
		});
	const openFilePicker = (): void => fileRef.current?.click();
	const formatNote = (prefix: string, suffix = prefix, placeholder = t("taskEdit.text")): void => {
		const editor = noteRef.current;
		if (!editor) return;
		const start = editor.selectionStart;
		const end = editor.selectionEnd;
		const selected = value.note.slice(start, end) || placeholder;
		update(
			"note",
			`${value.note.slice(0, start)}${prefix}${selected}${suffix}${value.note.slice(end)}`,
		);
		requestAnimationFrame(() => {
			editor.focus();
			editor.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
		});
	};
	const checklist = (): void => {
		const editor = noteRef.current;
		if (!editor) return;
		const start = editor.selectionStart;
		const end = editor.selectionEnd;
		const selected = value.note.slice(start, end) || t("taskEdit.item");
		const formatted = selected
			.split("\n")
			.map((line) => `- [ ] ${line.replace(/^\s*-\s*\[[ xX]\]\s*/u, "")}`)
			.join("\n");
		update("note", `${value.note.slice(0, start)}${formatted}${value.note.slice(end)}`);
	};
	const payload = (): TaskEditValue => ({
		...value,
		description: value.description.trim(),
		list: value.list.trim(),
		section: value.section.trim(),
		tags: value.tags.map((item) => item.trim().replace(/^#/u, "")).filter(Boolean),
		repeat: value.repeat.trim().toLowerCase(),
		reminders: [...new Set(value.reminders.filter(Boolean))].toSorted(),
		estimatedPomos: Math.max(0, Number(value.estimatedPomos) || 0),
		estimatedMinutes: Math.max(0, Number(value.estimatedMinutes) || 0),
		note: value.note.trim(),
		newComment: value.newComment.trim(),
		attachments: files,
		existingSubtasks: subtasks
			.map((item) => ({
				...item,
				description: item.description.trim(),
				reminders: [...new Set(item.reminders)].toSorted(),
			}))
			.filter((item) => item.description),
		newSubtasks: newSubtasks
			.split("\n")
			.map((item) => item.trim())
			.filter(Boolean),
	});
	const run = async (action: "save" | "template"): Promise<void> => {
		if (pending) return;
		const next = payload();
		if (!next.description) {
			setError(t("taskEdit.error.description"));
			return;
		}
		if (next.repeat && !model.validateRepeat(next.repeat)) {
			setError(t("taskEdit.error.repeat"));
			return;
		}
		if (action === "save" && Boolean(next.startAt) !== Boolean(next.endAt)) {
			setError(t("taskEdit.error.timePair"));
			return;
		}
		if (action === "save" && next.startAt && next.endAt <= next.startAt) {
			setError(t("taskEdit.error.timeOrder"));
			return;
		}
		const invalidReminder = next.existingSubtasks
			.flatMap((item) => item.reminders)
			.find((item) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(item));
		if (invalidReminder) {
			setError(t("taskEdit.error.subtaskReminder", { value: invalidReminder.replace("T", " ") }));
			return;
		}
		setPending(action);
		setError("");
		try {
			if (action === "save") await model.onSave(next);
			else await model.onSaveTemplate(next);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t("taskEdit.error.save"));
			setPending(null);
		}
	};
	const field = `grid items-center [&>span]:text-xs [&>span]:text-[var(--text-muted)] [&_input]:min-h-9 [&_select]:min-h-9 max-[600px]:[&_input]:min-h-11 max-[600px]:[&_select]:min-h-11 ${compact ? "grid-cols-1 gap-1" : "grid-cols-[92px_minmax(0,1fr)] gap-3 max-[600px]:grid-cols-1 max-[600px]:gap-1"}`;
	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void run("save");
			}}
			className="grid min-w-0 gap-3"
			aria-busy={Boolean(pending)}
		>
			<h2 className="m-0 text-lg font-semibold">{t("taskEdit.title")}</h2>
			<textarea
				autoFocus
				aria-label={t("taskEdit.description")}
				rows={3}
				value={value.description}
				onChange={(event) => update("description", event.target.value)}
				placeholder={t("taskEdit.description")}
				className="w-full resize-y"
			/>
			<div
				className={`grid gap-x-4 gap-y-2 ${compact ? "grid-cols-1" : "grid-cols-2 max-[760px]:grid-cols-1"}`}
			>
				<label className={field}>
					<span>{t("taskEdit.due")}</span>
					<input
						aria-label={t("taskEdit.due")}
						type="date"
						value={value.due}
						onChange={(event) => update("due", event.target.value)}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.status")}</span>
					<select
						aria-label={t("taskEdit.status")}
						value={value.status}
						onChange={(event) => update("status", event.target.value)}
					>
						{model.statuses.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</label>
				<label className={field}>
					<span>{t("taskEdit.start")}</span>
					<input
						aria-label={t("taskEdit.start")}
						type="datetime-local"
						value={value.startAt}
						onChange={(event) => update("startAt", event.target.value)}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.end")}</span>
					<input
						aria-label={t("taskEdit.end")}
						type="datetime-local"
						value={value.endAt}
						onChange={(event) => update("endAt", event.target.value)}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.priority")}</span>
					<select
						aria-label={t("taskEdit.priority")}
						value={value.priority}
						onChange={(event) => update("priority", Number(event.target.value))}
					>
						<option value="3">{t("taskEdit.priority.high")}</option>
						<option value="2">{t("taskEdit.priority.medium")}</option>
						<option value="1">{t("taskEdit.priority.normal")}</option>
						<option value="0">{t("taskEdit.priority.low")}</option>
					</select>
				</label>
				<label className={field}>
					<span>{value.progressAuto ? t("taskEdit.progressAuto") : t("taskEdit.progress")}</span>
					<span className="grid grid-cols-[minmax(0,1fr)_46px] items-center gap-2">
						<input
							aria-label={t("taskEdit.progress")}
							type="range"
							min="0"
							max="100"
							step="5"
							disabled={value.progressAuto}
							value={value.progress}
							onChange={(event) => update("progress", Number(event.target.value))}
						/>
						<output className="text-right text-xs tabular-nums text-[var(--text-muted)]">
							{value.progress}%
						</output>
					</span>
				</label>
				<label className={field}>
					<span>{t("taskEdit.list")}</span>
					<input
						aria-label={t("taskEdit.list")}
						list="ttd-react-task-lists"
						value={value.list}
						onChange={(event) => update("list", event.target.value)}
						placeholder={t("taskEdit.listPlaceholder")}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.section")}</span>
					<input
						aria-label={t("taskEdit.section")}
						value={value.section}
						onChange={(event) => update("section", event.target.value)}
						placeholder={t("taskEdit.sectionPlaceholder")}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.tags")}</span>
					<input
						aria-label={t("taskEdit.tags")}
						value={value.tags.join(", ")}
						onChange={(event) => update("tags", event.target.value.split(/[,、]/u))}
						placeholder={t("taskEdit.tagsPlaceholder")}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.repeat")}</span>
					<input
						aria-label={t("taskEdit.repeat")}
						list="ttd-react-repeat-values"
						value={value.repeat}
						onChange={(event) => update("repeat", event.target.value)}
						placeholder={t("taskEdit.repeatPlaceholder")}
					/>
				</label>
				<label className={field}>
					<span>{t("taskEdit.estimate")}</span>
					<span className="grid grid-cols-2 gap-2">
						<input
							aria-label={t("taskEdit.pomodoroEstimate")}
							type="number"
							min="0"
							max="999"
							value={value.estimatedPomos || ""}
							onChange={(event) => update("estimatedPomos", Number(event.target.value))}
							placeholder="Pomodoro"
						/>
						<input
							aria-label={t("taskEdit.minuteEstimate")}
							type="number"
							min="0"
							max="9999"
							step="5"
							value={value.estimatedMinutes || ""}
							onChange={(event) => update("estimatedMinutes", Number(event.target.value))}
							placeholder={t("taskEdit.minutes")}
						/>
					</span>
				</label>
				<div className={`${field} max-[600px]:gap-2`}>
					<span>{t("taskEdit.classification")}</span>
					<span className="flex min-h-9 items-center gap-4">
						<label className="flex items-center gap-2 text-xs">
							<input
								aria-label={t("taskEdit.important")}
								type="checkbox"
								checked={value.important}
								onChange={(event) => update("important", event.target.checked)}
							/>
							{t("taskEdit.important")}
						</label>
						<label className="flex items-center gap-2 text-xs">
							<input
								aria-label={t("taskEdit.urgent")}
								type="checkbox"
								checked={value.urgent}
								onChange={(event) => update("urgent", event.target.checked)}
							/>
							{t("taskEdit.urgent")}
						</label>
					</span>
				</div>
			</div>
			<datalist id="ttd-react-task-lists">
				{model.lists.map((item) => (
					<option key={item} value={item} />
				))}
			</datalist>
			<datalist id="ttd-react-repeat-values">
				{REPEATS.map((item) => (
					<option key={item} value={item} />
				))}
			</datalist>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">{t("taskEdit.reminders")}</legend>
				{value.reminders.map((reminder, index) => (
					<div key={`${index}-${reminder}`} className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
						<input
							aria-label={t("taskEdit.reminderDateTime", { number: index + 1 })}
							type="datetime-local"
							value={reminder}
							onChange={(event) =>
								update(
									"reminders",
									value.reminders.map((item, itemIndex) =>
										itemIndex === index ? event.target.value : item,
									),
								)
							}
							className="min-h-11"
						/>
						<button
							type="button"
							aria-label={t("taskEdit.removeReminder", { number: index + 1 })}
							onClick={() =>
								update(
									"reminders",
									value.reminders.filter((_, itemIndex) => itemIndex !== index),
								)
							}
							className="min-h-11"
						>
							×
						</button>
					</div>
				))}
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => update("reminders", [...value.reminders, ""])}
						className="min-h-11"
					>
						{t("taskEdit.addReminder")}
					</button>
					{value.endAt ? (
						<button
							type="button"
							disabled={value.reminders.includes(value.endAt)}
							onClick={() => update("reminders", [...value.reminders, value.endAt])}
							className="min-h-11 disabled:opacity-50"
						>
							{value.reminders.includes(value.endAt)
								? t("taskEdit.endReminderAdded")
								: t("taskEdit.addEndReminder")}
						</button>
					) : null}
				</div>
			</fieldset>
			<details
				open={subtasks.length > 0}
				className="rounded-lg border border-[var(--background-modifier-border)] p-2.5"
			>
				<summary className="cursor-pointer text-xs font-semibold">
					{t("taskEdit.subtasks")}{" "}
					{subtasks.length ? t("taskEdit.count", { count: subtasks.length }) : ""}
				</summary>
				<div className="mt-2 grid gap-2">
					{subtasks.map((subtask, index) => (
						<div
							key={subtask.line}
							draggable
							onDragStart={() => setDragIndex(index)}
							onDragOver={(event: DragEvent) => event.preventDefault()}
							onDrop={() => {
								const source = dragIndex;
								if (source === null || source === index) return;
								setSubtasks((current) => {
									const next = [...current];
									const moved = next.splice(source, 1)[0];
									if (moved) next.splice(index, 0, moved);
									return next;
								});
								setDragIndex(null);
							}}
							className="grid grid-cols-[minmax(120px,1fr)_minmax(150px,.8fr)_44px_44px] items-center gap-2 rounded-md border border-[var(--background-modifier-border)] p-1.5 max-[700px]:grid-cols-[minmax(0,1fr)_44px_44px]"
						>
							<input
								aria-label={t("taskEdit.subtask", { number: index + 1 })}
								value={subtask.description}
								onChange={(event) =>
									setSubtasks((current) =>
										current.map((item, itemIndex) =>
											itemIndex === index ? { ...item, description: event.target.value } : item,
										),
									)
								}
								className="min-h-11 min-w-0"
							/>
							<input
								aria-label={t("taskEdit.subtaskReminder", { number: index + 1 })}
								value={subtask.reminders.map((item) => item.replace("T", " ")).join(", ")}
								onChange={(event) =>
									setSubtasks((current) =>
										current.map((item, itemIndex) =>
											itemIndex === index
												? {
														...item,
														reminders: event.target.value
															.split(/[,、]/u)
															.map((text) => text.trim().replace(" ", "T"))
															.filter(Boolean),
													}
												: item,
										),
									)
								}
								placeholder={t("taskEdit.reminderPlaceholder")}
								className="min-h-11 min-w-0 max-[700px]:col-[1/-1] max-[700px]:row-start-2"
							/>
							<button
								type="button"
								aria-label={t("taskEdit.moveUp")}
								disabled={index === 0}
								onClick={() =>
									setSubtasks((current) => {
										const next = [...current];
										const moved = next.splice(index, 1)[0];
										if (moved) next.splice(index - 1, 0, moved);
										return next;
									})
								}
								className="min-h-11"
							>
								↑
							</button>
							<button
								type="button"
								aria-label={t("taskEdit.moveDown")}
								disabled={index === subtasks.length - 1}
								onClick={() =>
									setSubtasks((current) => {
										const next = [...current];
										const moved = next.splice(index, 1)[0];
										if (moved) next.splice(index + 1, 0, moved);
										return next;
									})
								}
								className="min-h-11"
							>
								↓
							</button>
						</div>
					))}
					<textarea
						aria-label={t("taskEdit.addSubtasks")}
						rows={3}
						value={newSubtasks}
						onChange={(event) => setNewSubtasks(event.target.value)}
						placeholder={t("taskEdit.subtasksPlaceholder")}
					/>
				</div>
			</details>
			<fieldset className="m-0 grid gap-2 rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<legend className="px-1 text-xs text-[var(--text-muted)]">
					{t("taskEdit.notesAttachments")}
				</legend>
				<div className="flex flex-wrap gap-1">
					{[
						[t("taskEdit.bold"), () => formatNote("**")],
						[t("taskEdit.italic"), () => formatNote("_")],
						[t("taskEdit.code"), () => formatNote("`")],
						[t("taskEdit.link"), () => formatNote("[", "](https://)", t("taskEdit.linkName"))],
						[t("taskEdit.checklist"), checklist],
					].map(([label, action]) => (
						<button
							key={String(label)}
							type="button"
							onClick={action as () => void}
							className="min-h-9 text-xs max-[520px]:min-h-11"
						>
							{String(label)}
						</button>
					))}
				</div>
				<textarea
					ref={noteRef}
					aria-label={t("taskEdit.note")}
					rows={5}
					value={value.note}
					onChange={(event) => update("note", event.target.value)}
					placeholder={t("taskEdit.notePlaceholder")}
				/>
				{existingAttachments.length ? (
					<div className="grid gap-1">
						<span className="text-[11px] text-[var(--text-faint)]">{t("taskEdit.attached")}</span>
						{existingAttachments.map((attachment) => (
							<div key={attachment.token} className="grid grid-cols-[minmax(0,1fr)_44px] gap-1">
								<button
									type="button"
									title={attachment.path}
									onClick={() => void model.onOpenAttachment(attachment.path)}
									className="min-h-11 truncate text-left"
								>
									{attachment.path.split("/").at(-1)}
								</button>
								<button
									type="button"
									aria-label={t("taskEdit.unlinkAttachment", { path: attachment.path })}
									onClick={() =>
										update("note", model.removeAttachment(value.note, attachment.token))
									}
									className="min-h-11"
								>
									×
								</button>
							</div>
						))}
					</div>
				) : null}
				<input
					ref={fileRef}
					aria-label={t("taskEdit.selectAttachments")}
					type="file"
					multiple
					onChange={(event: ChangeEvent<HTMLInputElement>) => addFiles(event.target.files || [])}
					className="sr-only"
				/>
				<button
					type="button"
					onClick={openFilePicker}
					onDragOver={(event) => event.preventDefault()}
					onDrop={(event: DragEvent<HTMLButtonElement>) => {
						event.preventDefault();
						addFiles(event.dataTransfer.files);
					}}
					className="min-h-14 border border-dashed border-[var(--background-modifier-border)] text-xs text-[var(--text-muted)]"
				>
					{t("taskEdit.dropFiles")}
				</button>
				{files.length ? (
					<div className="flex flex-wrap gap-1.5">
						{files.map((file, index) => (
							<span
								key={`${file.name}-${file.lastModified}`}
								className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--background-secondary)] py-1 pr-1 pl-2 text-[11px]"
							>
								<span className="truncate">{file.name}</span>
								<button
									type="button"
									aria-label={t("taskEdit.cancelFile", { name: file.name })}
									onClick={() =>
										setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
									}
									className="grid size-7 place-items-center p-0"
								>
									×
								</button>
							</span>
						))}
					</div>
				) : null}
			</fieldset>
			<details className="rounded-lg border border-[var(--background-modifier-border)] p-2.5">
				<summary className="cursor-pointer text-xs font-semibold">
					{t("taskEdit.comments")}{" "}
					{model.comments.length ? t("taskEdit.count", { count: model.comments.length }) : ""}
				</summary>
				<div className="mt-2 grid gap-2">
					{model.comments.map((comment) => (
						<article
							key={comment.timestamp}
							className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg bg-[var(--background-secondary)] px-2.5 py-2 max-[520px]:grid-cols-1"
						>
							<p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.text}</p>
							<time className="text-[11px] text-[var(--text-faint)]" dateTime={comment.timestamp}>
								{new Date(comment.timestamp).toLocaleString(t("taskEdit.dateLocale"))}
							</time>
						</article>
					))}
					<textarea
						aria-label={t("taskEdit.newComment")}
						rows={3}
						value={value.newComment}
						onChange={(event) => update("newComment", event.target.value)}
						placeholder={t("taskEdit.commentPlaceholder")}
					/>
				</div>
			</details>
			{model.activities.length ? (
				<details className="rounded-lg border border-[var(--background-modifier-border)] p-2.5">
					<summary className="cursor-pointer text-xs font-semibold">
						{t("taskEdit.history")} {t("taskEdit.count", { count: model.activities.length })}
					</summary>
					<div className="mt-2 grid max-h-44 gap-1.5 overflow-auto border-l-2 border-[var(--background-modifier-border)] pl-2">
						{[...model.activities]
							.toReversed()
							.slice(0, 20)
							.map((activity) => (
								<div
									key={activity.timestamp}
									className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs max-[520px]:grid-cols-1"
								>
									<span>{activity.text}</span>
									<time
										className="text-[11px] text-[var(--text-faint)]"
										dateTime={activity.timestamp}
									>
										{new Date(activity.timestamp).toLocaleString(t("taskEdit.dateLocale"))}
									</time>
								</div>
							))}
					</div>
				</details>
			) : null}
			{error ? (
				<p
					role="alert"
					className="m-0 rounded-md bg-[var(--background-modifier-error)] px-2.5 py-2 text-xs text-[var(--text-error)]"
				>
					{error}
				</p>
			) : null}
			<footer
				data-mobile-safe-area="sticky-action"
				className={`sticky bottom-0 z-10 items-center gap-2 border-t border-[var(--background-modifier-border)] bg-[var(--background-primary)] py-2 ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] pb-[calc(8px+env(safe-area-inset-bottom,0px))] [&>button]:min-h-11" : "flex flex-wrap max-[520px]:grid max-[520px]:grid-cols-1 max-[520px]:pb-[calc(8px+env(safe-area-inset-bottom,0px))] max-[520px]:[&>button]:min-h-11"}`}
			>
				<button
					type="button"
					className={compact ? "min-w-0 truncate" : "mr-auto max-[520px]:mr-0"}
					disabled={Boolean(pending)}
					onClick={() => void run("template")}
				>
					{pending === "template" ? t("taskEdit.saving") : t("taskEdit.saveTemplate")}
				</button>
				{compact ? null : (
					<button type="button" disabled={Boolean(pending)} onClick={model.onCancel}>
						{t("taskEdit.cancel")}
					</button>
				)}
				<button
					type="submit"
					className="mod-cta"
					disabled={Boolean(pending) || !value.description.trim()}
				>
					{pending === "save" ? t("taskEdit.saving") : t("taskEdit.save")}
				</button>
			</footer>
		</form>
	);
}
