import type { CSSProperties, ReactElement } from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import { FocusedPage } from "./page-shell";

export interface CountdownItemModel {
	id: string;
	title: string;
	target: string;
	label: string;
	delta: number;
	color: string;
	repeatLabel: string | null;
	reminderLabel: string | null;
	note: string;
	onEdit: () => void;
}

export interface CountdownsModel {
	featured: CountdownItemModel | null;
	upcoming: CountdownItemModel[];
	past: CountdownItemModel[];
	onAdd: () => void;
}

function colorStyle(color: string): CSSProperties {
	return { "--countdown-color": color } as CSSProperties;
}

function CountdownCard({ item }: { item: CountdownItemModel }): ReactElement {
	const t = useI18n();
	return (
		<article
			style={colorStyle(item.color)}
			className={`relative grid min-w-0 gap-2 overflow-hidden rounded-lg border border-[var(--background-modifier-border)] p-3 pl-4 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--countdown-color)] ${item.delta < 0 ? "opacity-65" : ""}`}
		>
			<header className="flex min-w-0 items-start justify-between gap-2">
				<div className="min-w-0">
					<h3 className="m-0 truncate text-[13px] font-semibold">{item.title}</h3>
					<time dateTime={item.target} className="text-[11px] text-[var(--text-faint)]">
						{item.target}
					</time>
				</div>
				<button
					type="button"
					aria-label={t("countdowns.edit", { title: item.title })}
					onClick={item.onEdit}
					className="grid size-7 shrink-0 place-items-center border-0 bg-transparent p-0 text-[var(--text-faint)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
				>
					<Icon name="ellipsis" />
				</button>
			</header>
			<strong className="text-xl tracking-[-0.025em] text-[var(--countdown-color)]">
				{item.label}
			</strong>
			{item.repeatLabel || item.reminderLabel ? (
				<p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
					{item.repeatLabel ? <span>{item.repeatLabel}</span> : null}
					{item.reminderLabel ? <span>{item.reminderLabel}</span> : null}
				</p>
			) : null}
			{item.note ? (
				<p className="m-0 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
					{item.note}
				</p>
			) : null}
		</article>
	);
}

export function Countdowns({ model }: { model: CountdownsModel }): ReactElement {
	const t = useI18n();
	return (
		<FocusedPage>
			<header className="flex items-center justify-between gap-3">
				<div>
					<h2 className="m-0 text-sm font-semibold">{t("countdowns.title")}</h2>
					<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
						{t("countdowns.description")}
					</p>
				</div>
				<button
					type="button"
					onClick={model.onAdd}
					className="mod-cta min-h-8 shrink-0 px-3 text-[11px] max-[620px]:min-h-11"
				>
					{t("countdowns.add")}
				</button>
			</header>
			{model.featured ? (
				<section
					aria-label={t("countdowns.next")}
					style={colorStyle(model.featured.color)}
					className="grid gap-3 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--countdown-color)_42%,var(--background-modifier-border))] bg-[color-mix(in_srgb,var(--countdown-color)_9%,var(--background-primary))] p-4 min-[621px]:grid-cols-[minmax(0,1fr)_auto] min-[621px]:items-center"
				>
					<div className="min-w-0">
						<p className="m-0 text-[11px] font-medium text-[var(--text-muted)]">
							{t("countdowns.next")}
						</p>
						<h2 className="mb-1 mt-1 truncate text-base font-semibold">{model.featured.title}</h2>
						<time dateTime={model.featured.target} className="text-[11px] text-[var(--text-muted)]">
							{model.featured.target}
						</time>
						{model.featured.note ? (
							<p className="mb-0 mt-2 line-clamp-2 text-[11px] text-[var(--text-muted)]">
								{model.featured.note}
							</p>
						) : null}
					</div>
					<div className="flex items-center justify-between gap-3 min-[621px]:justify-end">
						<strong className="text-[clamp(28px,5vw,46px)] leading-none tracking-[-0.04em] text-[var(--countdown-color)]">
							{model.featured.label}
						</strong>
						<button
							type="button"
							aria-label={t("countdowns.edit", { title: model.featured.title })}
							onClick={model.featured.onEdit}
							className="grid size-8 place-items-center border-0 bg-transparent p-0 text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
						>
							<Icon name="ellipsis" />
						</button>
					</div>
				</section>
			) : (
				<section className="grid min-h-44 place-items-center rounded-lg border border-dashed border-[var(--background-modifier-border)] p-5 text-center">
					<div>
						<span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-[var(--background-modifier-hover)] text-[var(--text-muted)]">
							<Icon name="hourglass" />
						</span>
						<h2 className="m-0 text-sm font-semibold">{t("countdowns.emptyTitle")}</h2>
						<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
							{t("countdowns.emptyDescription")}
						</p>
					</div>
				</section>
			)}
			{model.upcoming.length ? (
				<section>
					<h2 className="mb-2 mt-0 text-[12px] font-semibold text-[var(--text-muted)]">
						{t("countdowns.upcoming")}
					</h2>
					<div className="grid gap-3 min-[621px]:grid-cols-2 min-[901px]:grid-cols-3">
						{model.upcoming.map((item) => (
							<CountdownCard key={item.id} item={item} />
						))}
					</div>
				</section>
			) : null}
			{model.past.length ? (
				<details>
					<summary className="cursor-pointer text-[11px] text-[var(--text-muted)]">
						{t("countdowns.past", { count: model.past.length })}
					</summary>
					<div className="mt-2 grid gap-3 min-[621px]:grid-cols-2 min-[901px]:grid-cols-3">
						{model.past.map((item) => (
							<CountdownCard key={item.id} item={item} />
						))}
					</div>
				</details>
			) : null}
		</FocusedPage>
	);
}
