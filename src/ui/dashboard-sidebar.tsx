import {
	type DragEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { OverflowMenu } from "./overflow-menu";

export interface NavigationItem {
	id: string;
	icon: string;
	label: string;
	count: number;
	countLabel?: string;
	color?: string;
}

export interface TaxonomyItem extends NavigationItem {
	color: string;
	fullLabel: string;
	group: string;
	value: string;
}

export interface SidebarModel {
	activeId: string;
	open: boolean;
	incompleteCount: number;
	primary: NavigationItem[];
	statuses: NavigationItem[];
	planning: NavigationItem[];
	tools: NavigationItem[];
	organize?: NavigationItem[];
	history?: NavigationItem[];
	savedFilters: Array<NavigationItem & { value: unknown }>;
	lists: TaxonomyItem[];
	tags: TaxonomyItem[];
	expandedSections?: Record<string, boolean>;
	onClose: () => void;
	onSelect: (id: string) => void;
	onAddSavedFilter: () => void;
	onEditSavedFilter: (value: unknown) => void;
	onAddTaxonomy: (kind: "list" | "tag") => void;
	onEditTaxonomy: (kind: "list" | "tag", value: string) => void;
	onReorderTaxonomy: (kind: "list" | "tag", from: string, to: string) => Promise<void> | void;
	onToggleSection?: (id: string, open: boolean) => Promise<void> | void;
}

function useMobileSidebar(): boolean {
	const [mobile, setMobile] = useState(
		() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 720px)").matches,
	);
	useEffect(() => {
		if (!window.matchMedia) return;
		const query = window.matchMedia("(max-width: 720px)");
		const update = () => setMobile(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);
	return mobile;
}

function NavButton({
	item,
	activeId,
	onSelect,
}: {
	item: NavigationItem;
	activeId: string;
	onSelect: (id: string) => void;
}): ReactElement {
	const t = useI18n();
	const active = item.id === activeId;
	const countLabel = item.countLabel || t("common.items", { count: item.count });
	return (
		<button
			type="button"
			aria-label={`${item.label}、${countLabel}`}
			aria-current={active ? "page" : undefined}
			className={`grid min-h-8 w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-0 px-2 py-1 text-left text-xs shadow-none transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--interactive-accent)] max-[720px]:min-h-11 max-[720px]:px-3 ${active ? "bg-[var(--background-modifier-active-hover)] font-semibold text-[var(--interactive-accent)]" : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)]"}`}
			onClick={() => onSelect(item.id)}
		>
			<span style={item.color ? { color: item.color } : undefined}>
				<Icon name={item.icon} />
			</span>
			<span className="truncate">{item.label}</span>
			<span className="min-w-5 text-right text-[11px] tabular-nums text-[var(--text-faint)]">
				{item.countLabel || item.count}
			</span>
		</button>
	);
}

function Section({
	id,
	label,
	active,
	expanded,
	onToggle,
	children,
}: {
	id: string;
	label: string;
	active: boolean;
	expanded: boolean;
	onToggle: (id: string, open: boolean) => Promise<void> | void;
	children: ReactNode;
}): ReactElement {
	const t = useI18n();
	const [open, setOpen] = useState(expanded || active);
	const [inputs, setInputs] = useState({ active, expanded });
	if (inputs.active !== active || inputs.expanded !== expanded) {
		setInputs({ active, expanded });
		if (active && !inputs.active) setOpen(true);
		else if (!active) setOpen(expanded);
	}
	return (
		<details
			className="group mt-0.5"
			open={open}
			onToggle={(event) => {
				const next = event.currentTarget.open;
				if (next === open) return;
				setOpen(next);
				void onToggle(id, next);
			}}
		>
			<summary
				aria-label={t(open ? "sidebar.collapse" : "sidebar.expand", { label })}
				className="grid min-h-7 cursor-pointer list-none grid-cols-[16px_1fr] items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-[var(--text-faint)] hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-muted)] max-[720px]:min-h-11 max-[720px]:px-3 [&::-webkit-details-marker]:hidden"
			>
				<span className="transition-transform duration-100 group-open:rotate-90 motion-reduce:transition-none">
					<Icon name="chevron-right" />
				</span>
				<span>{label}</span>
			</summary>
			<div className="grid gap-0.5 pl-1">{children}</div>
		</details>
	);
}

function SectionHeading({ label, onAdd }: { label: string; onAdd: () => void }): ReactElement {
	const t = useI18n();
	return (
		<div className="grid grid-cols-[1fr_28px] items-center px-2 text-[11px] font-semibold text-[var(--text-faint)] max-[720px]:grid-cols-[1fr_40px]">
			<span role="heading" aria-level={3}>
				{label}
			</span>
			<button
				type="button"
				aria-label={t("sidebar.create", { label })}
				onClick={onAdd}
				className="grid size-7 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] shadow-none hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] max-[720px]:size-11"
			>
				<Icon name="plus" />
			</button>
		</div>
	);
}

function TaxonomyActions({
	kind,
	item,
	index,
	items,
	model,
	sidebarRef,
}: {
	kind: "list" | "tag";
	item: TaxonomyItem;
	index: number;
	items: TaxonomyItem[];
	model: SidebarModel;
	sidebarRef: RefObject<HTMLElement | null>;
}): ReactElement {
	const t = useI18n();
	const focusMenu = () => {
		const row = [
			...(sidebarRef.current?.querySelectorAll<HTMLElement>("[data-taxonomy-key]") ?? []),
		].find((candidate) => candidate.dataset.taxonomyKey === `${kind}:${item.value}`);
		row?.querySelector<HTMLElement>("[data-overflow-trigger]")?.focus();
	};
	const move = async (direction: -1 | 1) => {
		const adjacent = items[index + direction];
		if (!adjacent) return;
		if (direction < 0) await model.onReorderTaxonomy(kind, item.value, adjacent.value);
		else await model.onReorderTaxonomy(kind, adjacent.value, item.value);
		focusMenu();
	};
	return (
		<div className="absolute right-1 top-0.5 max-[720px]:top-0">
			<OverflowMenu
				label={t("taxonomy.actions", { label: item.fullLabel })}
				triggerClassName="grid size-7 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] opacity-0 shadow-none group-hover/row:opacity-100 focus:opacity-100 max-[720px]:size-11 max-[720px]:opacity-100"
				items={[
					{
						label: t("taxonomy.moveUp", { label: item.fullLabel }),
						icon: "arrow-up",
						disabled: index === 0,
						onSelect: () => move(-1),
					},
					{
						label: t("sidebar.edit", { label: item.fullLabel }),
						icon: "pencil",
						onSelect: () => model.onEditTaxonomy(kind, item.value),
					},
					{
						label: t("taxonomy.moveDown", { label: item.fullLabel }),
						icon: "arrow-down",
						disabled: index === items.length - 1,
						onSelect: () => move(1),
					},
				]}
			/>
		</div>
	);
}

function ManageButton({ label, onClick }: { label: string; onClick: () => void }): ReactElement {
	const t = useI18n();
	return (
		<button
			type="button"
			aria-label={t("sidebar.edit", { label })}
			onClick={onClick}
			className="absolute right-1 top-0.5 grid size-7 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] opacity-0 shadow-none group-hover/row:opacity-100 focus:opacity-100 max-[720px]:top-0 max-[720px]:size-11 max-[720px]:opacity-100"
		>
			<Icon name="ellipsis" />
		</button>
	);
}

function TaxonomyRows({
	label,
	kind,
	items,
	model,
	sidebarRef,
}: {
	label: string;
	kind: "list" | "tag";
	items: TaxonomyItem[];
	model: SidebarModel;
	sidebarRef: RefObject<HTMLElement | null>;
}): ReactElement {
	return (
		<div>
			<SectionHeading label={label} onAdd={() => model.onAddTaxonomy(kind)} />
			{items.map((item, index) => {
				const showGroup = Boolean(item.group && item.group !== items[index - 1]?.group);
				const onDrop = (event: DragEvent<HTMLDivElement>) => {
					event.preventDefault();
					const from = event.dataTransfer.getData("application/x-ttd-taxonomy");
					if (from && from !== item.value) model.onReorderTaxonomy(kind, from, item.value);
				};
				return (
					<div key={item.id}>
						{showGroup ? (
							<div className="flex min-h-7 items-center gap-1.5 px-2 text-[11px] font-semibold text-[var(--text-faint)]">
								<Icon name="folder" />
								<span className="truncate">{item.group}</span>
							</div>
						) : null}
						<div
							data-taxonomy-key={`${kind}:${item.value}`}
							className={`group/row relative ${item.group ? "ml-3" : ""}`}
							draggable
							onDragStart={(event) => {
								event.dataTransfer.effectAllowed = "move";
								event.dataTransfer.setData("application/x-ttd-taxonomy", item.value);
							}}
							onDragOver={(event) => event.preventDefault()}
							onDrop={onDrop}
						>
							<NavButton item={item} activeId={model.activeId} onSelect={model.onSelect} />
							<TaxonomyActions
								kind={kind}
								item={item}
								index={index}
								items={items}
								model={model}
								sidebarRef={sidebarRef}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function DashboardSidebar({ model }: { model: SidebarModel }): ReactElement {
	const t = useI18n();
	const { onClose } = model;
	const toggleSection = model.onToggleSection || (() => undefined);
	const organize = model.organize || model.tools;
	const history = model.history || [];
	const legacyToolsExpanded = Boolean(model.expandedSections?.tools);
	const filtersExpanded = Boolean(
		model.expandedSections?.filters ||
		model.expandedSections?.statuses ||
		model.expandedSections?.lists ||
		model.expandedSections?.tags,
	);
	const mobile = useMobileSidebar();
	const sidebarRef = useRef<HTMLElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const modalActiveRef = useRef(false);

	useEffect(() => {
		const modalActive = mobile && model.open;
		const wasActive = modalActiveRef.current;
		modalActiveRef.current = modalActive;
		if (modalActive && !wasActive) {
			const active = document.activeElement;
			returnFocusRef.current =
				active instanceof HTMLElement && active !== document.body ? active : null;
			closeRef.current?.focus();
		} else if (!modalActive && wasActive) {
			returnFocusRef.current?.focus();
			returnFocusRef.current = null;
		}
	}, [mobile, model.open]);

	useEffect(
		() => () => {
			if (modalActiveRef.current) returnFocusRef.current?.focus();
		},
		[],
	);

	useEffect(() => {
		if (!mobile || !model.open) return;
		const sidebar = sidebarRef.current;
		const parent = sidebar?.parentElement;
		if (!sidebar || !parent) return;
		const background = Array.from(parent.children).filter(
			(element): element is HTMLElement =>
				element instanceof HTMLElement && !element.hasAttribute("data-sidebar-layer"),
		);
		const previous = background.map((element) => ({
			element,
			ariaHidden: element.getAttribute("aria-hidden"),
			inert: element.hasAttribute("inert"),
		}));
		for (const element of background) {
			element.setAttribute("aria-hidden", "true");
			element.setAttribute("inert", "");
		}
		return () => {
			for (const { element, ariaHidden, inert } of previous) {
				if (ariaHidden === null) element.removeAttribute("aria-hidden");
				else element.setAttribute("aria-hidden", ariaHidden);
				if (!inert) element.removeAttribute("inert");
			}
		};
	}, [mobile, model.open]);

	useEffect(() => {
		if (!mobile || !model.open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab") return;
			const focusable = Array.from(
				sidebarRef.current?.querySelectorAll<HTMLElement>(
					"button:not([disabled]), summary, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
				) || [],
			).filter((element) => {
				const closedSection = element.closest("details:not([open])");
				return !closedSection || closedSection.firstElementChild === element;
			});
			if (!focusable.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [mobile, model.open, onClose]);
	return (
		<>
			{model.open ? (
				<div
					data-sidebar-layer
					data-sidebar-backdrop
					aria-hidden="true"
					onClick={model.onClose}
					className="hidden max-[720px]:absolute max-[720px]:inset-0 max-[720px]:z-20 max-[720px]:block max-[720px]:bg-black/35"
				/>
			) : null}
			<aside
				ref={sidebarRef}
				role={mobile ? "dialog" : undefined}
				aria-modal={mobile && model.open ? true : undefined}
				aria-label={t("sidebar.navigation")}
				data-sidebar-layer
				data-mobile-safe-area="navigation"
				className={`min-h-0 w-[236px] shrink-0 flex-col overflow-hidden border-r border-ttd-border bg-ttd-surface p-2 text-ttd-text ${model.open ? "flex" : "hidden"} max-[720px]:absolute max-[720px]:inset-y-0 max-[720px]:left-0 max-[720px]:z-30 max-[720px]:w-[min(236px,calc(100%-28px))] max-[720px]:pb-[calc(8px+env(safe-area-inset-bottom,0px))] max-[720px]:pt-[calc(8px+env(safe-area-inset-top,0px))] max-[720px]:shadow-[12px_0_28px_rgb(0_0_0/0.16)]`}
			>
				<div className="flex min-h-9 items-center gap-2 px-1.5">
					<span className="grid size-6 place-items-center rounded-md bg-[var(--interactive-accent)] text-[var(--text-on-accent)]">
						<Icon name="check" />
					</span>
					<span className="min-w-0 flex-1 truncate text-sm font-semibold">{t("app.tasks")}</span>
					<button
						ref={closeRef}
						type="button"
						aria-label={t("sidebar.close")}
						aria-expanded={model.open}
						onClick={model.onClose}
						className="grid size-11 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] shadow-none hover:bg-[var(--background-modifier-hover)] hover:text-[var(--text-normal)] min-[721px]:hidden"
					>
						<Icon name="panel-left-close" />
					</button>
				</div>
				<nav
					aria-label={t("sidebar.views")}
					className="min-h-0 flex-1 space-y-0.5 overflow-y-auto py-1"
				>
					<div
						role="heading"
						aria-level={2}
						className="px-2 pb-0.5 pt-1 text-[11px] font-semibold text-[var(--text-faint)]"
					>
						{t("sidebar.action")}
					</div>
					{model.primary.map((item) => (
						<NavButton
							key={item.id}
							item={item}
							activeId={model.activeId}
							onSelect={model.onSelect}
						/>
					))}
					<Section
						id="planning"
						label={t("sidebar.planning")}
						active={model.planning.some((item) => item.id === model.activeId)}
						expanded={Boolean(model.expandedSections?.planning)}
						onToggle={toggleSection}
					>
						{model.planning.map((item) => (
							<NavButton
								key={item.id}
								item={item}
								activeId={model.activeId}
								onSelect={model.onSelect}
							/>
						))}
					</Section>
					<Section
						id="organize"
						label={t("sidebar.organize")}
						active={organize.some((item) => item.id === model.activeId)}
						expanded={model.expandedSections?.organize ?? legacyToolsExpanded}
						onToggle={toggleSection}
					>
						{organize.map((item) => (
							<NavButton
								key={item.id}
								item={item}
								activeId={model.activeId}
								onSelect={model.onSelect}
							/>
						))}
					</Section>
					<Section
						id="history"
						label={t("sidebar.history")}
						active={history.some((item) => item.id === model.activeId)}
						expanded={model.expandedSections?.history ?? legacyToolsExpanded}
						onToggle={toggleSection}
					>
						{history.map((item) => (
							<NavButton
								key={item.id}
								item={item}
								activeId={model.activeId}
								onSelect={model.onSelect}
							/>
						))}
					</Section>
					<Section
						id="filters"
						label={t("sidebar.filters")}
						active={
							model.activeId.startsWith("status:") ||
							model.activeId.startsWith("smart:") ||
							model.activeId.startsWith("list:") ||
							model.activeId.startsWith("tag:")
						}
						expanded={filtersExpanded}
						onToggle={toggleSection}
					>
						<div
							role="heading"
							aria-level={3}
							className="px-2 py-1 text-[11px] font-semibold text-[var(--text-faint)]"
						>
							{t("sidebar.statuses")}
						</div>
						{model.statuses.map((item) => (
							<NavButton
								key={item.id}
								item={item}
								activeId={model.activeId}
								onSelect={model.onSelect}
							/>
						))}
						<SectionHeading label={t("sidebar.savedFilters")} onAdd={model.onAddSavedFilter} />
						{model.savedFilters.map((item) => (
							<div key={item.id} className="group/row relative">
								<NavButton item={item} activeId={model.activeId} onSelect={model.onSelect} />
								<ManageButton
									label={item.label}
									onClick={() => model.onEditSavedFilter(item.value)}
								/>
							</div>
						))}
						<TaxonomyRows
							label={t("sidebar.lists")}
							kind="list"
							items={model.lists}
							model={model}
							sidebarRef={sidebarRef}
						/>
						<TaxonomyRows
							label={t("sidebar.tags")}
							kind="tag"
							items={model.tags}
							model={model}
							sidebarRef={sidebarRef}
						/>
					</Section>
				</nav>
				<div className="px-2 py-1 text-[11px] tabular-nums text-[var(--text-faint)]">
					{t("sidebar.incomplete", { count: model.incompleteCount })}
				</div>
			</aside>
		</>
	);
}
