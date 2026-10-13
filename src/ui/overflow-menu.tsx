import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";

export interface OverflowMenuItem {
	ariaLabel?: string;
	disabled?: boolean;
	icon?: string;
	label: string;
	onSelect: () => void | Promise<void>;
}

export function OverflowMenu({
	items,
	label,
	triggerClassName = "",
	triggerIcon = "ellipsis",
}: {
	items: OverflowMenuItem[];
	label: string;
	triggerClassName?: string;
	triggerIcon?: string;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState<CSSProperties>({
		left: 8,
		top: 8,
		visibility: "hidden",
	});
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const close = useCallback((restoreFocus: boolean) => {
		setOpen(false);
		if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
	}, []);
	const enabledItems = useCallback(
		() => [
			...(menuRef.current?.querySelectorAll<HTMLButtonElement>(
				'[role="menuitem"]:not(:disabled)',
			) ?? []),
		],
		[],
	);
	const openMenu = useCallback(() => setOpen(true), []);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current || !menuRef.current) return;
		const trigger = triggerRef.current.getBoundingClientRect();
		const menu = menuRef.current.getBoundingClientRect();
		const gap = 4;
		const edge = 8;
		const below = trigger.bottom + gap;
		const top =
			below + menu.height <= window.innerHeight - edge
				? below
				: Math.max(edge, trigger.top - menu.height - gap);
		const left = Math.min(
			Math.max(edge, trigger.right - menu.width),
			Math.max(edge, window.innerWidth - menu.width - edge),
		);
		setPosition({ left, top, visibility: "visible" });
		queueMicrotask(() => enabledItems()[0]?.focus());
	}, [enabledItems, open]);

	useEffect(() => {
		if (!open) return;
		const keyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			close(true);
		};
		const pointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
			close(false);
		};
		const reposition = () => close(false);
		document.addEventListener("pointerdown", pointerDown);
		document.addEventListener("keydown", keyDown);
		window.addEventListener("resize", reposition);
		window.addEventListener("scroll", reposition, true);
		return () => {
			document.removeEventListener("pointerdown", pointerDown);
			document.removeEventListener("keydown", keyDown);
			window.removeEventListener("resize", reposition);
			window.removeEventListener("scroll", reposition, true);
		};
	}, [close, open]);

	const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			close(true);
			return;
		}
		if (event.key === "Tab") {
			close(false);
			return;
		}
		if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const buttons = enabledItems();
		if (!buttons.length) return;
		const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const target =
			event.key === "Home"
				? 0
				: event.key === "End"
					? buttons.length - 1
					: event.key === "ArrowDown"
						? (current + 1) % buttons.length
						: (current - 1 + buttons.length) % buttons.length;
		buttons[target]?.focus();
	};

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				data-overflow-trigger
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => (open ? close(true) : openMenu())}
				onKeyDown={(event) => {
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					event.preventDefault();
					openMenu();
				}}
				className={triggerClassName}
			>
				<Icon name={triggerIcon} />
			</button>
			{open
				? createPortal(
						<div
							ref={menuRef}
							role="menu"
							aria-label={label}
							onKeyDown={onMenuKeyDown}
							style={{ position: "fixed", ...position }}
							className="ttd-app z-[1000] grid min-w-40 max-w-[calc(100vw-16px)] gap-0.5 rounded-ttd-card border border-ttd-border bg-ttd-canvas p-1 shadow-[var(--ttd-shadow-floating)]"
						>
							{items.map((item) => (
								<button
									type="button"
									role="menuitem"
									key={item.label}
									disabled={item.disabled}
									aria-label={item.ariaLabel}
									onClick={() => {
										close(true);
										void item.onSelect();
									}}
									className="flex min-h-8 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-2 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:cursor-not-allowed disabled:opacity-40 max-[720px]:min-h-11 max-[720px]:px-3"
								>
									{item.icon ? <Icon name={item.icon} /> : null}
									<span>{item.label}</span>
								</button>
							))}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
