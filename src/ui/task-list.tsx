import {
	useRef,
	type CSSProperties,
	type DragEvent,
	type ReactElement,
	type RefObject,
} from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { OverflowMenu } from "./overflow-menu";

export interface TaskMetaItem {
	color?: string;
	icon?: string;
	label: string;
	tone?: "danger" | "muted" | "status";
}

export interface TaskAction {
	disabled?: boolean;
	focusAfterAction?: boolean;
	icon: string;
	label: string;
	onAction: () => void | Promise<void>;
}

export interface TaskListItem {
	actions: TaskAction[];
	completeLabel: string;
	depth: number;
	disabled: boolean;
	done: boolean;
	draggable: boolean;
	key: string;
	focusKey?: string;
	meta: TaskMetaItem[];
	nextStatus?: TaskAction;
	note?: HTMLElement;
	onComplete: () => void | Promise<void>;
	onEdit: () => void;
	onMoveRelative?: (targetKey: string, after: boolean) => void | Promise<void>;
	onSelect?: () => void;
	priority: number;
	progress?: number;
	selected: boolean;
	selectionLabel?: string;
	title: HTMLElement;
	wontDo: boolean;
}

export interface TaskListGroup {
	items: TaskListItem[];
	label?: string;
}

export interface TaskListModel {
	empty: { icon: string; title: string; description: string };
	groups: TaskListGroup[];
}

function ActionButton({
	action,
	emphasized = false,
}: {
	action: TaskAction;
	emphasized?: boolean;
}): ReactElement {
	return (
		<button
			type="button"
			aria-label={action.label}
			onClick={() => void action.onAction()}
			className={`grid shrink-0 place-items-center rounded-ttd-control border-0 p-0 shadow-none max-[620px]:size-11 ${emphasized ? "size-9 bg-ttd-selected text-ttd-accent" : "size-8 bg-transparent text-ttd-muted hover:bg-ttd-hover hover:text-ttd-text"}`}
		>
			<Icon name={action.icon} />
		</button>
	);
}

