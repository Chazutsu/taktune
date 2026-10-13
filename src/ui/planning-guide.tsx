import { useEffect, useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface PlanningGuideModel {
	available: boolean;
	inboxRemaining: number;
	overdueRemaining: number;
	unplannedRemaining: number;
	selectedCount: number;
	focusCount: number;
	onNavigate: (view: string, step: number) => void;
}

const TARGETS = ["inbox", "overdue", "calendar", "calendar", "review"];

export function PlanningGuide({ model }: { model: PlanningGuideModel }): ReactElement {
	const t = useI18n();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(0);
	const [started, setStarted] = useState(false);
	const [selectionSeen, setSelectionSeen] = useState(false);
	useEffect(() => {
		// The transient selection is cleared by a successful drop; retain that observed milestone.
		// oxlint-disable-next-line react/set-state-in-effect
		if (model.selectedCount > 0) setSelectionSeen(true);
	}, [model.selectedCount]);
	const values = [
		model.inboxRemaining,
		model.overdueRemaining,
		model.unplannedRemaining,
		model.unplannedRemaining,
		model.focusCount,
	];
	const completed = [
		model.inboxRemaining === 0,
		model.overdueRemaining === 0,
		model.unplannedRemaining === 0 || model.selectedCount > 0 || selectionSeen,
		model.unplannedRemaining === 0 || (selectionSeen && model.selectedCount === 0),
		model.focusCount >= 3,
	];
	const start = () => {
		if (started) {
			setOpen(true);
			model.onNavigate(TARGETS[step]!, step);
			return;
		}
		const firstIncomplete = completed.findIndex((value) => !value);
		const nextStep = firstIncomplete === -1 ? 0 : firstIncomplete;
		setStep(nextStep);
		setStarted(true);
		setSelectionSeen(model.selectedCount > 0);
		setOpen(true);
		model.onNavigate(TARGETS[nextStep]!, nextStep);
	};
	const advance = () => {
		if (model.selectedCount > 0) setSelectionSeen(true);
		if (step === TARGETS.length - 1) {
			setOpen(false);
			setStarted(false);
			setSelectionSeen(false);
			return;
		}
		const nextStep = step + 1;
		setStep(nextStep);
		model.onNavigate(TARGETS[nextStep]!, nextStep);
	};
	const navigateTo = (nextStep: number) => {
		if (model.selectedCount > 0) setSelectionSeen(true);
		setStep(nextStep);
		model.onNavigate(TARGETS[nextStep]!, nextStep);
	};

	if (!open && !model.available) return <></>;
	if (!open)
		return (
			<div className="mb-2 flex justify-end">
				<Button tone="ghost" size="compact" onClick={start} className="max-[620px]:min-h-11">
					<Icon name="list-checks" />
					{t("planningGuide.open")}
				</Button>
			</div>
		);

	return (
		<section
			aria-labelledby="ttd-planning-guide-title"
			className="mb-3 rounded-ttd-card border border-ttd-border bg-ttd-surface p-3"
		>
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="m-0 text-[11px] font-semibold text-ttd-accent">
						{t("planningGuide.progress", { current: step + 1, total: TARGETS.length })}
					</p>
					<h2 id="ttd-planning-guide-title" className="mb-0 mt-0.5 text-sm font-semibold">
						{t(`planningGuide.step${step + 1}.title`)}
					</h2>
				</div>
				<Button
					tone="ghost"
					size="compact"
					aria-label={t("planningGuide.close")}
					onClick={() => setOpen(false)}
					className="shrink-0 max-[620px]:min-h-11"
				>
					<Icon name="x" />
				</Button>
			</header>
			<p className="mb-2 mt-1 text-[11px] leading-relaxed text-ttd-muted">
				{t(`planningGuide.step${step + 1}.description`, { count: values[step] })}
			</p>
			<ol
				className="m-0 grid list-none grid-cols-5 gap-1 p-0"
				aria-label={t("planningGuide.steps")}
			>
				{TARGETS.map((_, index) => (
					<li key={index}>
						<button
							type="button"
							aria-label={t("planningGuide.stepLabel", {
								current: index + 1,
								total: TARGETS.length,
							})}
							aria-current={index === step ? "step" : undefined}
							onClick={() => {
								navigateTo(index);
							}}
							className="flex h-4 w-full items-center rounded-full border-0 bg-transparent p-0 shadow-none max-[620px]:min-h-11"
						>
							<span
								aria-hidden="true"
								className={`h-2 w-full rounded-full ${index === step ? "bg-ttd-accent" : completed[index] ? "bg-ttd-success" : "bg-ttd-border"}`}
							/>
						</button>
					</li>
				))}
			</ol>
			<div className="mt-3 flex items-center justify-between gap-2 max-[620px]:grid max-[620px]:grid-cols-2">
				<span className="text-[11px] text-ttd-muted" role="status">
					{t(completed[step] ? "planningGuide.complete" : "planningGuide.incomplete")}
				</span>
				<div className="flex justify-end gap-1.5 max-[620px]:col-span-2 max-[620px]:grid max-[620px]:grid-cols-2">
					<Button tone="ghost" size="compact" onClick={advance} className="max-[620px]:min-h-11">
						{t("planningGuide.skip")}
					</Button>
					<Button tone="primary" size="compact" onClick={advance} className="max-[620px]:min-h-11">
						{t(step === TARGETS.length - 1 ? "planningGuide.finish" : "planningGuide.next")}
					</Button>
				</div>
			</div>
		</section>
	);
}
