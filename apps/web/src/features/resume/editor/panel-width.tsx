import type { KeyboardEvent, PointerEvent } from "react";
import { useDirection } from "@base-ui/react/direction-provider";
import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The editor panel's width: the divider between the panel and the page. The width lives in `--editor-panel`, so every
 * layout that reads it (the resume editor, the letter editor) follows it. It is remembered per browser.
 */
const STORAGE_KEY = "reactive-resume:editor-panel-width";

export const PANEL_WIDTH_DEFAULT = 400;
export const PANEL_WIDTH_MIN = 320;
export const PANEL_WIDTH_MAX = 720;

/** The panel never takes more than this share of the window: the page keeps a readable share beside it. */
const PANEL_WIDTH_MAX_SHARE = 0.6;

const clamp = (width: number) => Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, Math.round(width)));

/** The window's share caps the width too, so the panel cannot squeeze the page out of the window. */
const viewportMax = () => Math.max(PANEL_WIDTH_MIN, Math.floor(window.innerWidth * PANEL_WIDTH_MAX_SHARE));

const readStoredWidth = () => {
	if (typeof window === "undefined") return null;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) ? clamp(parsed) : null;
};

/** The web app prerenders its marketing pages, so effects that touch the document stay out of the server pass. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type EditorPanelWidth = {
	/** The panel's width in pixels. */
	width: number;
	/** Props for the divider: pointer drag, arrow keys, double click to reset. */
	handleProps: {
		role: "separator";
		"aria-orientation": "vertical";
		"aria-label": string;
		"aria-valuenow": number;
		"aria-valuemin": number;
		"aria-valuemax": number;
		tabIndex: number;
		onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
		onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
		onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
		onPointerCancel: () => void;
		onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
		onDoubleClick: () => void;
	};
	/** Back to the default width. */
	reset: () => void;
};

/**
 * The panel's width, kept in `--editor-panel` on the document root so every editor layout reads the same value. The
 * divider drags it, the arrow keys nudge it, a double click restores the default, and the browser remembers it.
 */
export function useEditorPanelWidth(): EditorPanelWidth {
	const [width, setWidth] = useState(() => readStoredWidth() ?? PANEL_WIDTH_DEFAULT);
	const drag = useRef<{ startX: number; startWidth: number } | null>(null);
	const rtl = useDirection() === "rtl";

	const commit = useCallback((next: number) => {
		const clamped = Math.min(viewportMax(), clamp(next));
		setWidth(clamped);
		window.localStorage.setItem(STORAGE_KEY, String(clamped));
	}, []);

	// The root carries the width, so the letter editor and the assistant's grid read it too. A layout effect keeps the
	// first paint from showing the default width for a frame.
	useIsomorphicLayoutEffect(() => {
		document.documentElement.style.setProperty("--editor-panel", `${width}px`);
	}, [width]);

	// A narrower window narrows the panel with it, so the page keeps its share.
	useEffect(() => {
		const onResize = () => {
			const max = viewportMax();
			setWidth((current) => (current > max ? max : current));
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const onPointerDown = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			event.currentTarget.setPointerCapture(event.pointerId);
			drag.current = { startX: event.clientX, startWidth: width };
			// A drag across the panel would otherwise select its text.
			document.body.style.userSelect = "none";
		},
		[width],
	);

	const onPointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const start = drag.current;
			if (!start) return;
			const delta = (event.clientX - start.startX) * (rtl ? -1 : 1);
			setWidth(Math.min(viewportMax(), clamp(start.startWidth + delta)));
		},
		[rtl],
	);

	const onPointerUp = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const start = drag.current;
			if (!start) return;
			drag.current = null;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
			document.body.style.userSelect = "";
			const delta = (event.clientX - start.startX) * (rtl ? -1 : 1);
			commit(start.startWidth + delta);
		},
		[commit, rtl],
	);

	const onPointerCancel = useCallback(() => {
		drag.current = null;
		document.body.style.userSelect = "";
	}, []);

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const step = event.shiftKey ? 48 : 16;
			// The panel grows towards the inline end, so in a right-to-left layout the left arrow widens it.
			if (event.key === "ArrowLeft") {
				commit(width + (rtl ? step : -step));
				event.preventDefault();
			} else if (event.key === "ArrowRight") {
				commit(width + (rtl ? -step : step));
				event.preventDefault();
			} else if (event.key === "Home") {
				commit(PANEL_WIDTH_MIN);
				event.preventDefault();
			} else if (event.key === "End") {
				commit(PANEL_WIDTH_MAX);
				event.preventDefault();
			}
		},
		[commit, rtl, width],
	);

	const reset = useCallback(() => commit(PANEL_WIDTH_DEFAULT), [commit]);

	return {
		width,
		handleProps: {
			role: "separator",
			"aria-orientation": "vertical",
			"aria-label": t`Resize the editing panel`,
			"aria-valuenow": width,
			"aria-valuemin": PANEL_WIDTH_MIN,
			"aria-valuemax": PANEL_WIDTH_MAX,
			tabIndex: 0,
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel,
			onKeyDown,
			onDoubleClick: reset,
		},
		reset,
	};
}

type PanelResizeHandleProps = {
	/** The divider's props from `useEditorPanelWidth`. */
	handleProps: EditorPanelWidth["handleProps"];
};

/**
 * The grab handle on the panel's edge. It sits on the divider itself, over the page's side so it never covers the
 * panel's scrollbar, and dragging it slides the panel's edge with the pointer. `touch-none` keeps a drag from scrolling
 * the page on touch screens.
 */
export function PanelResizeHandle({ handleProps }: PanelResizeHandleProps) {
	return (
		<div
			{...handleProps}
			className="group absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none outline-none select-none"
			style={{ insetInlineStart: "var(--editor-panel)" }}
		>
			<span className="group-hover:bg-primary group-focus-visible:bg-primary absolute inset-y-0 start-0 w-px bg-transparent transition-colors" />
		</div>
	);
}
