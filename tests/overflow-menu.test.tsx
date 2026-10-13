import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverflowMenu } from "../src/ui/overflow-menu";

describe("OverflowMenu", () => {
	it("uses menu semantics and supports Arrow, Home, End, Escape with focus restoration", async () => {
		render(
			<OverflowMenu
				label="その他"
				items={[
					{ label: "先頭", onSelect: vi.fn() },
					{ label: "無効", disabled: true, onSelect: vi.fn() },
					{ label: "末尾", onSelect: vi.fn() },
				]}
			/>,
		);
		const trigger = screen.getByRole("button", { name: "その他" });
		fireEvent.keyDown(trigger, { key: "ArrowDown" });
		const menu = await screen.findByRole("menu", { name: "その他" });
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "先頭" })).toHaveFocus());
		fireEvent.keyDown(menu, { key: "End" });
		expect(screen.getByRole("menuitem", { name: "末尾" })).toHaveFocus();
		fireEvent.keyDown(menu, { key: "ArrowDown" });
		expect(screen.getByRole("menuitem", { name: "先頭" })).toHaveFocus();
		fireEvent.keyDown(menu, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("closes after selection, outside click, and Tab", async () => {
		const onSelect = vi.fn();
		render(<OverflowMenu label="操作" items={[{ label: "編集", onSelect }]} />);
		const trigger = screen.getByRole("button", { name: "操作" });
		fireEvent.click(trigger);
		fireEvent.click(await screen.findByRole("menuitem", { name: "編集" }));
		expect(onSelect).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
		fireEvent.click(trigger);
		fireEvent.pointerDown(document.body);
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
		fireEvent.click(trigger);
		fireEvent.keyDown(await screen.findByRole("menu"), { key: "Tab" });
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
	});

	it("keeps the fixed menu inside the viewport and flips above near the bottom edge", async () => {
		Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
		const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
		rect.mockReturnValueOnce({
			bottom: 232,
			height: 32,
			left: 292,
			right: 324,
			top: 200,
			width: 32,
			x: 292,
			y: 200,
			toJSON: () => ({}),
		});
		rect.mockReturnValueOnce({
			bottom: 120,
			height: 120,
			left: 0,
			right: 180,
			top: 0,
			width: 180,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});
		render(<OverflowMenu label="端" items={[{ label: "項目", onSelect: vi.fn() }]} />);
		fireEvent.click(screen.getByRole("button", { name: "端" }));
		const menu = await screen.findByRole("menu");
		await waitFor(() =>
			expect(menu).toHaveStyle({ left: "132px", top: "76px", visibility: "visible" }),
		);
		rect.mockRestore();
	});

	it.each([
		["light", "rgb(250, 250, 250)", "rgb(20, 20, 20)"],
		["dark", "rgb(30, 30, 30)", "rgb(240, 240, 240)"],
	])("keeps %s theme tokens and focus styling in the portal", async (theme, background, text) => {
		const style = document.createElement("style");
		style.textContent = `
			.ttd-app { --ttd-color-canvas: ${background}; --ttd-color-text: ${text}; }
			.ttd-app[role="menu"] { background-color: var(--ttd-color-canvas); color: var(--ttd-color-text); }
			.ttd-app [role="menuitem"] { outline: 2px solid rgb(168, 93, 34); }
		`;
		document.head.append(style);
		document.body.className = `theme-${theme}`;
		render(<OverflowMenu label={`${theme} menu`} items={[{ label: "項目", onSelect: vi.fn() }]} />);
		fireEvent.click(screen.getByRole("button", { name: `${theme} menu` }));
		const menu = await screen.findByRole("menu");
		const item = screen.getByRole("menuitem");
		await waitFor(() => expect(item).toHaveFocus());
		expect(menu).toHaveClass("ttd-app");
		expect(getComputedStyle(menu).getPropertyValue("--ttd-color-canvas")).toBe(background);
		expect(getComputedStyle(menu).getPropertyValue("--ttd-color-text")).toBe(text);
		style.remove();
		document.body.className = "";
	});
});
