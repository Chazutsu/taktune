import { useState, type ReactElement } from "react";
import { Button } from "../design-system/button";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface ExternalIssueModel {
	externalId: string;
	title: string;
	meta: string;
	labels: string[];
	icon: string;
	sourceLabel: string;
	url?: string;
	state: "imported" | "dismissed" | null;
	onImport: () => Promise<void> | void;
	onImportAndPlan: () => Promise<void> | void;
	onPlan?: () => Promise<void> | void;
	onDismiss: () => Promise<void> | void;
}

export interface ExternalIssuesModel {
	errors: string[];
	sources: Array<{ label: string; count: number }>;
	labels: string[];
	activeLabel: string;
	showHandled: boolean;
	items: ExternalIssueModel[];
	onSelectLabel: (label: string) => void;
	onToggleHandled: () => void;
}

function IssueRow({ item }: { item: ExternalIssueModel }): ReactElement {
	const t = useI18n();
	const stateLabel =
		item.state === "imported"
			? t("issues.imported")
			: item.state === "dismissed"
				? t("issues.dismissed")
				: null;
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
			setError(cause instanceof Error ? cause.message : t("issues.error"));
		} finally {
			setPending(null);
		}
	};
	return (
		<article className="grid min-h-16 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-ttd-border px-2.5 py-2 max-[640px]:grid-cols-[24px_minmax(0,1fr)]">
			<span aria-hidden="true" className="text-ttd-accent">
				<Icon name={item.icon} />
			</span>
			<div className="min-w-0">
				<div className="text-[12px] font-medium leading-[1.45] text-ttd-text">{item.title}</div>
				<div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-ttd-faint">
					<span className="rounded-sm bg-ttd-hover px-1.5 py-0.5 text-ttd-muted">
						{item.sourceLabel}
					</span>
					{item.meta ? (
						<span className="min-w-0 truncate" title={item.meta}>
							{item.meta}
						</span>
					) : null}
					{item.labels.map((label) => (
						<span key={label} className="rounded-full bg-ttd-surface px-1.5 py-0.5">
							{label}
						</span>
					))}
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-1 max-[640px]:col-start-2 max-[640px]:justify-start">
				{stateLabel ? (
					<>
						<span className="mr-1 text-[11px] text-ttd-faint">{stateLabel}</span>
						{item.state === "imported" && item.onPlan ? (
							<Button
								tone="primary"
								size="compact"
								disabled={pending !== null}
								onClick={() => void run("plan", item.onPlan!)}
								className="max-[640px]:min-h-11"
							>
								{pending === "plan" ? t("calendarBatch.moving") : t("issues.plan")}
							</Button>
						) : null}
					</>
				) : (
					<>
						<Button
							tone="primary"
							size="compact"
							disabled={pending !== null}
							onClick={() => void run("plan", item.onImportAndPlan)}
							className="max-[640px]:min-h-11"
						>
							{pending === "plan" ? t("calendarBatch.moving") : t("issues.plan")}
						</Button>
						<Button
							size="compact"
							disabled={pending !== null}
							onClick={() => void run("import", item.onImport)}
							className="max-[640px]:min-h-11"
						>
							{pending === "import" ? t("quickAdd.addingEllipsis") : t("issues.import")}
						</Button>
						<Button
							tone="ghost"
							size="compact"
							disabled={pending !== null}
							onClick={() => void run("dismiss", item.onDismiss)}
							className="max-[640px]:min-h-11"
						>
							{pending === "dismiss" ? t("issues.dismissing") : t("issues.dismiss")}
						</Button>
					</>
				)}
				{item.url ? (
					<a
						href={item.url}
						target="_blank"
						rel="noreferrer"
						aria-label={t("issues.open", { source: item.sourceLabel })}
						className="grid size-8 place-items-center rounded-ttd-control text-ttd-muted hover:bg-ttd-hover hover:text-ttd-text max-[640px]:size-11"
					>
						<Icon name="arrow-up-right" />
					</a>
				) : null}
			</div>
			{error ? (
				<p
					role="alert"
					className="col-start-2 col-end-4 m-0 text-[11px] text-ttd-danger max-[640px]:col-end-3"
				>
					{error}
				</p>
			) : null}
		</article>
	);
}

export function ExternalIssues({ model }: { model: ExternalIssuesModel }): ReactElement {
	const t = useI18n();
	return (
		<section aria-labelledby="ttd-external-title" className="grid gap-2 pb-4">
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				<h2 id="ttd-external-title" className="sr-only">
					{t("issues.title")}
				</h2>
				{model.sources.map((source) => (
					<span
						key={source.label}
						className="inline-flex h-7 items-center gap-1 rounded-ttd-control border border-ttd-border px-2 text-[11px] text-ttd-muted"
					>
						<span>{source.label}</span>
						<strong className="font-semibold text-ttd-text">{source.count}</strong>
					</span>
				))}
			</div>
			{model.errors.length ? (
				<div
					role="alert"
					className="rounded-ttd-control border-l-[3px] border-l-ttd-danger bg-ttd-danger-soft px-2.5 py-2 text-[11px] text-ttd-danger"
				>
					{model.errors.join(" / ")}
				</div>
			) : null}
			<div
				className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				aria-label={t("issues.labels")}
			>
				{["", ...model.labels].map((label) => (
					<button
						type="button"
						key={label || "all"}
						aria-pressed={model.activeLabel === label}
						onClick={() => model.onSelectLabel(label)}
						className={`h-7 shrink-0 rounded-full border-0 px-2.5 text-[11px] shadow-none max-[640px]:min-h-11 ${model.activeLabel === label ? "bg-ttd-selected font-semibold text-ttd-accent" : "bg-ttd-surface text-ttd-muted hover:bg-ttd-hover"}`}
					>
						{label || t("filter.all")}
					</button>
				))}
				<button
					type="button"
					aria-pressed={model.showHandled}
					onClick={model.onToggleHandled}
					className={`ml-auto h-7 shrink-0 rounded-full border-0 px-2.5 text-[11px] shadow-none max-[640px]:min-h-11 ${model.showHandled ? "bg-ttd-selected text-ttd-accent" : "bg-transparent text-ttd-muted hover:bg-ttd-hover"}`}
				>
					{t(model.showHandled ? "issues.unhandled" : "issues.showHandled")}
				</button>
			</div>
			<div className="overflow-hidden rounded-lg border border-ttd-border">
				{model.items.map((item) => (
					<IssueRow key={item.externalId} item={item} />
				))}
				{!model.items.length ? (
					<div className="grid min-h-28 place-items-center px-4 text-center">
						<div>
							<span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-ttd-hover text-ttd-muted">
								<Icon name={model.errors.length ? "triangle-alert" : "check-check"} />
							</span>
							<h3 className="m-0 text-[13px] font-semibold">
								{t(model.errors.length ? "issues.fetchError" : "issues.empty")}
							</h3>
							<p className="mb-0 mt-1 text-[11px] text-ttd-muted">
								{t(model.errors.length ? "issues.fetchHint" : "issues.emptyHint")}
							</p>
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}
