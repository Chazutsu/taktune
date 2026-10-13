import { useState, type ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface CollectionStatusModel {
	failedCount: number;
	kind: "partial" | "fatal";
	onRetry: () => void | Promise<void>;
}

export function CollectionStatus({ model }: { model: CollectionStatusModel }): ReactElement {
	const t = useI18n();
	const [retrying, setRetrying] = useState(false);
	const retry = async (): Promise<void> => {
		if (retrying) return;
		setRetrying(true);
		try {
			await model.onRetry();
		} finally {
			setRetrying(false);
		}
	};
	const fatal = model.kind === "fatal";
	return (
		<aside
			role="alert"
			aria-busy={retrying}
			className={`mb-3 flex min-w-0 items-start gap-3 border-l-2 px-3 py-2.5 ${fatal ? "border-ttd-danger bg-[color-mix(in_srgb,var(--ttd-danger)_8%,transparent)]" : "border-ttd-accent bg-ttd-surface"} max-[620px]:flex-col`}
		>
			<span
				aria-hidden="true"
				className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${fatal ? "text-ttd-danger" : "text-ttd-accent"}`}
			>
				<Icon name="triangle-alert" />
			</span>
			<div className="min-w-0 flex-1">
				<h2 className="m-0 text-sm font-semibold">
					{t(fatal ? "collection.fatal.title" : "collection.partial.title", {
						count: model.failedCount,
					})}
				</h2>
				<p className="mb-0 mt-1 text-xs leading-relaxed text-ttd-muted">
					{t(fatal ? "collection.fatal.description" : "collection.partial.description")}
				</p>
			</div>
			<button
				type="button"
				disabled={retrying}
				onClick={() => void retry()}
				className="min-h-9 shrink-0 rounded-ttd-control px-3 text-xs max-[620px]:min-h-11 max-[620px]:w-full"
			>
				{t(retrying ? "collection.retrying" : "common.retry")}
			</button>
		</aside>
	);
}
