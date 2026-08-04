import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

/** Shared modal shell: backdrop, title bar with a close button, and a
 * scrollable body. Closes on Escape or a backdrop click; clicks inside the
 * content don't propagate to the backdrop. Rendered via a portal straight
 * onto `document.body` — some pages animate their root wrapper on mount
 * (`.pageWrap`'s `driftUp`), and any ancestor with a non-`none` transform
 * (even one left behind by a finished animation with `fill-mode: both`)
 * would otherwise trap this `position: fixed` backdrop inside its box
 * instead of the viewport. */
export default function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.btnClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
