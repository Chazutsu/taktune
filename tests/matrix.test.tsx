import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	Matrix,
	type MatrixModel,
	type MatrixQuadrantModel,
	type MatrixTaskModel,
} from "../src/ui/matrix";

function task(overrides: Partial<MatrixTaskModel> = {}): MatrixTaskModel {
	const title = document.createElement("div");
	title.innerHTML = '<p>設計を確認する <a href="https://example.com">資料</a></p>';
	return {
		key: "task-1",
		plainTitle: "設計を確認する",
		title,
		list: "開発",
		dueLabel: "今日",
		priorityLabel: "高優先度",
		dragPayload: '{"path":"TODO.md","line":1}',
		quadrantId: "do",
		onEdit: vi.fn(),
		onMove: vi.fn(),
		...overrides,
	};
}

function quadrant(overrides: Partial<MatrixQuadrantModel> = {}): MatrixQuadrantModel {
	return {
		id: "do",
		label: "重要・緊急",
		action: "今すぐやる",
		tone: "do",
		tasks: [task()],
		onDrop: vi.fn(),
		...overrides,
	};
}

function model(): MatrixModel {
	return {
		quadrants: [
			quadrant(),
			quadrant({
				id: "plan",
				label: "重要・緊急ではない",
				action: "予定に入れる",
				tone: "plan",
				tasks: [],
			}),
			quadrant({
				id: "delegate",
				label: "重要ではない・緊急",
				action: "委任する",
				tone: "delegate",
				tasks: [],
			}),
			quadrant({
				id: "drop",
				label: "重要でも緊急でもない",
				action: "減らす",
				tone: "drop",
				tasks: [],
			}),
		],
	};
}

describe("Matrix", () => {
	it("4象限とMarkdownリンク、タスク情報を表示する", () => {
		render(<Matrix model={model()} />);
		expect(screen.getAllByRole("region")).toHaveLength(4);
		expect(screen.getByRole("link", { name: "資料" })).toHaveAttribute(
			"href",
			"https://example.com",
		);
		expect(screen.getByText("高優先度")).toBeInTheDocument();
		expect(screen.getByLabelText("重要・緊急ではない")).toHaveTextContent("ここへドロップ");
	});

	it("ドラッグしたタスクを対象象限へ渡す", () => {
		const value = model();
		const data = new Map<string, string>();
		const dataTransfer = {
			effectAllowed: "none",
			dropEffect: "none",
			types: ["application/x-ttd-task"],
			setData: (type: string, payload: string) => data.set(type, payload),
			getData: (type: string) => data.get(type) || "",
		};
		render(<Matrix model={value} />);
		fireEvent.dragStart(screen.getByText("設計を確認する").closest("article")!, { dataTransfer });
		fireEvent.dragOver(screen.getByLabelText("重要・緊急ではない"), { dataTransfer });
		fireEvent.drop(screen.getByLabelText("重要・緊急ではない"), { dataTransfer });
		expect(value.quadrants[1].onDrop).toHaveBeenCalledWith('{"path":"TODO.md","line":1}');
	});

	it("選択操作でも象限を変更でき、編集を開ける", () => {
		const value = model();
		const current = value.quadrants[0].tasks[0];
		render(<Matrix model={value} />);
		fireEvent.change(screen.getByLabelText("設計を確認するの象限"), { target: { value: "plan" } });
		fireEvent.click(screen.getByRole("button", { name: "設計を確認するを編集" }));
		expect(current.onMove).toHaveBeenCalledWith("plan");
		expect(current.onEdit).toHaveBeenCalledOnce();
		expect(screen.getByLabelText("設計を確認するの象限")).toHaveClass("h-8", "max-[720px]:h-11");
		expect(screen.getByLabelText("設計を確認するの象限").closest("label")).not.toHaveClass(
			"hidden",
		);
	});

	it("象限移動でカードが再マウントされても同じタスクの選択操作へfocusを戻す", async () => {
		const value = model();
		const moved = task({ quadrantId: "plan" });
		const onMove = value.quadrants[0].tasks[0].onMove;
		const view = render(<Matrix model={value} />);
		vi.mocked(onMove).mockImplementation(() => {
			view.rerender(
				<Matrix
					model={{
						quadrants: [
							{ ...value.quadrants[0], tasks: [] },
							{ ...value.quadrants[1], tasks: [moved] },
							...value.quadrants.slice(2),
						],
					}}
				/>,
			);
		});
		fireEvent.change(screen.getByLabelText("設計を確認するの象限"), { target: { value: "plan" } });
		await waitFor(() => expect(screen.getByLabelText("設計を確認するの象限")).toHaveFocus());
	});

	it("同じtask keyのMatrixが複数あっても操作したinstanceへfocusを戻す", async () => {
		const first = model();
		const second = model();
		const secondMove = second.quadrants[0].tasks[0].onMove;
		const view = render(
			<>
				<Matrix model={first} />
				<Matrix model={second} />
			</>,
		);
		vi.mocked(secondMove).mockImplementation(() => {
			view.rerender(
				<>
					<Matrix model={first} />
					<Matrix
						model={{
							quadrants: [
								{ ...second.quadrants[0], tasks: [] },
								{
									...second.quadrants[1],
									tasks: [task({ quadrantId: "plan" })],
								},
								...second.quadrants.slice(2),
							],
						}}
					/>
				</>,
			);
		});
		const controls = screen.getAllByLabelText("設計を確認するの象限");
		fireEvent.change(controls[1], { target: { value: "plan" } });
		await waitFor(() => {
			const movedControls = screen.getAllByLabelText("設計を確認するの象限");
			expect(movedControls[1]).toHaveFocus();
			expect(movedControls[0]).not.toHaveFocus();
		});
	});

	it("空のリスト名をローカライズされたInboxとして表示する", () => {
		const value = model();
		value.quadrants[0].tasks[0] = task({ list: "" });
		render(<Matrix model={value} />);
		expect(screen.getByText("受信箱")).toBeInTheDocument();
	});

	it("モバイルでは空象限を要約へ畳み、必要な時だけ内容を展開する", () => {
		render(<Matrix model={model()} />);
		const emptyToggle = screen.getByRole("button", { name: /重要・緊急ではない/ });
		const populatedToggle = screen.getByRole("button", { name: /重要・緊急 今すぐやる/ });
		expect(emptyToggle).toHaveAttribute("aria-expanded", "false");
		expect(emptyToggle).toHaveClass("min-h-12");
		expect(populatedToggle).toHaveAttribute("aria-expanded", "true");
		const content = document.getElementById(emptyToggle.getAttribute("aria-controls")!);
		expect(content).toHaveClass("hidden", "min-[721px]:grid");

		fireEvent.click(emptyToggle);
		expect(emptyToggle).toHaveAttribute("aria-expanded", "true");
		expect(content).toHaveClass("grid");
	});
});
