import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from "react";

export type ButtonTone = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "compact" | "default" | "touch";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	size?: ButtonSize;
	tone?: ButtonTone;
}

const BASE =
	"inline-flex shrink-0 items-center justify-center rounded-ttd-control border font-medium shadow-none transition-[color,background-color,border-color,transform] duration-[var(--ttd-motion-fast)] ease-[var(--ttd-ease)] active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50";
const TONES: Record<ButtonTone, string> = {
	default:
		"border-ttd-border bg-ttd-surface text-ttd-text hover:border-ttd-muted hover:bg-ttd-hover",
	primary: "border-ttd-accent bg-ttd-accent text-ttd-on-accent hover:opacity-90",
	ghost: "border-transparent bg-transparent text-ttd-muted hover:bg-ttd-hover hover:text-ttd-text",
	danger: "border-ttd-danger bg-transparent text-ttd-danger hover:bg-ttd-danger-soft",
};
const SIZES: Record<ButtonSize, string> = {
	compact: "min-h-8 px-2.5 text-[11px]",
	default: "min-h-9 px-3 text-xs",
	touch: "min-h-11 px-3 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ className = "", size = "default", tone = "default", type = "button", ...props },
	ref,
): ReactElement {
	return (
		<button
			ref={ref}
			type={type}
			className={`${BASE} ${TONES[tone]} ${SIZES[size]} ${className}`}
			{...props}
		/>
	);
});