function TaskRow({
	item,
	listRef,
}: {
	item: TaskListItem;
	listRef: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const priorityClass =
		item.priority === 3
			? "before:bg-ttd-priority-high"
			: item.priority === 2
				? "before:bg-ttd-priority-medium"
				: item.priority === 0
					? "before:bg-ttd-faint"
					: "before:bg-transparent";
	const startDrag = (event: DragEvent<HTMLElement>) => {
		if (!item.draggable) return;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("application/x-ttd-list-task-key", item.key);
	};
	const drop = (event: DragEvent<HTMLElement>) => {
		const sourceKey = event.dataTransfer.getData("application/x-ttd-list-task-key");
		if (!sourceKey || sourceKey === item.key || !item.onMoveRelative) return;
		event.preventDefault();
		const rect = event.currentTarget.getBoundingClientRect();
		void item.onMoveRelative(sourceKey, event.clientY >= rect.top + rect.height / 2);
	};
	const openDetails = (target: EventTarget | null): void => {
		if (target instanceof Element && target.closest("a")) return;
		item.onEdit();
	};
	return (
		<article
			data-task-focus-key={item.focusKey}
			draggable={item.draggable}
			onDragStart={startDrag}
			onDragOver={(event) => {
				if (event.dataTransfer.types.includes("application/x-ttd-list-task-key"))
					event.preventDefault();
			}}
			onDrop={drop}
			style={{ "--ttd-indent": `${Math.min(item.depth, 4) * 18}px` } as CSSProperties}
			className={`group relative grid min-h-12 ${item.onSelect ? "grid-cols-[36px_minmax(0,1fr)_auto] max-[620px]:grid-cols-[44px_minmax(0,1fr)_auto]" : "grid-cols-[36px_minmax(0,1fr)_auto] max-[620px]:grid-cols-[44px_minmax(0,1fr)_auto]"} gap-2.5 border-b border-ttd-border py-1.5 pl-[calc(7px+var(--ttd-indent))] pr-1.5 before:absolute before:inset-y-1.5 before:left-[var(--ttd-indent)] before:w-0.5 before:rounded-full max-[620px]:gap-1.5 ${priorityClass} ${item.selected ? "bg-ttd-selected" : "bg-transparent"} ${item.done || item.wontDo ? "opacity-60" : ""} ${item.draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
		>
			{item.onSelect ? (
				<button
					type="button"
					aria-label={item.selectionLabel}
					onClick={item.onSelect}
					className="grid size-9 place-items-center rounded-ttd-control border border-ttd-accent bg-transparent p-0 text-ttd-accent shadow-none max-[620px]:size-11"
				>
					<Icon name={item.selected ? "check" : "circle"} />
				</button>
			) : null}
			{item.onSelect ? null : (
				<button
					type="button"
					aria-label={item.completeLabel}
					disabled={item.disabled}
					onClick={() => void item.onComplete()}
					className={`grid size-9 place-items-center rounded-full border-[1.5px] bg-transparent p-0 shadow-none max-[620px]:size-11 ${item.done ? "border-ttd-accent bg-ttd-accent text-ttd-on-accent" : "border-ttd-faint text-transparent hover:border-ttd-accent"}`}
				>
					<Icon name="check" />
				</button>
			)}
			<div className="min-w-0">
				<div
					role="button"
					tabIndex={0}
					data-task-edit-trigger={item.key}
					onClick={(event) => openDetails(event.target)}
					onKeyDown={(event) => {
						if (event.key !== "Enter" && event.key !== " ") return;
						event.preventDefault();
						item.onEdit();
					}}
					className="min-w-0 cursor-pointer rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttd-accent"
				>
					<HtmlMount
						element={item.title}
						className={`min-w-0 text-[13px] leading-5 [&_p]:m-0 ${item.done || item.wontDo ? "line-through" : ""}`}
					/>
				</div>
				{item.note ? (
					<HtmlMount
						element={item.note}
						className="mt-0.5 line-clamp-2 text-[11px] text-ttd-muted [&_p]:m-0"
					/>
				) : null}
				{item.progress !== undefined ? (
					<div
						role="progressbar"
						aria-label={t("taskList.progress", { progress: item.progress })}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={item.progress}
						className="mt-1 flex max-w-44 items-center gap-1.5 text-[11px] text-ttd-faint"
					>
						<span className="h-1 flex-1 overflow-hidden rounded-full bg-ttd-border">
							<span
								className="block h-full rounded-full bg-ttd-accent"
								style={{ width: `${item.progress}%` }}
							/>
						</span>
						<span>{item.progress}%</span>
					</div>
				) : null}
				<div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
					{item.meta.map((meta, index) => (
						<span
							key={`${meta.label}-${index}`}
							style={meta.color ? { color: meta.color } : undefined}
							className={`inline-flex items-center gap-0.5 text-[11px] ${meta.tone === "danger" ? "font-semibold text-ttd-danger" : meta.tone === "muted" ? "text-ttd-faint" : "text-ttd-muted"}`}
						>
							{meta.icon ? <Icon name={meta.icon} /> : null}
							{meta.label}
						</span>
					))}
				</div>
			</div>
			<div className="flex items-start gap-0.5">
				{item.nextStatus ? <ActionButton action={item.nextStatus} emphasized /> : null}
				{item.actions.length ? (
					<OverflowMenu
						label={t("taskList.moreActions")}
						triggerClassName="grid size-8 place-items-center rounded-ttd-control border-0 bg-transparent p-0 text-ttd-muted shadow-none hover:bg-ttd-hover max-[620px]:size-11"
						items={item.actions.map((action) => ({
							label: action.label,
							icon: action.icon,
							disabled: action.disabled,
							onSelect: async () => {
								await action.onAction();
								if (action.focusAfterAction && item.focusKey) {
									const row = [
										...(listRef.current?.querySelectorAll<HTMLElement>("[data-task-focus-key]") ??
											[]),
									].find((candidate) => candidate.dataset.taskFocusKey === item.focusKey);
									row?.querySelector<HTMLElement>("[data-overflow-trigger]")?.focus();
								}
							},
						}))}
					/>
				) : null}
			</div>
		</article>
	);
}

export function TaskList({ model }: { model: TaskListModel }): ReactElement {
	const listRef = useRef<HTMLDivElement>(null);
	if (!model.groups.length)
		return (
			<div className="flex min-h-24 items-start gap-3 border-b border-ttd-border px-2 py-5 text-left">
				<div className="flex min-w-0 items-start gap-3">
					<span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-ttd-surface text-ttd-muted">
						<Icon name={model.empty.icon} />
					</span>
					<div className="min-w-0">
						<h2 className="m-0 text-sm">{model.empty.title}</h2>
						<p className="mb-0 mt-1 text-xs leading-relaxed text-ttd-muted">
							{model.empty.description}
						</p>
					</div>
				</div>
			</div>
		);
	return (
		<div ref={listRef}>
			{model.groups.map((group, groupIndex) => (
				<section key={`${group.label || "tasks"}-${groupIndex}`}>
					{group.label ? (
						<h2 className="mb-1 mt-3 text-[11px] font-semibold text-ttd-muted">{group.label}</h2>
					) : null}
					<div className="border-t border-ttd-border">
						{group.items.map((item) => (
							<TaskRow key={item.key} item={item} listRef={listRef} />
						))}
					</div>
				</section>
			))}
		</div>
	);
}
