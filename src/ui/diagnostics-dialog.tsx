import { useState, type ReactElement } from "react";
import { translatorFor, useI18n, type Translate } from "./i18n";

export type DiagnosticLevel = "ok" | "info" | "error";

export interface DiagnosticItem {
	id: string;
	level: DiagnosticLevel;
	title: string;
	detail: string;
	repair?: string;
}

export interface DiagnosticsDialogModel {
	version: string;
	platform: string;
	vault: string;
	integrations: string[];
	items: DiagnosticItem[];
	onCopy: (connectionResults: string[]) => Promise<void> | void;
	onTestIntegrations: () => Promise<string[]>;
}

const LEVELS: DiagnosticLevel[] = ["ok", "info", "error"];
const ICONS: Record<DiagnosticLevel, string> = { ok: "✓", info: "i", error: "!" };
const COLORS: Record<DiagnosticLevel, string> = {
	ok: "text-[var(--text-success)]",
	info: "text-[var(--text-warning)]",
	error: "text-[var(--text-error)]",
};

export function diagnosticsReport(
	model: Omit<DiagnosticsDialogModel, "onCopy" | "onTestIntegrations"> & {
		connectionResults?: string[];
	},
	t: Translate = translatorFor("ja"),
): string {
	const lines = model.items.map(
		(item) =>
			`[${item.level.toUpperCase()}] ${item.title}: ${item.detail}${item.repair ? ` / ${t("diagnostics.repair")}: ${item.repair}` : ""}`,
	);
	return [
		`Taktune v${model.version}`,
		`${t("diagnostics.environment")}: ${model.platform}`,
		`Vault: ${model.vault}`,
		`${t("diagnostics.integrations")}: ${model.integrations.length ? model.integrations.join(" · ") : t("diagnostics.none")}`,
		"",
		...lines,
		...(model.connectionResults?.length
			? ["", `${t("diagnostics.connectionCheck")}:`, ...model.connectionResults]
			: []),
	].join("\n");
}

export async function copyTextToClipboard(
	value: string,
	clipboard: Pick<Clipboard, "writeText"> | null | undefined = activeWindow.navigator.clipboard,
): Promise<void> {
	if (!clipboard?.writeText) throw new Error("Clipboard API unavailable");
	await clipboard.writeText(value);
}

export function DiagnosticsDialog({ model }: { model: DiagnosticsDialogModel }): ReactElement {
	const t = useI18n();
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
	const [connectionState, setConnectionState] = useState<"idle" | "testing" | "done" | "error">(
		"idle",
	);
	const [connectionResults, setConnectionResults] = useState<string[]>([]);
	const counts = model.items.reduce<Record<DiagnosticLevel, number>>(
		(current, item) => ({ ...current, [item.level]: current[item.level] + 1 }),
		{ ok: 0, info: 0, error: 0 },
	);
	const copy = async () => {
		try {
			await model.onCopy(connectionResults);
			setCopyState("copied");
		} catch {
			setCopyState("error");
		}
	};
	const testIntegrations = async () => {
		if (connectionState === "testing") return;
		setConnectionState("testing");
		try {
			setConnectionResults(await model.onTestIntegrations());
			setConnectionState("done");
		} catch {
			setConnectionState("error");
		}
	};
	return (
		<section className="grid gap-3">
			<header>
				<h2 className="m-0 text-lg font-semibold">{t("diagnostics.title")}</h2>
				<p className="m-0 mt-1 text-xs text-[var(--text-muted)]">
					v{model.version} · {model.platform} · Vault: {model.vault}
				</p>
			</header>
			<div
				className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-modifier-border)]"
				aria-label={t("diagnostics.summary")}
			>
				{LEVELS.map((level) => (
					<div key={level} className="grid bg-[var(--background-primary)] p-2 text-center">
						<strong className={`text-base ${COLORS[level]}`}>{counts[level]}</strong>
						<span className="text-[11px] text-[var(--text-muted)]">
							{t(`diagnostics.level.${level}`)}
						</span>
					</div>
				))}
			</div>
			<div className="grid max-h-[48vh] overflow-y-auto rounded-lg border border-[var(--background-modifier-border)]">
				{model.items.map((item) => (
					<article
						key={item.id}
						className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 border-b border-[var(--background-modifier-border)] p-2.5 last:border-b-0"
					>
						<span
							aria-label={t(`diagnostics.level.${item.level}`)}
							className={`grid size-5 place-items-center rounded-full border border-current text-[11px] font-semibold ${COLORS[item.level]}`}
						>
							{ICONS[item.level]}
						</span>
						<div className="min-w-0">
							<h3 className="m-0 text-xs font-semibold">{item.title}</h3>
							<p className="m-0 mt-0.5 break-words text-[11px] text-[var(--text-muted)]">
								{item.detail}
							</p>
							{item.repair ? (
								<p className="m-0 mt-1 text-[11px] text-[var(--text-normal)]">
									<strong>{t("diagnostics.repair")}:</strong> {item.repair}
								</p>
							) : null}
						</div>
					</article>
				))}
			</div>
			<p className="m-0 rounded-md bg-[var(--background-secondary)] p-2 text-[11px] text-[var(--text-muted)]">
				<strong className="text-[var(--text-normal)]">{t("diagnostics.integrations")}: </strong>
				{model.integrations.length ? model.integrations.join(" · ") : t("diagnostics.none")}
			</p>
			<div className="grid gap-1.5 rounded-md border border-[var(--background-modifier-border)] p-2">
				<div className="flex items-center justify-between gap-2 max-[620px]:grid">
					<div>
						<strong className="text-xs">{t("diagnostics.connectionCheck")}</strong>
						<p className="m-0 mt-0.5 text-[11px] text-[var(--text-muted)]">
							{t("diagnostics.connectionDescription")}
						</p>
					</div>
					<button
						type="button"
						disabled={connectionState === "testing"}
						onClick={() => void testIntegrations()}
						className="min-h-8 shrink-0 px-3 text-[11px] disabled:opacity-60 max-[620px]:min-h-11 max-[620px]:w-full"
					>
						{connectionState === "testing"
							? t("diagnostics.testing")
							: connectionState === "done"
								? t("diagnostics.retest")
								: t("diagnostics.test")}
					</button>
				</div>
				{connectionResults.length ? (
					<ul
						aria-label={t("diagnostics.results")}
						className="m-0 grid list-none gap-1 p-0 text-[11px] text-[var(--text-muted)]"
					>
						{connectionResults.map((result) => (
							<li key={result}>{result}</li>
						))}
					</ul>
				) : null}
				{connectionState === "error" ? (
					<p role="alert" className="m-0 text-[11px] text-[var(--text-error)]">
						{t("diagnostics.testError")}
					</p>
				) : null}
			</div>
			<div className="flex items-center justify-between gap-2 max-[620px]:grid">
				<p
					role={copyState === "error" ? "alert" : "status"}
					className={`m-0 text-[11px] ${copyState === "error" ? "text-[var(--text-error)]" : "text-[var(--text-muted)]"}`}
				>
					{copyState === "copied"
						? t("diagnostics.copied")
						: copyState === "error"
							? t("diagnostics.copyError")
							: t("diagnostics.privacy")}
				</p>
				<button
					type="button"
					onClick={() => void copy()}
					className="min-h-8 shrink-0 px-3 text-[11px] max-[620px]:min-h-11 max-[620px]:w-full"
				>
					{t("diagnostics.copy")}
				</button>
			</div>
		</section>
	);
}
