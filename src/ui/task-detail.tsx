import { useEffect, useRef, type KeyboardEvent, type ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { TaskEditDialog, type TaskEditDialogModel } from "./task-edit-dialog";
import { useMediaQuery } from "./use-media-query";

export interface TaskDetailModel {
	key: string;
	dialog: TaskEditDialogModel;
}

export function TaskDetail({ model }: { model: TaskDetailModel }): ReactElement {
	const t = useI18n();
	const mobile = useMediaQuery("(max-width: 899px)");
	const panelRef = useRef<HTMLElement>(null);
	useEffect(() => {
		if (!mobile) return;
		const initial =
			panelRef.current?.querySelector<HTMLElement>("textarea[aria-label]") ??
			panelRef.current?.querySelector<HTMLElement>("input, select, button");
		initial?.focus({ preventScroll: true });
	}, [mobile]);
	const trapFocus = (event: KeyboardEvent<HTMLElement>): void => {
		if (!mobile) return;
		if (event.key === "Escape") {
			event.preventDefault();
			model.dialog.onCancel();
			return;
		}
		if (event.key !== "Tab") return;
		const focusable = [
			...(panelRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			) ?? []),
		].filter((element) => !element.hidden);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	};
	return (
		<aside
			ref={panelRef}
			role={mobile ? "dialog" : undefined}
			aria-modal={mobile || undefined}
			aria-label={t("taskEdit.title")}
			onKeyDown={trapFocus}
			className="absolute inset-0 z-30 w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto border-l border-ttd-border bg-ttd-canvas px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(10px+env(safe-area-inset-top,0px))] min-[900px]:relative min-[900px]:inset-auto min-[900px]:z-auto min-[900px]:w-[420px] min-[900px]:px-4 min-[900px]:pt-3"
		>
			<div className="sticky top-0 z-20 -mx-1 mb-2 flex justify-end bg-ttd-canvas px-1 py-1">
				<button
					type="button"
					aria-label={t("taskDetail.close")}
					onClick={model.dialog.onCancel}
					className="grid size-9 place-items-center rounded-ttd-control border-0 bg-transparent p-0 text-ttd-muted shadow-none hover:bg-ttd-hover hover:text-ttd-text max-[620px]:size-11"
				>
					<Icon name="x" />
				</button>
			</div>
			<TaskEditDialog key={model.key} model={model.dialog} compact />
		</aside>
	);
}
