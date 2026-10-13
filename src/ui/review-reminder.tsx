import { useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import type { ReviewFocusProgressItem } from "./contracts";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface ReviewReminderModel {
	detail: string;
	focus: { date: string; items: ReviewFocusProgressItem[] } | null;
	reviewDue: boolean;
	onDismiss: () => Promise<void> | void;
	onOpen: () => void;
	onPlanFocus: (item: string) => Promise<void> | void;
}

export function ReviewReminder({ model }: { model: ReviewReminderModel }): ReactElement {
	const t = useI18n();
	const [planning, setPlanning] = useState<string | null>(null);
	const [planError, setPlanError] = useState("");
	const [dismissing, setDismissing] = useState(false);
	const [dismissError, setDismissError] = useState("");
	const plan = async (item: string) => {
		if (planning) return;
		setPlanning(item);
		setPlanError("");
		try {
			await model.onPlanFocus(item);
		} catch (error) {
			setPlanError(error instanceof Error ? error.message : t("reviewReminder.error.plan"));
		} finally {
			setPlanning(null);
		}
	};
	const dismiss = async () => {
		if (dismissing) return;
		setDismissing(true);
		setDismissError("");
		try {
			await model.onDismiss();
		} catch (error) {
			setDismissError(error instanceof Error ? error.message : t("reviewReminder.error.dismiss"));
		} finally {
			setDismissing(false);
		}
	};
	const renderFocusItems = (items: ReviewFocusProgressItem[]) => (
		<ul className="mb-0 mt-1.5 flex list-none flex-wrap gap-1 p-0">
			{items.map((item) => (
				<li key={item.title} className="max-w-full">
					<Button
						size="compact"
						disabled={planning !== null || item.action === null}
						onClick={() => (item.action ? void plan(item.title) : undefined)}
						className="max-w-full gap-1.5 max-[620px]:min-h-11 max-[620px]:items-start max-[620px]:py-2"
					>
						<span
							title={item.title}
							className="max-w-72 truncate text-left max-[620px]:line-clamp-2 max-[620px]:whitespace-normal"
						>
							{planning === item.title ? t("calendarBatch.moving") : item.title}
						</span>
						<span className="shrink-0 text-[11px] text-ttd-muted">{item.label}</span>
						{item.action ? (
							<span className="shrink-0">
								<Icon name={item.action === "open" ? "calendar-check" : "calendar-plus"} />
							</span>
						) : null}
					</Button>
				</li>
			))}
		</ul>
	);
	const focusItems = model.focus?.items || [];
	const representativeIndex = (() => {
		const planIndex = focusItems.findIndex((item) => item.action === "plan");
		if (planIndex >= 0) return planIndex;
		const actionableIndex = focusItems.findIndex((item) => item.action !== null);
		return actionableIndex >= 0 ? actionableIndex : 0;
	})();
	const representativeFocus = focusItems[representativeIndex];
	const remainingFocus = focusItems.filter((_, index) => index !== representativeIndex);
	return (
		<section
			aria-label={t(model.reviewDue ? "reviewReminder.label" : "reviewReminder.focus")}
			className="mb-4 flex items-start gap-2.5 border-l-2 border-ttd-accent px-3 py-2 max-[620px]:flex-col"
		>
			<span
				aria-hidden="true"
				className="grid size-7 shrink-0 place-items-center text-ttd-accent max-[620px]:hidden"
			>
				<Icon name="book-open-check" />
			</span>
			<div className="min-w-0 flex-1">
				<h2 className="m-0 text-[12px] font-semibold">
					{t(model.reviewDue ? "reviewReminder.title" : "reviewReminder.focus")}
				</h2>
				<p className="mb-0 mt-0.5 text-[11px] leading-relaxed text-ttd-muted">{model.detail}</p>
				{representativeFocus ? renderFocusItems([representativeFocus]) : null}
				{remainingFocus.length ? (
					<details className="mt-1.5">
						<summary className="min-h-8 cursor-pointer text-[11px] font-medium text-ttd-muted max-[620px]:flex max-[620px]:min-h-11 max-[620px]:items-center">
							{t("reviewReminder.focusItems", { count: remainingFocus.length })}
						</summary>
						{renderFocusItems(remainingFocus)}
					</details>
				) : null}
				{planError ? (
					<p role="alert" className="mb-0 mt-1 text-[11px] text-ttd-danger">
						{planError}
					</p>
				) : null}
				{dismissError ? (
					<p role="alert" className="mb-0 mt-1 text-[11px] text-ttd-danger">
						{dismissError}
					</p>
				) : null}
			</div>
			{model.reviewDue ? (
				<div className="flex shrink-0 items-center gap-1.5 max-[620px]:w-full max-[620px]:flex-row-reverse">
					<Button
						tone="ghost"
						size="compact"
						disabled={dismissing}
						onClick={() => void dismiss()}
						className="max-[620px]:min-h-11 max-[620px]:flex-1"
					>
						{dismissing ? t("taxonomy.saving") : t("reviewReminder.dismiss")}
					</Button>
					<Button
						tone="primary"
						size="compact"
						disabled={dismissing}
						onClick={model.onOpen}
						className="max-[620px]:min-h-11 max-[620px]:flex-1"
					>
						{t("reviewReminder.open")}
					</Button>
				</div>
			) : null}
		</section>
	);
}
