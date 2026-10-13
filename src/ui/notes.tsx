import { type ReactElement } from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface NoteItemModel {
	key: string;
	title: HTMLElement;
	note: HTMLElement | null;
	path: string;
	comments: number;
	onConvert: () => void;
	onOpen: () => void;
}
export interface NotesModel {
	query: string;
	total: number;
	items: NoteItemModel[];
	onQueryChange: (query: string) => void;
}

export function Notes({ model }: { model: NotesModel }): ReactElement {
	const t = useI18n();
	return (
		<section aria-labelledby="ttd-notes-title" className="grid gap-2.5 pb-4">
			<div className="flex items-center gap-2">
				<h2 id="ttd-notes-title" className="sr-only">
					{t("notes.title")}
				</h2>
				<input
					type="search"
					aria-label={t("notes.search")}
					placeholder={t("notes.search")}
					value={model.query}
					onChange={(event) => model.onQueryChange(event.target.value)}
					className="h-8 min-w-0 flex-1 text-[11px] max-[620px]:h-11"
				/>
				<span className="shrink-0 text-[11px] text-[var(--text-faint)]">
					{t("notes.count", { visible: model.items.length, total: model.total })}
				</span>
			</div>
			{model.items.length ? (
				<div className="grid gap-2 min-[900px]:grid-cols-2">
					{model.items.map((item) => (
						<article
							key={item.key}
							className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-3"
						>
							<div className="min-w-0">
								<HtmlMount
									element={item.title}
									className="min-w-0 break-words text-[12px] font-semibold leading-[1.45] [&_p]:m-0"
								/>
								{item.note ? (
									<HtmlMount
										element={item.note}
										className="mt-1.5 line-clamp-3 min-w-0 break-words text-[11px] leading-relaxed text-[var(--text-muted)] [&_p]:m-0"
									/>
								) : null}
								<div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-[var(--text-faint)]">
									{item.comments ? <span>💬 {item.comments}</span> : null}
									<span className="truncate" title={item.path}>
										{item.path.replace(/\.md$/u, "")}
									</span>
								</div>
							</div>
							<div className="flex items-start gap-0.5">
								<button
									type="button"
									aria-label={t("notes.convert")}
									title={t("notes.convert")}
									onClick={item.onConvert}
									className="grid size-8 place-items-center border-0 bg-transparent p-0 text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
								>
									<Icon name="list-checks" />
								</button>
								<button
									type="button"
									aria-label={t("notes.open")}
									title={t("notes.open")}
									onClick={item.onOpen}
									className="grid size-8 place-items-center border-0 bg-transparent p-0 text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[620px]:size-11"
								>
									<Icon name="external-link" />
								</button>
							</div>
						</article>
					))}
				</div>
			) : (
				<div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-[var(--background-modifier-border)] px-4 text-center">
					<div>
						<span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-[var(--background-modifier-hover)] text-[var(--text-muted)]">
							<Icon name="notebook-pen" />
						</span>
						<h3 className="m-0 text-[13px] font-semibold">
							{t(model.query ? "notes.noMatch" : "notes.empty")}
						</h3>
						<p className="mb-0 mt-1 text-[11px] text-[var(--text-muted)]">
							{t(model.query ? "notes.noMatchHint" : "notes.emptyHint")}
						</p>
					</div>
				</div>
			)}
		</section>
	);
}
