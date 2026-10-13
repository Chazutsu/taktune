import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Board, type BoardModel, type BoardTaskModel } from "../src/ui/board";

function task(overrides: Partial<BoardTaskModel> = {}): BoardTaskModel {
	const title = document.createElement("div");
	title.innerHTML = '<p>実装する <a href="https://example.com">仕様</a></p>';
	return {
		key: "1",
		plainTitle: "実装する",
		title,
		dragPayload: "payload",
		columnId: "todo",
		status: { label: "未着手", color: "#7693e8" },
		dueLabel: "今日",
		section: null,
		tags: [{ label: "開発", color: "#e58b3e" }],
		onEdit: vi.fn(),
		onMove: vi.fn(),
		...overrides,
	};
}

function model(): BoardModel {
	return {
		scope: "",
		scopes: [
			{ value: "", label: "すべてのリスト" },
			{ value: "__status__", label: "ステータス" },
		],
		canAddSection: true,
		onScopeChange: vi.fn(),
		onAddSection: vi.fn(),
		columns: [
			{
				id: "todo",
				label: "Inbox",
				tasks: [task()],
				manageable: false,
				onManage: vi.fn(),
				onDrop: vi.fn(),
			},
			{
				id: "doing",
				label: "開発",
				tasks: [],
				manageable: true,
				onManage: vi.fn(),
				onDrop: vi.fn(),
			},
		],
	};
}

describe("Board", () => {
	it("列、Markdownリンク、メタ情報を表示する", () => {
		render(<Board model={model()} />);
		expect(screen.getAllByRole("region")).toHaveLength(2);
		expect(screen.getByRole("link", { name: "仕様" })).toBeInTheDocument();
		expect(screen.getByText("#開発")).toBeInTheDocument();
	});
	it("基準・セクション・列管理をモデルへ伝える", () => {
		const value = model();
		render(<Board model={value} />);
		fireEvent.change(screen.getByLabelText("列の基準"), { target: { value: "__status__" } });
		fireEvent.click(screen.getByRole("button", { name: "セクション追加" }));
		fireEvent.click(screen.getByRole("button", { name: "開発を編集" }));
		expect(value.onScopeChange).toHaveBeenCalledWith("__status__");
		expect(value.onAddSection).toHaveBeenCalledOnce();
		expect(value.columns[1].onManage).toHaveBeenCalledOnce();
	});
	it("DnDとキーボードで到達できる移動操作を同じ列へ接続する", () => {
		const value = model();
		const data = new Map<string, string>();
		const dt = {
			effectAllowed: "none",
			dropEffect: "none",
			types: ["application/x-ttd-task"],
			setData: (k: string, v: string) => data.set(k, v),
			getData: (k: string) => data.get(k) || "",
		};
		render(<Board model={value} />);
		fireEvent.dragStart(screen.getByText("実装する").closest("article")!, { dataTransfer: dt });
		fireEvent.drop(screen.getByLabelText("開発"), { dataTransfer: dt });
		const move = screen.getByLabelText("実装するの移動先");
		move.focus();
		expect(move).toHaveFocus();
		expect(move).toHaveClass("h-8", "max-[620px]:h-11");
		fireEvent.change(move, { target: { value: "doing" } });
		expect(value.columns[1].onDrop).toHaveBeenCalledWith("payload");
		expect(value.columns[0].tasks[0].onMove).toHaveBeenCalledWith("doing");
	});
	it("列移動でカードが再マウントされても同じタスクの移動操作へfocusを戻す", async () => {
		const value = model();
		const moved = task({ columnId: "doing" });
		const onMove = value.columns[0].tasks[0].onMove;
		const view = render(<Board model={value} />);
		vi.mocked(onMove).mockImplementation(() => {
			view.rerender(
				<Board
					model={{
						...value,
						columns: [
							{ ...value.columns[0], tasks: [] },
							{ ...value.columns[1], tasks: [moved] },
						],
					}}
				/>,
			);
		});
		fireEvent.change(screen.getByLabelText("実装するの移動先"), { target: { value: "doing" } });
		await waitFor(() => expect(screen.getByLabelText("実装するの移動先")).toHaveFocus());
	});
	it("複数ペインでは操作元のBoard内へfocusを戻す", async () => {
		const left = model();
		const right = model();
		const rightMoved = task({ columnId: "doing" });
		let rerender = () => undefined;
		vi.mocked(right.columns[0].tasks[0].onMove).mockImplementation(() => rerender());
		const view = render(
			<>
				<Board model={left} />
				<Board model={right} />
			</>,
		);
		rerender = () =>
			view.rerender(
				<>
					<Board model={left} />
					<Board
						model={{
							...right,
							columns: [
								{ ...right.columns[0], tasks: [] },
								{ ...right.columns[1], tasks: [rightMoved] },
							],
						}}
					/>
				</>,
			);
		const controls = screen.getAllByLabelText("実装するの移動先");
		fireEvent.change(controls[1]!, { target: { value: "doing" } });
		await waitFor(() => expect(screen.getAllByLabelText("実装するの移動先")[1]).toHaveFocus());
	});
	it("メタ情報を11px以上、編集操作を32px・モバイル44px以上にする", () => {
		render(<Board model={model()} />);
		expect(screen.getByText("#開発").parentElement).toHaveClass("text-[11px]");
		expect(screen.getByRole("button", { name: "実装するを編集" })).toHaveClass(
			"size-8",
			"max-[620px]:size-11",
		);
		expect(screen.getByRole("button", { name: "開発を編集" })).toHaveClass(
			"size-8",
			"max-[620px]:size-11",
		);
	});
});
