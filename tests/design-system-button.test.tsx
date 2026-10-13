import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../src/design-system/button";

describe("Design system Button", () => {
	it("toneとsizeを意味のあるトークンクラスへ変換する", () => {
		render(
			<Button tone="primary" size="touch">
				保存
			</Button>,
		);
		const button = screen.getByRole("button", { name: "保存" });
		expect(button).toHaveClass(
			"bg-ttd-accent",
			"text-ttd-on-accent",
			"min-h-11",
			"rounded-ttd-control",
		);
	});

	it("既定でsubmitせず、操作を伝える", () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>実行</Button>);
		const button = screen.getByRole("button", { name: "実行" });
		expect(button).toHaveAttribute("type", "button");
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledOnce();
	});
});
