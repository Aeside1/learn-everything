"use client";

import {
  Button,
  Input,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
} from "@heroui/react";
import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import type { ProjectSummary } from "../../lib/api";

function ModalContent({
  children,
  className,
  "aria-labelledby": ariaLabelledby,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <ModalContainer>
      <ModalDialog className={className} aria-labelledby={ariaLabelledby}>
        {children}
      </ModalDialog>
    </ModalContainer>
  );
}

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
    <ModalBackdrop variant="blur" isOpen onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        aria-labelledby="project-delete-title"
        className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-950/50 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-5">
          <ModalHeader className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold tracking-wider text-rose-600 uppercase">DELETE PROJECT</p>
              <ModalHeading id="project-delete-title" slot="title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                删除“{project.title}”
              </ModalHeading>
            </div>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              size="sm"
              aria-label="关闭"
              onClick={onClose}
              isDisabled={deleting}
            >
              <X size={18} />
            </Button>
          </ModalHeader>

          <ModalBody className="flex flex-col gap-4 p-0">
            <p className="text-sm text-zinc-600 leading-relaxed dark:text-zinc-400">
              这会永久删除该项目的路线、知识点、学习笔记、参考资料、卡片、复习记录、测验和进度记录。
            </p>

            <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <span>
                输入 <strong className="text-rose-600 font-mono">DELETE</strong> 确认
              </span>
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                disabled={deleting}
                className="font-mono"
              />
            </label>

            {error && (
              <p className="text-sm text-rose-600 font-medium" role="alert">
                {error}
              </p>
            )}
          </ModalBody>

          <ModalFooter className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              isDisabled={deleting}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              isDisabled={confirmation !== "DELETE" || deleting}
            >
              {deleting && <LoaderCircle className="animate-spin" size={16} />}
              永久删除
            </Button>
          </ModalFooter>
        </div>
      </ModalContent>
    </ModalBackdrop>
  );
}

