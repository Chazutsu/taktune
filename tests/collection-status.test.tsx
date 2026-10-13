import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CollectionStatus, type CollectionStatusModel } from "../src/ui/collection-status";

describe("CollectionStatus", () => {
	it("partialでは読めた内容を残す説明と失敗件数を一箇所に示す", () => {
		render(<CollectionStatus model={{ failedCount: 2, kind: "partial", onRetry: vi.fn() }} />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("2件のノートを読み込めなかった");
		expect(alert).toHaveTextContent("読み込めた内容だけを表示");
		expect(alert).toHaveTextContent("iCloud");
	});

	it("再試行中はbusyかつdisabledにし、成功後にbannerを消す", async () => {
		let finish: (() => void) | undefined;
		function Harness() {
			const [status, setStatus] = useState<CollectionStatusModel | null>({
				failedCount: 1,
				kind: "partial",
				onRetry: async () => {
					await new Promise<void>((resolve) => {
						finish = resolve;
					});
					setStatus(null);
				},
			});
			return status ? <CollectionStatus model={status} /> : <p>正常に読み込んだ</p>;
		}
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "再試行" }));
		expect(screen.getByRole("alert")).toHaveAttribute("aria-busy", "true");
		expect(screen.getByRole("button", { name: "再試行中…" })).toBeDisabled();
		finish?.();
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
		expect(screen.getByText("正常に読み込んだ")).toBeInTheDocument();
	});

	it("継続失敗では最新の件数へ更新し、fatalを通常emptyと区別する", () => {
		const onRetry = vi.fn();
		const { rerender } = render(
			<CollectionStatus model={{ failedCount: 3, kind: "partial", onRetry }} />,
		);
		rerender(<CollectionStatus model={{ failedCount: 5, kind: "fatal", onRetry }} />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("ノートを読み込めなかった（5件）");
		expect(alert).toHaveTextContent("タスクを表示できない");
	});
});
