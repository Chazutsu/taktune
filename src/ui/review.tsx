import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { HtmlMount } from "../design-system/html-mount";
import { FocusedPage } from "./page-shell";
import {
	appendReviewFocus,
	reviewFocusCandidates,
	type ReviewFocusProgressItem,
} from "./contracts";
import { useI18n } from "./i18n";

export interface ReviewSummaryItem {
	label: string;
	value: string;
	comparison?: string;
}

export interface ReviewLogItem {
	title: string | HTMLElement;
	meta: string;
	source?: string;
}

export interface ReviewCarryoverItem {
	key: string;
	plainTitle: string;
	title: string | HTMLElement;
	reason: string;
	context?: string;
	source?: string;
}

export interface ReviewDraft {
	wins: string;
	friction: string;
	lessons: string;
	next: string;
}

export interface ReviewModel {
	previousFocus: { date: string; items: ReviewFocusProgressItem[] } | null;
	history: Array<{ path: string; label: string; onOpen: () => Promise<void> | void }>;
	summary: ReviewSummaryItem[];
	achievements: ReviewLogItem[];
	focus: ReviewLogItem[];
	carryovers: ReviewCarryoverItem[];
	carryoverOverflowCount: number;
	draft: ReviewDraft;
	onPlanPreviousFocus: (item: string) => Promise<void> | void;
	onReasonChange: (key: string, reason: string) => void;
	onFocusSourceChange: (title: string, key: string) => void;
	onDraftChange: (key: keyof ReviewDraft, value: string) => void;
	onPersistDraft: (
		draft: ReviewDraft,
		carryoverReasons: Record<string, string>,
	) => Promise<void> | void;
	onOpenRemainingCarryovers: () => Promise<void> | void;
	onSave: () => Promise<void> | void;
}

const reasons = [
	["", "review.reason.choose"],
	["capacity", "review.reason.capacity"],
	["blocked", "review.reason.blocked"],
	["scope", "review.reason.scope"],
	["priority", "review.reason.priority"],
	["unclear", "review.reason.unclear"],
] as const;

function ReviewTitle({
	title,
	className = "",
}: {
	title: string | HTMLElement;
	className?: string;
}): ReactElement {
	return title instanceof HTMLElement ? (
		<HtmlMount
			element={title}
			inline
			className={`${className} [&_a]:text-inherit [&_p]:m-0 [&_p]:inline`}
		/>
	) : (
		<span className={className}>{title}</span>
	);
}

