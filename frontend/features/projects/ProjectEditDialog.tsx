"use client";

import {
  Button,
  Input,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  TextArea,
} from "@heroui/react";
import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import type { Project, ProjectUpdate } from "../../lib/api";

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

export function ProjectEditDialog({
  project,
  saving,
  error,
  onClose,
  onSave,
}: {
  project: Project;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: ProjectUpdate) => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [topic, setTopic] = useState(project.topic);
  const [background, setBackground] = useState(project.background);
  const [goal, setGoal] = useState(project.goal);
  const [weeklyHours, setWeeklyHours] = useState(project.weekly_hours);

  return (
    <ModalBackdrop variant="blur" isOpen onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        aria-labelledby="project-edit-title"
        className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ title, topic, background, goal, weekly_hours: weeklyHours });
          }}
          className="flex flex-col gap-5"
        >
          <ModalHeader className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase">PROJECT SETTINGS</p>
              <ModalHeading id="project-edit-title" slot="title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                编辑学习项目
              </ModalHeading>
            </div>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                size="sm"
                aria-label="关闭"
                onClick={onClose}
                isDisabled={saving}
              >
                <X size={18} />
              </Button>
            </ModalHeader>

            <p className="text-xs text-zinc-500 leading-relaxed">
              修改主题不会重新生成当前学习路线；需要变更路线时，请新建学习路线。
            </p>

            <ModalBody className="flex flex-col gap-4 p-0">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                项目名称
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={300}
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                学习主题
                <Input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  required
                  maxLength={300}
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                学习背景
                <TextArea
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                  maxLength={4000}
                  rows={3}
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                学习目标
                <TextArea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  maxLength={4000}
                  rows={3}
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                每周投入时间
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={weeklyHours.toString()}
                    onChange={(event) => setWeeklyHours(Number(event.target.value))}
                    required
                    disabled={saving}
                    className="w-28"
                  />
                  <span className="text-sm font-normal text-zinc-500">小时</span>
                </div>
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
                isDisabled={saving}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={saving}
              >
                {saving && <LoaderCircle className="animate-spin" size={16} />}
                保存修改
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </ModalBackdrop>
    );
  }

