"use client";
import { useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import {
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import { Modal } from "./modal";
import { Button } from "./button";

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  pending = false,
  returnFocusRef,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<OperationResult<unknown>>;
  onClose: () => void;
  pending?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageKey, setMessageKey] = useState("");
  const disabled = pending || submitting;
  async function confirm() {
    if (lock.current || pending) return;
    lock.current = true;
    setSubmitting(true);
    setMessageKey("");
    try {
      let result: OperationResult<unknown>;
      try {
        result = await onConfirm();
      } catch {
        result = failure("INTERNAL");
      }
      if (result.ok) onClose();
      else setMessageKey(result.error.messageKey);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  return (
    <Modal
      open
      title={title}
      description={description}
      onClose={onClose}
      dismissible={!disabled}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
    >
      {messageKey && (
        <p role="alert" className="mb-4">
          {t(messageKey)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          ref={cancelRef}
          variant="paper"
          disabled={disabled}
          onClick={onClose}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="pink"
          disabled={disabled}
          onClick={() => void confirm()}
        >
          {disabled ? t("pending") : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
