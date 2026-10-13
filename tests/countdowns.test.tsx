import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Countdowns, type CountdownItemModel, type CountdownsModel } from "../src/ui/countdowns";

function item(overrides: Partial<CountdownItemModel> = {}): CountdownItemModel {
	return {
		id: "day-1",
		title: "リリース",
		target: "2026-10-20",
		label: "あと11日",
		delta: 11,
		color: "#e58b3e",
		repeatLabel: null,
		reminderLabel: "通知 1日前 09:00",
		note: "準備を終える",
		onEdit: vi.fn(),
		...overrides,
	};
}

function model(overrides: Partial<CountdownsModel> = {}): CountdownsModel {
	return {
		featured: item(),
		upcoming: [item({ id: "day-2", title: "試験", label: "あと30日" })],
		past: [item({ id: "day-3", title: "終了日", label: "2日経過", delta: -2 })],
		onAdd: vi.fn(),
		...overrides,
	};
}

describe("Countdowns", () => {
	it("次に来る重要日と今後・経過済みを分けて表示する", () => {
		render(<Countdowns model={model()} />);
		expect(screen.getByLabelText("次に来る重要日")).toHaveTextContent("あと11日");
		expect(screen.getByText("この先の予定").parentElement).toHaveTextContent("試験");
		expect(screen.getByText("経過した重要日 1件")).toBeInTheDocument();
		expect(screen.getByText("終了日")).not.toBeVisible();
	});

	it("追加と各項目の編集をモデルへ伝える", () => {
		const value = model({ past: [] });
		render(<Countdowns model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "重要日を追加" }));
		fireEvent.click(screen.getByRole("button", { name: "リリースを編集" }));
		fireEvent.click(screen.getByRole("button", { name: "試験を編集" }));
		expect(value.onAdd).toHaveBeenCalledOnce();
		expect(value.featured?.onEdit).toHaveBeenCalledOnce();
		expect(value.upcoming[0].onEdit).toHaveBeenCalledOnce();
	});

	it("繰り返し、通知、メモを表示する", () => {
		render(
			<Countdowns
				model={model({
					featured: null,
					upcoming: [item({ repeatLabel: "繰り返し 毎年" })],
					past: [],
				})}
			/>,
		);
		expect(screen.getByText("繰り返し 毎年")).toBeInTheDocument();
		expect(screen.getByText("通知 1日前 09:00")).toBeInTheDocument();
		expect(screen.getByText("準備を終える")).toBeInTheDocument();
	});

	it("重要日がない空状態を示す", () => {
		render(<Countdowns model={model({ featured: null, upcoming: [], past: [] })} />);
		expect(screen.getByText("大切な日を記録する")).toBeInTheDocument();
	});
});
