"use client";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  dismissible = true,
  initialFocusRef,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const fallbackFocus = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    initialFocusRef?.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const nextFocus = trigger?.isConnected ? trigger : fallbackFocus;
      nextFocus?.focus();
    };
  }, [open, initialFocusRef, returnFocusRef]);
  if (!open) return null;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-2 border-[var(--border)] bg-[var(--panel)] p-6 text-[var(--fg)] shadow-2xl backdrop:bg-black/60 sm:p-8"
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (!dismissible || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <h2 id={`${id}-title`} className="text-2xl font-extrabold">
        {title}
      </h2>
      {description && (
        <p id={`${id}-description`} className="mt-3 text-muted">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </dialog>
  );
}
