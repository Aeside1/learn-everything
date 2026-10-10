"use client";

import { Button, FieldError, Input, Label, Modal, Spinner, TextField } from "@heroui/react";
import { X } from "lucide-react";
import { useState } from "react";

import type { ProjectSummary } from "../../lib/api";

export function ProjectDeletionDialog({
  project,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  project: ProjectSummary;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");

  return (
    <Modal.Backdrop
      variant="blur"
      isOpen
      isDismissable={!deleting}
      isKeyboardDismissDisabled={deleting}
      onOpenChange={(open) => {
        if (!open && !deleting) onClose();
      }}
    >
      <Modal.Container size="md" placement="center">
        <Modal.Dialog className="max-w-lg">
          <div className="flex flex-col gap-5">
            <Modal.Header>
              <p className="eyebrow text-danger">DELETE PROJECT</p>
              <Modal.Heading slot="title">删除“{project.title}”</Modal.Heading>
            </Modal.Header>
            <Modal.CloseTrigger aria-label="关闭" isDisabled={deleting}>
              <X size={18} aria-hidden="true" />
            </Modal.CloseTrigger>

            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-muted">
                这会永久删除该项目的路线、知识点、学习笔记、参考资料、卡片、复习记录、测验和进度记录。
              </p>

              <TextField value={confirmation} onChange={setConfirmation} isDisabled={deleting} isRequired>
                <Label>
                  输入 <strong className="font-mono text-danger">DELETE</strong> 确认
                </Label>
                <Input autoComplete="off" className="font-mono" />
                <FieldError>请输入 DELETE。</FieldError>
              </TextField>

              {error && (
                <p className="text-sm font-medium text-danger" role="alert">
                  {error}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button type="button" variant="secondary" onClick={onClose} isDisabled={deleting}>
                取消
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onConfirm}
                isDisabled={confirmation !== "DELETE" || deleting}
              >
                {deleting && <Spinner size="sm" color="current" aria-hidden="true" />}
                永久删除
              </Button>
            </Modal.Footer>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
