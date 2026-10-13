import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/ui/i18n";
import { ViewOptionsMenu } from "../src/ui/view-options-menu";

describe("ViewOptionsMenu", () => {
	it("並び順とグループ化を単一メニューで変更しEscapeで戻る", () => {
		const onSortChange = vi.fn();
		const onGroupChange = vi.fn();
		render(
			<I18nProvider locale="ja">
				<ViewOptionsMenu
					model={{
						sortMode: "smart",
						groupMode: "auto",
						sortOptions: [
							{ value: "smart", label: "スマート順" },
							{ value: "due", label: "期限順" },
						],
						groupOptions: [
							{ value: "auto", label: "自動グループ" },
							{ value: "list", label: "リスト" },
						],
						onSortChange,
						onGroupChange,
					}}
				/>
			</I18nProvider>,
		);

		const trigger = screen.getByRole("button", { name: "表示" });
		fireEvent.click(trigger);
		expect(screen.getByRole("dialog", { name: "表示" })).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "並び順" })).toHaveFocus();
		fireEvent.change(screen.getByRole("combobox", { name: "並び順" }), {
			target: { value: "due" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "グループ化" }), {
			target: { value: "list" },
		});
		expect(onSortChange).toHaveBeenCalledWith("due");
		expect(onGroupChange).toHaveBeenCalledWith("list");
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("dialog", { name: "表示" })).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});
});
