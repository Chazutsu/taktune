import {
	useRef,
	useState,
	type CSSProperties,
	type DragEvent,
	type ReactElement,
	type RefObject,
} from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

const TASK_MIME = "application/x-ttd-task";

function restoreBoardTaskFocus(root: HTMLElement | null, taskKey: string): void {
	window.requestAnimationFrame(() => {
		const control = Array.from(
			root?.querySelectorAll<HTMLSelectElement>("[data-board-move-control]") ?? [],
		).find((element) => element.dataset.boardMoveControl === taskKey);
		control?.focus();
	});
}

export interface BoardTaskModel {
	key: string;
	plainTitle: string;
	title: HTMLElement;
	dragPayload: string;
	columnId: string;
	status: { label: string; color: string } | null;
	dueLabel: string | null;
	section: string | null;
	tags: Array<{ label: string; color: string }>;
	onEdit: () => void;
	onMove: (columnId: string) => void | Promise<void>;
}
export interface BoardColumnModel {
	id: string;
	label: string;
	tasks: BoardTaskModel[];
	manageable: boolean;
	onManage: () => void;
	onDrop: (payload: string) => void | Promise<void>;
}
export interface BoardModel {
	scope: string;
	scopes: Array<{ value: string; label: string }>;
	columns: BoardColumnModel[];
	canAddSection: boolean;
	onScopeChange: (scope: string) => void;
	onAddSection: () => void;
}

