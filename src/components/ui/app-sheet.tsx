"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { X } from "lucide-react";

// One dialog for the whole app:
//  • tablet/laptop (≥768px): medium dialog in the middle, rises from below.
//  • phone: bottom sheet; drag the handle up to go full screen, down to shrink/close; tap the handle to toggle.
// Rendered in a portal so nested sheets are never positioned inside an animated (transformed) parent.

export type SheetSize = "sm" | "md" | "lg" | "xl";
const WIDTH: Record<SheetSize, string> = { sm: "max-w-[440px]", md: "max-w-[560px]", lg: "max-w-[760px]", xl: "max-w-[960px]" };

export interface AppSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Replaces the default title bar (e.g. a hero image with its own close button). Also the drag area on phones. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: SheetSize;
  /** Wrap the panel in a <form> (footer submit buttons then work). */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  ariaLabel?: string;
  bodyClassName?: string;
  /** Close when the backdrop is clicked (default true). */
  dismissible?: boolean;
  /** The content has its own title & close button. */
  hideTitleBar?: boolean;
}

const DESKTOP_QUERY = "(min-width: 768px)";
const PEEK_RATIO = 0.72; // phone sheet opens at most at 72% of the screen
const TOP_GAP = 8; // px left above a full-screen sheet

function subscribe(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useIsDesktop() {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => true);
}

function useViewportHeight(active: boolean) {
  const [vh, setVh] = React.useState(() => (typeof window === "undefined" ? 800 : window.visualViewport?.height ?? window.innerHeight));
  React.useEffect(() => {
    if (!active) return;
    const update = () => setVh(window.visualViewport?.height ?? window.innerHeight);
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);
  return vh;
}

// Only the topmost sheet reacts to Escape; the page behind stops scrolling while any sheet is open.
const stack: string[] = [];
function useSheetStack(open: boolean, onClose: () => void) {
  const id = React.useId();
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    if (!open) return;
    stack.push(id);
    if (stack.length === 1) document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stack[stack.length - 1] === id && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.documentElement.style.overflow = "";
    };
  }, [open, id]);
}

export function AppSheet(props: AppSheetProps) {
  const { open, onClose } = props;
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const desktop = useIsDesktop();
  useSheetStack(open, onClose);
  // keep showing the last content while the exit animation runs (callers often clear their data on close)
  const last = React.useRef(props);
  if (open) last.current = props;
  if (!mounted) return null;
  const shown = { ...last.current, open, onClose };
  return createPortal(
    <div data-app-sheet-root="">
      <AnimatePresence>{open && (desktop ? <DesktopDialog key="d" {...shown} /> : <MobileSheet key="m" {...shown} />)}</AnimatePresence>
    </div>,
    document.body
  );
}

function Backdrop({ onClose, dismissible = true }: { onClose: () => void; dismissible?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={dismissible ? onClose : undefined}
      className="app-sheet-backdrop fixed inset-0 bg-black/60 backdrop-blur-[2px]"
    />
  );
}

