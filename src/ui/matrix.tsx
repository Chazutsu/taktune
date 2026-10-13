import { useId, useRef, useState, type DragEvent, type ReactElement, type RefObject } from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

const TASK_MIME = "application/x-ttd-task";

function acceptsTaskDrag(event: DragEvent<HTMLElement>): boolean {
	return Array.from(event.dataTransfer.types).includes(TASK_MIME);
}

function restoreMatrixTaskFocus(root: HTMLElement | null, taskKey: string): void {
	window.requestAnimationFrame(() => {
		if (!root?.isConnected) return;
		const control = Array.from(
			root.querySelectorAll<HTMLSelectElement>("[data-matrix-move-control]"),
		).find((element) => element.dataset.matrixMoveControl === taskKey);
		control?.focus();
	});
}

export interface MatrixTaskModel {
	key: string;
	plainTitle: string;
	title: HTMLElement;
	list: string;
	dueLabel: string | null;
	priorityLabel: string | null;
	dragPayload: string;
	quadrantId: string;
	onEdit: () => void;
	onMove: (quadrantId: string) => void | Promise<void>;
}

export interface MatrixQuadrantModel {
	id: string;
	label: string;
	action: string;
	tone: "do" | "plan" | "delegate" | "drop";
	tasks: MatrixTaskModel[];
	onDrop: (payload: string) => void | Promise<void>;
}

export interface MatrixModel {
	quadrants: MatrixQuadrantModel[];
}

function MatrixTask({
	task,
	quadrants,
	matrixRoot,
}: {
	task: MatrixTaskModel;
	quadrants: MatrixQuadrantModel[];
	matrixRoot: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const move = async (quadrantId: string) => {
		try {
			await task.onMove(quadrantId);
		} finally {
			restoreMatrixTaskFocus(matrixRoot.current, task.key);
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
					className="mt-0.5 shrink-0 cursor-grab touch-none text-[var(--text-faint)] active:cursor-grabbing"
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
					className="grid size-8 shrink-0 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] opacity-0 shadow-none hover:bg-[var(--background-modifier-hover)] group-hover:opacity-100 group-focus-within:opacity-100 max-[720px]:size-11 max-[720px]:opacity-100"
				>
					<Icon name="ellipsis" />
				</button>
			</div>
			<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-5 text-[11px] text-[var(--text-muted)]">
				<span className="truncate">{task.list || t("nav.inbox")}</span>
				{task.dueLabel ? <span>{task.dueLabel}</span> : null}
				{task.priorityLabel ? <span>{task.priorityLabel}</span> : null}
			</div>
			<label className="flex items-center gap-1.5 pl-5 text-[11px] text-[var(--text-muted)]">
				<span className="shrink-0">{t("matrix.quadrant")}</span>
				<select
					data-matrix-move-control={task.key}
					aria-label={t("matrix.quadrantFor", { name: task.plainTitle })}
					value={task.quadrantId}
					onChange={(event) => void move(event.target.value)}
					className="h-8 min-w-0 flex-1 text-[11px] max-[720px]:h-11"
				>
					{quadrants.map((quadrant) => (
						<option key={quadrant.id} value={quadrant.id}>
							{quadrant.label}
						</option>
					))}
				</select>
			</label>
		</article>
	);
}

const toneClasses: Record<MatrixQuadrantModel["tone"], string> = {
	do: "border-t-[3px] border-t-[var(--color-red)]",
	plan: "border-t-[3px] border-t-[var(--color-blue)]",
	delegate: "border-t-[3px] border-t-[var(--color-orange)]",
	drop: "border-t-[3px] border-t-[var(--text-faint)]",
};

function Quadrant({
	quadrant,
	quadrants,
	matrixRoot,
}: {
	quadrant: MatrixQuadrantModel;
	quadrants: MatrixQuadrantModel[];
	matrixRoot: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const [dropTarget, setDropTarget] = useState(false);
	const [mobileExpanded, setMobileExpanded] = useState(quadrant.tasks.length > 0);
	const contentId = useId();
	const summary = (
		<>
			<div className="min-w-0 text-left">
				<h2 className="m-0 text-[13px] font-semibold">{quadrant.label}</h2>
				<p className="mb-0 mt-0.5 text-[11px] text-[var(--text-muted)]">{quadrant.action}</p>
			</div>
			<span
				aria-label={t("common.itemCount", { count: quadrant.tasks.length })}
				className="grid min-w-6 place-items-center rounded-full bg-[var(--background-modifier-hover)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
			>
				{quadrant.tasks.length}
			</span>
		</>
	);
	return (
		<section
			aria-label={quadrant.label}
			onDragOver={(event) => {
				if (!acceptsTaskDrag(event)) return;
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
				if (payload) void quadrant.onDrop(payload);
			}}
			className={`grid content-start overflow-hidden rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary-alt)] min-[721px]:min-h-40 ${toneClasses[quadrant.tone]} ${dropTarget ? "outline outline-2 outline-offset-[-2px] outline-[var(--interactive-accent)]" : ""}`}
		>
			<header className="border-b border-[var(--background-modifier-border)]">
				<button
					type="button"
					aria-expanded={mobileExpanded}
					aria-controls={contentId}
					onClick={() => setMobileExpanded((expanded) => !expanded)}
					className="flex min-h-12 w-full items-center justify-between gap-3 rounded-none border-0 bg-transparent px-3 py-1.5 text-[var(--text-normal)] shadow-none min-[721px]:hidden"
				>
					{summary}
				</button>
				<div className="hidden items-start justify-between gap-3 px-3 py-2.5 min-[721px]:flex">
					{summary}
				</div>
			</header>
			<div
				id={contentId}
				className={`gap-1.5 p-2 min-[721px]:grid ${mobileExpanded ? "grid" : "hidden"}`}
			>
				{quadrant.tasks.length ? (
					quadrant.tasks.map((task) => (
						<MatrixTask key={task.key} task={task} quadrants={quadrants} matrixRoot={matrixRoot} />
					))
				) : (
					<div className="grid min-h-20 place-items-center rounded-md border border-dashed border-[var(--background-modifier-border)] px-3 text-center text-[11px] text-[var(--text-faint)]">
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

export function Matrix({ model }: { model: MatrixModel }): ReactElement {
	const root = useRef<HTMLDivElement>(null);
	return (
		<div ref={root} className="grid gap-2.5 pb-4 min-[721px]:grid-cols-2">
			{model.quadrants.map((quadrant) => (
				<Quadrant
					key={`${quadrant.id}:${quadrant.tasks.length ? "populated" : "empty"}`}
					quadrant={quadrant}
					quadrants={model.quadrants}
					matrixRoot={root}
				/>
			))}
		</div>
	);
}