function BoardCard({
	task,
	columns,
	boardRef,
}: {
	task: BoardTaskModel;
	columns: BoardColumnModel[];
	boardRef: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const move = async (columnId: string) => {
		try {
			await task.onMove(columnId);
		} finally {
			restoreBoardTaskFocus(boardRef.current, task.key);
		}
	};
	return (
		<article
			draggable
			onDragStart={(event) => {
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData(TASK_MIME, task.dragPayload);
				event.currentTarget.classList.add("opacity-40");
			}}
			onDragEnd={(event) => event.currentTarget.classList.remove("opacity-40")}
			onDoubleClick={task.onEdit}
			className="group grid gap-1.5 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
		>
			<div className="flex min-w-0 items-start gap-1.5">
				<span
					aria-hidden="true"
					className="mt-0.5 shrink-0 cursor-grab touch-none text-[var(--text-faint)]"
				>
					<Icon name="grip-vertical" />
				</span>
				<div className="min-w-0 flex-1">
					<HtmlMount
						element={task.title}
						className="min-w-0 break-words text-[12px] font-medium leading-[1.45] [&_p]:m-0"
					/>
				</div>
				<button
					type="button"
					aria-label={t("common.editNamed", { name: task.plainTitle })}
					onClick={task.onEdit}
					className="grid size-8 shrink-0 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] opacity-0 shadow-none hover:bg-[var(--background-modifier-hover)] group-hover:opacity-100 group-focus-within:opacity-100 max-[720px]:opacity-100 max-[620px]:size-11"
				>
					<Icon name="ellipsis" />
				</button>
			</div>
			<div className="flex flex-wrap items-center gap-1.5 pl-5 text-[11px] text-[var(--text-muted)]">
				{task.status ? (
					<span
						style={{ "--status-color": task.status.color } as CSSProperties}
						className="rounded-full bg-[color-mix(in_srgb,var(--status-color)_14%,transparent)] px-1.5 py-0.5 text-[var(--status-color)]"
					>
						{task.status.label}
					</span>
				) : null}
				{task.dueLabel ? <span>{task.dueLabel}</span> : null}
				{task.section ? <span>{task.section}</span> : null}
				{task.tags.map((tag) => (
					<span key={tag.label} style={{ color: tag.color }}>
						#{tag.label}
					</span>
				))}
			</div>
			<label className="flex items-center gap-1.5 pl-5 text-[11px] text-[var(--text-muted)]">
				<span className="shrink-0">{t("board.column")}</span>
				<select
					data-board-move-control={task.key}
					aria-label={t("board.moveTo", { name: task.plainTitle })}
					value={task.columnId}
					onChange={(event) => void move(event.target.value)}
					className="h-8 min-w-0 flex-1 text-[11px] max-[620px]:h-11"
				>
					{columns.map((column) => (
						<option key={column.id} value={column.id}>
							{column.label}
						</option>
					))}
				</select>
			</label>
		</article>
	);
}

function acceptsTaskDrop(event: DragEvent<HTMLElement>): boolean {
	return Array.from(event.dataTransfer.types).includes(TASK_MIME);
}

function BoardColumn({
	column,
	columns,
	boardRef,
}: {
	column: BoardColumnModel;
	columns: BoardColumnModel[];
	boardRef: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const [dropTarget, setDropTarget] = useState(false);
	return (
		<section
			aria-label={column.label}
			onDragOver={(event) => {
				if (!acceptsTaskDrop(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				setDropTarget(true);
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDropTarget(false);
				const payload = event.dataTransfer.getData(TASK_MIME);
				if (payload) void column.onDrop(payload);
			}}
			className={`grid max-h-[calc(100vh-130px)] min-h-44 min-w-[240px] grid-rows-[auto_minmax(100px,1fr)] overflow-hidden rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary-alt)] max-[720px]:max-h-none max-[720px]:min-w-0 ${dropTarget ? "outline outline-2 outline-offset-[-2px] outline-[var(--interactive-accent)]" : ""}`}
		>
			<header className="flex items-center gap-2 border-b border-[var(--background-modifier-border)] px-2.5 py-2">
				<h2 className="m-0 min-w-0 flex-1 truncate text-[12px] font-semibold">{column.label}</h2>
				<span
					aria-label={t("common.itemCount", { count: column.tasks.length })}
					className="rounded-full bg-[var(--background-modifier-hover)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
				>
					{column.tasks.length}
				</span>
				{column.manageable ? (
					<button
						type="button"
						aria-label={t("common.editNamed", { name: column.label })}
						onClick={column.onManage}
						className="grid size-8 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
					>
						<Icon name="ellipsis" />
					</button>
				) : null}
			</header>
			<div
				className={`grid content-start gap-1.5 overflow-y-auto p-2 ${dropTarget ? "bg-[color-mix(in_srgb,var(--interactive-accent)_8%,transparent)]" : ""}`}
			>
				{column.tasks.length ? (
					column.tasks.map((task) => (
						<BoardCard key={task.key} task={task} columns={columns} boardRef={boardRef} />
					))
				) : (
					<div className="grid min-h-24 place-items-center rounded-md border border-dashed border-[var(--background-modifier-border)] text-[11px] text-[var(--text-faint)]">
						<span>
							<span className="hidden min-[721px]:inline">{t("board.dropHere")}</span>
							<span className="min-[721px]:hidden">{t("board.noTasks")}</span>
						</span>
					</div>
				)}
			</div>
		</section>
	);
}

export function Board({ model }: { model: BoardModel }): ReactElement {
	const t = useI18n();
	const boardRef = useRef<HTMLDivElement>(null);
	return (
		<div ref={boardRef} className="grid gap-2.5 pb-4">
			<div className="flex flex-wrap items-center gap-2">
				<label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
					<span>{t("board.columnBasis")}</span>
					<select
						aria-label={t("board.columnBasis")}
						value={model.scope}
						onChange={(event) => model.onScopeChange(event.target.value)}
						className="h-8 min-w-40 text-[11px] max-[620px]:h-11"
					>
						{model.scopes.map((scope) => (
							<option key={scope.value || "all"} value={scope.value}>
								{scope.label}
							</option>
						))}
					</select>
				</label>
				{model.canAddSection ? (
					<button
						type="button"
						onClick={model.onAddSection}
						className="ml-auto min-h-8 px-2.5 text-[11px] max-[620px]:min-h-11"
					>
						{t("board.addSection")}
					</button>
				) : null}
			</div>
			<div className="grid grid-flow-col auto-cols-[minmax(240px,290px)] gap-2 overflow-x-auto pb-1 max-[720px]:grid-flow-row max-[720px]:auto-cols-auto">
				{model.columns.map((column) => (
					<BoardColumn
						key={column.id}
						column={column}
						columns={model.columns}
						boardRef={boardRef}
					/>
				))}
			</div>
		</div>
	);
}
