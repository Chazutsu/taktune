import { useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { OverflowMenu } from "./overflow-menu";

export interface InboxCandidate {
	externalId: string;
	icon: string;
	labels?: string[];
	meta: string;
	sourceLabel: string;
	title: string;
	url?: string;
}

export interface InboxTriageModel {
	items: InboxCandidate[];
	total: number;
	unplannedCount: number;
	errors: string[];
	onImport: (item: InboxCandidate) => Promise<void> | void;
	onImportAndPlan: (item: InboxCandidate) => Promise<void> | void;
	onDismiss: (item: InboxCandidate) => Promise<void> | void;
	onShowAll: () => void;
	onOpenPlanner: () => Promise<void> | void;
}

function CandidateRow({
	item,
	model,
}: {
	item: InboxCandidate;
	model: InboxTriageModel;
}): ReactElement {
	const t = useI18n();
	const [pending, setPending] = useState<"plan" | "import" | "dismiss" | null>(null);
	const [error, setError] = useState("");
	const run = async (
		action: "plan" | "import" | "dismiss",
		callback: () => Promise<void> | void,
	) => {
		if (pending) return;
		setPending(action);
		setError("");
		try {
			await callback();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t("inbox.error.action"));
		} finally {
			setPending(null);
		}
	};
	return (
		<article className="grid min-h-14 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border-t border-ttd-border px-2 py-1.5 max-[620px]:grid-cols-[20px_minmax(0,1fr)_auto] max-[620px]:gap-1.5 max-[620px]:py-1.5">
			<span className="text-ttd-accent">
				<Icon name={item.icon} />
			</span>
			<div className="min-w-0">
				<div
					className="text-xs font-medium text-ttd-text max-[620px]:line-clamp-2 min-[621px]:truncate"
					title={item.title}
				>
					{item.title}
				</div>
				<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-ttd-faint">
					<span className="shrink-0 rounded-sm bg-ttd-hover px-1 py-0.5 text-ttd-muted">
						{item.sourceLabel}
					</span>
					<span className="truncate" title={item.meta}>
						{item.meta}
					</span>
				</div>
			</div>
			<div aria-label={t("inbox.actions")} className="flex items-center justify-end gap-1">
				<Button
					tone="primary"
					size="compact"
					disabled={pending !== null}
					onClick={() => void run("plan", () => model.onImportAndPlan(item))}
					className="max-[620px]:min-h-11 max-[620px]:px-3"
				>
					{t(pending === "plan" ? "inbox.moving" : "inbox.toSchedule")}
				</Button>
				<OverflowMenu
					label={t("inbox.moreActions", { title: item.title })}
					triggerClassName="grid size-8 place-items-center rounded-ttd-control border-0 bg-transparent p-0 text-ttd-muted shadow-none hover:bg-ttd-hover hover:text-ttd-text max-[620px]:size-11"
					items={[
						{
							label: t(pending === "import" ? "inbox.importing" : "inbox.import"),
							disabled: pending !== null,
							onSelect: () => run("import", () => model.onImport(item)),
						},
						{
							label: t(pending === "dismiss" ? "inbox.dismissing" : "inbox.dismiss"),
							disabled: pending !== null,
							onSelect: () => run("dismiss", () => model.onDismiss(item)),
						},
						...(item.url
							? [
									{
										label: t("inbox.openOriginal"),
										ariaLabel: t("inbox.openSource", { source: item.sourceLabel }),
										icon: "arrow-up-right",
										onSelect: () => {
											window.open(item.url, "_blank", "noopener,noreferrer");
										},
									},
								]
							: []),
					]}
				/>
			</div>
			{error ? (
				<p role="alert" className="col-start-2 col-end-4 m-0 text-[11px] text-ttd-danger">
					{error}
				</p>
			) : null}
		</article>
	);
}

export function InboxTriage({ model }: { model: InboxTriageModel }): ReactElement {
	const t = useI18n();
	const [openingPlanner, setOpeningPlanner] = useState(false);
	const [plannerError, setPlannerError] = useState("");
	const openPlanner = async () => {
		if (openingPlanner) return;
		setOpeningPlanner(true);
		setPlannerError("");
		try {
			await model.onOpenPlanner();
		} catch (cause) {
			setPlannerError(cause instanceof Error ? cause.message : t("inbox.error.planner"));
		} finally {
			setOpeningPlanner(false);
		}
	};
	return (
		<section
			aria-labelledby="ttd-inbox-triage-title"
			className="my-4 overflow-visible border-t border-ttd-border"
		>
			<header className="flex min-h-12 items-center justify-between gap-2 px-1 py-2 max-[620px]:items-start">
				<div className="min-w-0">
					<h2 id="ttd-inbox-triage-title" className="m-0 text-[13px] font-semibold text-ttd-text">
						{t("inbox.title")}
					</h2>
					<p className="m-0 mt-0.5 text-[11px] text-ttd-muted">
						{t(model.total ? "inbox.reviewCount" : "inbox.empty", { count: model.total })}
					</p>
				</div>
				{model.total > model.items.length ? (
					<Button
						tone="ghost"
						size="compact"
						onClick={model.onShowAll}
						className="max-[620px]:min-h-11"
					>
						{t("inbox.showAll", { count: model.total })}
					</Button>
				) : null}
			</header>
			{model.errors.length ? (
				<div
					role="alert"
					className="mx-2 mb-2 rounded-ttd-control bg-ttd-danger-soft px-2 py-1.5 text-[11px] text-ttd-danger"
				>
					{model.errors.join(" / ")}
				</div>
			) : null}
			{model.items.map((item) => (
				<CandidateRow key={item.externalId} item={item} model={model} />
			))}
			{!model.items.length && !model.errors.length ? (
				<div className="grid gap-2 border-t border-ttd-border px-2.5 py-2 min-[621px]:grid-cols-[minmax(0,1fr)_auto] min-[621px]:items-center">
					<div className="flex min-w-0 items-center gap-2 text-[11px] text-ttd-muted">
						<Icon name="check-check" />
						<span>
							{t(model.unplannedCount ? "inbox.planUnscheduled" : "inbox.checkToday", {
								count: model.unplannedCount,
							})}
						</span>
					</div>
					<Button
						tone="primary"
						size="compact"
						disabled={openingPlanner}
						onClick={() => void openPlanner()}
						className="max-[620px]:min-h-11 max-[620px]:w-full"
					>
						{t(openingPlanner ? "inbox.moving" : "inbox.openPlanner")}
					</Button>
					{plannerError ? (
						<p role="alert" className="m-0 text-[11px] text-ttd-danger min-[621px]:col-span-2">
							{plannerError}
						</p>
					) : null}
				</div>
			) : null}
		</section>
	);
}