function LogPanel({
	title,
	empty,
	items,
}: {
	title: string;
	empty: string;
	items: ReviewLogItem[];
}): ReactElement {
	return (
		<section className="min-w-0 border-t border-ttd-border pt-3 first:border-0 min-[721px]:border-t-0 min-[721px]:pt-0">
			<h3 className="mb-1.5 mt-0 text-[13px] font-semibold text-ttd-text">{title}</h3>
			{items.length === 0 ? (
				<p className="m-0 text-[11px] text-ttd-muted">{empty}</p>
			) : (
				<ul className="m-0 list-none p-0">
					{items.map((item, index) => (
						<li
							key={`${item.title}:${item.meta}:${index}`}
							className="flex min-w-0 items-baseline justify-between gap-2 border-b border-ttd-border py-1.5 text-[11px] last:border-b-0"
						>
							<span className="flex min-w-0 items-center gap-1.5">
								{item.source ? (
									<span className="shrink-0 rounded bg-ttd-selected px-1 py-0.5 text-[11px] font-semibold text-ttd-accent">
										{item.source}
									</span>
								) : null}
								<ReviewTitle title={item.title} className="min-w-0 truncate text-ttd-text" />
							</span>
							<time className="shrink-0 text-[11px] text-ttd-faint">{item.meta}</time>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function Review({ model }: { model: ReviewModel }): ReactElement {
	const t = useI18n();
	const { onPersistDraft } = model;
	const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
	const [carryoverReasons, setCarryoverReasons] = useState(() =>
		Object.fromEntries(model.carryovers.map((item) => [item.key, item.reason])),
	);
	const [draft, setDraft] = useState(model.draft);
	const [saving, setSaving] = useState(false);
	const [openingRemainingCarryovers, setOpeningRemainingCarryovers] = useState(false);
	const [openRemainingCarryoversError, setOpenRemainingCarryoversError] = useState("");
	const [saveError, setSaveError] = useState("");
	const [planningFocus, setPlanningFocus] = useState<string | null>(null);
	const [planError, setPlanError] = useState("");
	const [draftSaveState, setDraftSaveState] = useState<
		"idle" | "pending" | "saving" | "saved" | "error"
	>("idle");
	const draftRevision = useRef(0);
	const draftTimer = useRef<number | null>(null);
	const pending = useMemo(
		() => model.carryovers.filter((item) => !carryoverReasons[item.key]).length,
		[carryoverReasons, model.carryovers],
	);
	const nextFocus = useMemo(() => reviewFocusCandidates(draft.next), [draft.next]);
	const nextFocusSet = useMemo(() => new Set(nextFocus), [nextFocus]);
	const nextCount = nextFocus.length;
	const missingPriority = nextCount === 0;
	const tooManyPriorities = nextCount > 3;
	const saveStatus =
		pending > 0
			? t("review.status.reasonsMissing", { count: pending })
			: missingPriority
				? t("review.status.focusMissing")
				: tooManyPriorities
					? t("review.status.focusTooMany")
					: t("review.status.ready");

	const updateDraft = (key: keyof ReviewDraft, value: string) => {
		draftRevision.current += 1;
		setDraft((current) => ({ ...current, [key]: value }));
		model.onDraftChange(key, value);
	};
	const addCarryoverToFocus = (item: ReviewCarryoverItem) => {
		const next = appendReviewFocus(draft.next, item.plainTitle);
		if (next.added) {
			model.onFocusSourceChange(item.plainTitle, item.key);
			updateDraft("next", next.value);
		}
	};
	const persistDraft = useCallback(async (): Promise<boolean> => {
		const revision = draftRevision.current;
		setDraftSaveState("saving");
		try {
			await onPersistDraft(draft, carryoverReasons);
			if (revision === draftRevision.current) setDraftSaveState("saved");
			return true;
		} catch {
			if (revision === draftRevision.current) setDraftSaveState("error");
			return false;
		}
	}, [carryoverReasons, draft, onPersistDraft]);
	useEffect(() => {
		if (draftRevision.current === 0) return undefined;
		setDraftSaveState("pending");
		draftTimer.current = window.setTimeout(() => {
			draftTimer.current = null;
			void persistDraft();
		}, 500);
		return () => {
			if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
			draftTimer.current = null;
		};
	}, [persistDraft]);
	const save = async () => {
		if (saving || missingPriority || tooManyPriorities) return;
		if (draftTimer.current !== null) {
			window.clearTimeout(draftTimer.current);
			draftTimer.current = null;
		}
		setSaving(true);
		setSaveError("");
		try {
			if (!(await persistDraft())) throw new Error(t("review.error.draft"));
			await model.onSave();
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : t("review.error.save"));
		} finally {
			setSaving(false);
		}
	};
	const planPreviousFocus = async (item: string) => {
		if (planningFocus) return;
		setPlanningFocus(item);
		setPlanError("");
		try {
			await model.onPlanPreviousFocus(item);
		} catch (error) {
			setPlanError(error instanceof Error ? error.message : t("review.error.plan"));
		} finally {
			setPlanningFocus(null);
		}
	};
	const openRemainingCarryovers = async () => {
		if (openingRemainingCarryovers) return;
		setOpeningRemainingCarryovers(true);
		setOpenRemainingCarryoversError("");
		try {
			if (!(await persistDraft())) return;
			await model.onOpenRemainingCarryovers();
		} catch (error) {
			setOpenRemainingCarryoversError(
				error instanceof Error ? error.message : t("review.error.openCarryovers"),
			);
		} finally {
			setOpeningRemainingCarryovers(false);
		}
	};

	return (
		<FocusedPage>
			<nav
				aria-label={t("review.steps.label")}
				className="hidden grid-cols-3 gap-1 rounded-ttd-control bg-ttd-surface p-1 max-[620px]:grid"
			>
				{(
					[
						[1, "review.steps.achievements"],
						[2, "review.steps.carryovers"],
						[3, "review.steps.next"],
					] as const
				).map(([step, key]) => (
					<button
						type="button"
						key={step}
						aria-selected={mobileStep === step}
						onClick={() => setMobileStep(step)}
						className={`min-h-11 rounded-ttd-control border-0 px-1 text-[11px] shadow-none ${mobileStep === step ? "bg-ttd-canvas font-semibold text-ttd-accent" : "bg-transparent text-ttd-muted"}`}
					>
						<span className="mr-1 text-[11px]">{step}</span>
						{t(key)}
					</button>
				))}
			</nav>
			{model.previousFocus?.items.length ? (
				<section
					aria-labelledby="review-previous-focus"
					className={`rounded-lg border border-[color-mix(in_srgb,var(--ttd-color-accent)_28%,var(--ttd-color-border))] bg-ttd-selected p-3 ${mobileStep === 1 ? "" : "max-[620px]:hidden"}`}
				>
					<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
						<h2 id="review-previous-focus" className="m-0 text-sm font-semibold">
							{t("review.previous.title")}
						</h2>
						<span className="text-[11px] text-ttd-muted">{model.previousFocus.date}</span>
					</div>
					<ul className="mb-0 mt-2 grid gap-1 p-0 text-[11px]">
						{model.previousFocus.items.map((item) => (
							<li
								key={item.title}
								className="flex min-w-0 items-center justify-between gap-2 rounded-md px-1 py-0.5 max-[620px]:items-start"
							>
								<span className="flex min-w-0 items-center gap-1.5 py-1.5 max-[620px]:leading-relaxed">
									<span className="min-w-0">{item.title}</span>
									<span className="shrink-0 rounded bg-ttd-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ttd-muted">
										{item.label}
									</span>
								</span>
								{item.action ? (
									<Button
										size="compact"
										disabled={planningFocus !== null}
										onClick={() => void planPreviousFocus(item.title)}
										className="max-[620px]:min-h-11 max-[620px]:px-3"
									>
										{planningFocus === item.title
											? t("review.previous.moving")
											: item.action === "open"
												? t("review.previous.open")
												: t("review.previous.plan")}
									</Button>
								) : null}
							</li>
						))}
					</ul>
					{planError ? (
						<p role="alert" className="mb-0 mt-2 text-[11px] text-ttd-danger">
							{planError}
						</p>
					) : null}
				</section>
			) : null}
			<section
				aria-labelledby="review-step-1"
				className={`grid gap-3 rounded-lg border border-ttd-border bg-ttd-canvas p-3 ${mobileStep === 1 ? "" : "max-[620px]:hidden"}`}
			>
				<div className="flex items-center gap-2">
					<span
						aria-hidden="true"
						className="grid size-5 shrink-0 place-items-center rounded-full bg-ttd-selected text-[11px] font-semibold text-ttd-accent"
					>
						1
					</span>
					<h2 id="review-step-1" className="m-0 text-sm font-semibold">
						{t("review.step1.title")}
					</h2>
				</div>
				<div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-ttd-border bg-ttd-border min-[721px]:grid-cols-4">
					{model.summary.map((item) => (
						<div key={item.label} className="grid content-start gap-0.5 bg-ttd-canvas px-3 py-2">
							<span className="text-[11px] text-ttd-muted">{item.label}</span>
							<strong className="text-base leading-tight">{item.value}</strong>
							{item.comparison ? (
								<span className="text-[11px] leading-tight text-ttd-faint">{item.comparison}</span>
							) : null}
						</div>
					))}
				</div>
				<div className="grid gap-3 min-[721px]:grid-cols-2 min-[721px]:gap-5">
					<LogPanel
						title={t("review.step1.achievements")}
						empty={t("review.step1.noAchievements")}
						items={model.achievements}
					/>
					<LogPanel
						title={t("review.step1.focus")}
						empty={t("review.step1.noFocus")}
						items={model.focus}
					/>
				</div>
				<Button
					size="compact"
					onClick={() => setMobileStep(2)}
					className="hidden min-h-11 w-full max-[620px]:inline-flex"
				>
					{t("review.step1.next")}
				</Button>
			</section>

			<section
				aria-labelledby="review-step-2"
				className={`grid gap-3 rounded-lg border border-ttd-border p-3 ${mobileStep === 2 ? "" : "max-[620px]:hidden"}`}
			>
				<div className="flex flex-wrap items-center gap-2">
					<span
						aria-hidden="true"
						className="grid size-5 shrink-0 place-items-center rounded-full bg-ttd-selected text-[11px] font-semibold text-ttd-accent"
					>
						2
					</span>
					<h2 id="review-step-2" className="m-0 text-sm font-semibold">
						{t("review.step2.title")}
					</h2>
					{pending > 0 ? (
						<span role="status" className="ml-auto text-[11px] text-ttd-warning">
							{t("review.step2.pending", { count: pending })}
						</span>
					) : null}
				</div>
				{model.carryovers.length === 0 ? (
					<p className="m-0 text-[11px] text-ttd-muted">{t("review.step2.empty")}</p>
				) : (
					<div className="grid gap-0">
						{model.carryovers.map((item) => (
							<div
								key={item.key}
								className="grid items-center gap-1.5 border-b border-ttd-border py-2 last:border-b-0 min-[621px]:grid-cols-[minmax(0,1fr)_minmax(150px,190px)]"
							>
								<span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ttd-text">
									{item.source ? (
										<span className="shrink-0 rounded bg-ttd-selected px-1 py-0.5 text-[11px] font-semibold text-ttd-accent">
											{item.source}
										</span>
									) : null}
									{item.context ? (
										<span className="shrink-0 rounded bg-ttd-surface px-1 py-0.5 text-[11px] font-semibold text-ttd-muted">
											{item.context}
										</span>
									) : null}
									<ReviewTitle title={item.title} className="min-w-0 truncate" />
									<Button
										tone="ghost"
										size="compact"
										aria-label={t("review.step2.addFocus", { title: item.plainTitle })}
										disabled={nextFocusSet.has(item.plainTitle) || nextCount >= 3}
										onClick={() => addCarryoverToFocus(item)}
										className="ml-auto shrink-0 max-[620px]:min-h-11"
									>
										{t(
											nextFocusSet.has(item.plainTitle)
												? "review.step2.focused"
												: "review.step2.toFocus",
										)}
									</Button>
								</span>
								<select
									aria-label={t("review.step2.reason", {
										title:
											item.title instanceof HTMLElement
												? item.title.textContent || t("review.step2.task")
												: item.title,
									})}
									value={carryoverReasons[item.key] || ""}
									onChange={(event) => {
										const value = event.currentTarget.value;
										draftRevision.current += 1;
										setCarryoverReasons((current) => ({ ...current, [item.key]: value }));
										model.onReasonChange(item.key, value);
									}}
									className="h-8 w-full min-w-0 rounded-md border border-ttd-border bg-ttd-canvas px-2 text-[11px] max-[620px]:min-h-11"
								>
									{reasons.map(([value, key]) => (
										<option key={value} value={value}>
											{t(key)}
										</option>
									))}
								</select>
							</div>
						))}
						{model.carryoverOverflowCount > 0 ? (
							<div
								role="note"
								className="mt-2 grid gap-1.5 rounded-md bg-ttd-surface px-2.5 py-2 text-[11px] leading-relaxed text-ttd-muted min-[621px]:grid-cols-[minmax(0,1fr)_auto] min-[621px]:items-center"
							>
								<span>
									{t("review.step2.overflow", {
										visible: model.carryovers.length,
										remaining: model.carryoverOverflowCount,
									})}
								</span>
								<Button
									tone="ghost"
									size="compact"
									disabled={openingRemainingCarryovers}
									onClick={() => void openRemainingCarryovers()}
									className="shrink-0 max-[620px]:min-h-11"
								>
									{openingRemainingCarryovers
										? t("review.step2.saving")
										: t("review.step2.openRemaining", { count: model.carryoverOverflowCount })}
								</Button>
								{openRemainingCarryoversError ? (
									<p role="alert" className="m-0 text-ttd-danger min-[621px]:col-span-2">
										{openRemainingCarryoversError}
									</p>
								) : null}
							</div>
						) : null}
					</div>
				)}
				<Button
					size="compact"
					onClick={() => setMobileStep(3)}
					className="hidden min-h-11 w-full max-[620px]:inline-flex"
				>
					{t("review.step2.next")}
				</Button>
			</section>

			<section
				aria-labelledby="review-step-3"
				className={`grid gap-3 rounded-lg border border-ttd-border p-3 ${mobileStep === 3 ? "" : "max-[620px]:hidden"}`}
			>
				<div className="flex items-center gap-2">
					<span
						aria-hidden="true"
						className="grid size-5 shrink-0 place-items-center rounded-full bg-ttd-selected text-[11px] font-semibold text-ttd-accent"
					>
						3
					</span>
					<h2 id="review-step-3" className="m-0 text-sm font-semibold">
						{t("review.step3.title")}
					</h2>
				</div>
				<div className="grid gap-3 min-[721px]:grid-cols-2">
					{(
						[
							["wins", "review.field.wins", 2],
							["friction", "review.field.friction", 2],
							["lessons", "review.field.lessons", 2],
							["next", "review.field.next", 3],
						] as const
					).map(([key, labelKey, rows]) => (
						<label key={key} className="grid gap-1 text-[11px] text-ttd-muted">
							<span>
								{t(labelKey)}
								{key === "next" ? ` ${nextCount}/3` : ""}
							</span>
							<textarea
								rows={rows}
								value={draft[key]}
								onChange={(event) => updateDraft(key, event.currentTarget.value)}
								className="w-full resize-y rounded-md border border-ttd-border bg-ttd-canvas px-2.5 py-2 text-[13px] leading-relaxed text-ttd-text"
							/>
							{key === "next" && !tooManyPriorities ? (
								<span className="text-[11px] text-ttd-faint">{t("review.field.hint")}</span>
							) : null}
							{key === "next" && tooManyPriorities ? (
								<span role="alert" className="text-[11px] text-ttd-danger">
									{t("review.status.focusTooMany")}
								</span>
							) : null}
						</label>
					))}
				</div>
			</section>

			{model.history.length ? (
				<details
					className={`rounded-lg border border-ttd-border bg-ttd-canvas ${mobileStep === 3 ? "" : "max-[620px]:hidden"}`}
				>
					<summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold text-ttd-text max-[620px]:min-h-11 [&::-webkit-details-marker]:hidden">
						<span>{t("review.history")}</span>
						<span className="font-normal text-ttd-muted">
							{t("common.items", { count: model.history.length })}
						</span>
					</summary>
					<ul className="m-0 grid list-none border-t border-ttd-border p-1.5">
						{model.history.map((item) => (
							<li key={item.path}>
								<Button
									tone="ghost"
									size="compact"
									onClick={() => void item.onOpen()}
									className="w-full justify-start text-left max-[620px]:min-h-11"
								>
									{item.label}
								</Button>
							</li>
						))}
					</ul>
				</details>
			) : null}

			<div
				data-mobile-safe-area="review-action"
				className={`sticky bottom-0 flex items-center justify-between gap-3 border-t border-ttd-border bg-ttd-canvas py-2 max-[620px]:static max-[620px]:grid max-[620px]:grid-cols-[minmax(0,1fr)] max-[620px]:gap-2 max-[620px]:pb-[calc(8px+env(safe-area-inset-bottom,0px))] ${mobileStep === 3 ? "" : "max-[620px]:hidden"}`}
			>
				<div className="min-w-0">
					<p
						role={saveError ? "alert" : undefined}
						className={`m-0 text-[11px] ${saveError ? "text-ttd-danger" : "text-ttd-muted"}`}
					>
						{saveError || saveStatus}
					</p>
					{draftSaveState !== "idle" ? (
						<p
							role={draftSaveState === "error" && !saveError ? "alert" : "status"}
							className={`mb-0 mt-0.5 text-[11px] ${draftSaveState === "error" ? "text-ttd-danger" : "text-ttd-faint"}`}
						>
							{draftSaveState === "pending" ? (
								t("review.draft.pending")
							) : draftSaveState === "saving" ? (
								t("review.draft.saving")
							) : draftSaveState === "saved" ? (
								t("review.draft.saved")
							) : (
								<>
									<span>{t("review.draft.failed")}</span>
									<Button
										tone="ghost"
										size="compact"
										onClick={() => void persistDraft()}
										className="ml-1 max-[620px]:min-h-11"
									>
										{t("common.retry")}
									</Button>
								</>
							)}
						</p>
					) : null}
				</div>
				<Button
					tone="primary"
					size="compact"
					disabled={saving || pending > 0 || missingPriority || tooManyPriorities}
					onClick={() => void save()}
					className="disabled:!border-ttd-border disabled:!bg-ttd-surface disabled:!text-ttd-muted disabled:!opacity-100 max-[620px]:min-h-11 max-[620px]:!min-w-full max-[620px]:!w-full"
				>
					{t(saving ? "review.save.pending" : "review.save.submit")}
				</Button>
			</div>
		</FocusedPage>
	);
}