function TitleBar({ title, onClose, mobile }: { title?: React.ReactNode; onClose: () => void; mobile?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-4 ${mobile ? "pb-2" : "py-3"} border-b border-neutral-100 dark:border-neutral-800`}>
      <div className="text-sm font-extrabold min-w-0 truncate">{title}</div>
      <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0" aria-label="Tutup">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Panel({ onSubmit, className, children }: { onSubmit?: AppSheetProps["onSubmit"]; className: string; children: React.ReactNode }) {
  return onSubmit ? (
    <form onSubmit={onSubmit} className={className}>
      {children}
    </form>
  ) : (
    <div className={className}>{children}</div>
  );
}

function DesktopDialog({ onClose, title, header, footer, children, size = "md", onSubmit, ariaLabel, bodyClassName = "", dismissible, hideTitleBar }: AppSheetProps) {
  return (
    <div className="app-sheet-layer fixed inset-0 z-50">
      <Backdrop onClose={onClose} dismissible={dismissible} />
      <div className="app-sheet-layer absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 64, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 64, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
          className={`app-sheet-panel pointer-events-auto w-full ${WIDTH[size]} max-h-[min(88vh,900px)] rounded-3xl bg-white dark:bg-[#0F1A13] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden`}
        >
          <Panel onSubmit={onSubmit} className="app-sheet-panel flex flex-col max-h-[min(88vh,900px)]">
            {(header || !hideTitleBar) && <div className="shrink-0">{header ?? <TitleBar title={title} onClose={onClose} />}</div>}
            <div className={`app-sheet-body flex-1 min-h-0 overflow-y-auto overscroll-contain app-scroll ${bodyClassName}`}>{children}</div>
            {footer && <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-3">{footer}</div>}
          </Panel>
        </motion.div>
      </div>
    </div>
  );
}

function MobileSheet({ onClose, title, header, footer, children, onSubmit, ariaLabel, bodyClassName = "", dismissible, hideTitleBar }: AppSheetProps) {
  const vh = useViewportHeight(true);
  const fullH = vh - TOP_GAP;
  const [full, setFull] = React.useState(false);
  const [natural, setNatural] = React.useState(0);
  const height = useMotionValue(0);
  const dragging = React.useRef(false);
  const topRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const footRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // natural height = header + content + footer, so short sheets stay short
  React.useLayoutEffect(() => {
    const measure = () => setNatural((topRef.current?.offsetHeight ?? 0) + (contentRef.current?.offsetHeight ?? 0) + (footRef.current?.offsetHeight ?? 0));
    measure();
    const ro = new ResizeObserver(measure);
    [topRef.current, contentRef.current, footRef.current].forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, []);

  const peekH = Math.max(160, Math.min(natural || vh * PEEK_RATIO, vh * PEEK_RATIO));
  const target = full ? fullH : peekH;
  const first = React.useRef(true);
  React.useEffect(() => {
    if (dragging.current || !natural) return;
    if (first.current) {
      height.set(target);
      first.current = false;
    } else animate(height, target, { type: "spring", damping: 32, stiffness: 320 });
  }, [target, natural, height]);

  // drag the handle / header
  const drag = React.useRef({ y: 0, h: 0, lastY: 0, lastT: 0, v: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, label")) return;
    dragging.current = true;
    drag.current = { y: e.clientY, h: height.get(), lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const d = drag.current;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt; // px/ms, + = downward
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    height.set(Math.min(fullH, Math.max(0, d.h - dy)));
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const d = drag.current;
    if (!d.moved) {
      setFull((f) => !f); // tap on the handle toggles full screen
      return;
    }
    const h = height.get();
    if (d.v > 0.9 || h < peekH * 0.55) {
      if (full && h > peekH * 0.55 && d.v <= 1.6) {
        setFull(false);
        animate(height, peekH, { type: "spring", damping: 32, stiffness: 320 });
      } else onClose();
      return;
    }
    const goFull = d.v < -0.5 || h > (peekH + fullH) / 2;
    setFull(goFull);
    animate(height, goFull ? fullH : peekH, { type: "spring", damping: 32, stiffness: 320 });
  };

  return (
    <div className="app-sheet-layer fixed inset-0 z-50">
      <Backdrop onClose={onClose} dismissible={dismissible} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{ height: natural ? height : undefined, maxHeight: fullH }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        className={`app-sheet-panel absolute inset-x-0 bottom-0 bg-white dark:bg-[#0F1A13] shadow-2xl overflow-hidden ${full ? "rounded-t-2xl" : "rounded-t-3xl"}`}
      >
        <Panel onSubmit={onSubmit} className="app-sheet-panel h-full flex flex-col">
          <div ref={topRef} className="shrink-0 touch-none select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <div className="app-sheet-handle flex justify-center pt-2 pb-1.5 cursor-grab active:cursor-grabbing" aria-label={full ? "Geser ke bawah untuk mengecilkan" : "Geser ke atas untuk layar penuh"}>
              <div className="w-11 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>
            {header ?? (hideTitleBar ? null : <TitleBar title={title} onClose={onClose} mobile />)}
          </div>
          <div className="app-sheet-body relative flex-1 min-h-0">
            <div ref={bodyRef} className={`app-sheet-body h-full overflow-y-auto overscroll-contain hide-native-scrollbar ${bodyClassName}`}>
              <div ref={contentRef}>{children}</div>
            </div>
            <ScrollIndicator target={bodyRef} />
          </div>
          {footer && (
            <div ref={footRef} className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
          {!footer && <div className="shrink-0 h-[env(safe-area-inset-bottom)]" />}
        </Panel>
      </motion.div>
    </div>
  );
}

// Always-visible vertical scroll bar for phones (iOS/Android hide native bars until you scroll).
function ScrollIndicator({ target }: { target: React.RefObject<HTMLDivElement | null> }) {
  const [bar, setBar] = React.useState<{ top: number; size: number } | null>(null);
  React.useEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => {
      const { scrollHeight, clientHeight, scrollTop } = el;
      if (scrollHeight <= clientHeight + 2) return setBar(null);
      const size = Math.max(10, (clientHeight / scrollHeight) * 100);
      setBar({ size, top: (scrollTop / (scrollHeight - clientHeight)) * (100 - size) });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [target]);
  if (!bar) return null;
  return (
    <div className="pointer-events-none absolute right-0.5 top-1 bottom-1 w-1" aria-hidden data-testid="sheet-scrollbar">
      <div className="absolute inset-x-0 rounded-full bg-slate-400/60 dark:bg-slate-500/60" style={{ top: `${bar.top}%`, height: `${bar.size}%` }} />
    </div>
  );
}
