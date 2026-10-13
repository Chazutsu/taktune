import { useEffect, useRef, useState, type ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

interface ViewOption {
	label: string;
	value: string;
}

export interface ViewOptionsMenuModel {
	groupMode: string;
	groupOptions: ViewOption[];
	onGroupChange: (value: string) => void | Promise<void>;
	onSortChange: (value: string) => void | Promise<void>;
	sortMode: string;
	sortOptions: ViewOption[];
}

export function ViewOptionsMenu({ model }: { model: ViewOptionsMenuModel }): ReactElement {
	const t = useI18n();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const firstSelectRef = useRef<HTMLSelectElement>(null);
	useEffect(() => {
		if (!open) return;
		firstSelectRef.current?.focus();
		const onPointerDown = (event: PointerEvent): void => {
			if (rootRef.current?.contains(event.target as Node)) return;
			setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setOpen(false);
			triggerRef.current?.focus();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);
	return (
		<div ref={rootRef} className="relative">
			<button
				ref={triggerRef}
				type="button"
				aria-label={t("header.display")}
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => setOpen((value) => !value)}
				className={`grid size-11 place-items-center rounded-ttd-control p-0 ${open ? "border-ttd-accent bg-ttd-accent-soft text-ttd-accent" : ""}`}
			>
				<Icon name="sliders-horizontal" />
			</button>
			{open ? (
				<div
					role="dialog"
					aria-label={t("header.display")}
					className="absolute right-0 top-[calc(100%+6px)] z-40 grid w-[min(280px,calc(100vw-24px))] gap-3 rounded-ttd-card border border-ttd-border bg-ttd-canvas p-3 shadow-lg"
				>
					<label className="grid gap-1 text-[11px] text-ttd-muted">
						<span>{t("header.sort")}</span>
						<select
							ref={firstSelectRef}
							aria-label={t("header.sort")}
							value={model.sortMode}
							onChange={(event) => void model.onSortChange(event.currentTarget.value)}
							className="min-h-11"
						>
							{model.sortOptions.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-1 text-[11px] text-ttd-muted">
						<span>{t("header.group")}</span>
						<select
							aria-label={t("header.group")}
							value={model.groupMode}
							onChange={(event) => void model.onGroupChange(event.currentTarget.value)}
							className="min-h-11"
						>
							{model.groupOptions.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</label>
				</div>
			) : null}
		</div>
	);
}
