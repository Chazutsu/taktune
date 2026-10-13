import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusedPage } from "../src/ui/page-shell";

describe("FocusedPage", () => {
	it("外側の幅制御を尊重し、内側で中央寄せや再制限をしない", () => {
		const { container } = render(<FocusedPage className="custom-layout">本文</FocusedPage>);
		const shell = container.querySelector("[data-page-shell='focused']");

		expect(shell).toHaveClass("w-full", "min-w-0", "custom-layout");
		expect(shell).not.toHaveClass("mx-auto", "max-w-[1040px]", "max-w-[1080px]");
	});
});
