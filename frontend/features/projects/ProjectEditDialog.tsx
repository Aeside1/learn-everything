"use client";

import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Modal,
  NumberField,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { X } from "lucide-react";
import { useState } from "react";

import type { Project, ProjectUpdate } from "../../lib/api";

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
    <Modal.Backdrop
      variant="blur"
      isOpen
      isDismissable={!saving}
      isKeyboardDismissDisabled={saving}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog className="max-w-xl">
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSave({ title, topic, background, goal, weekly_hours: weeklyHours });
            }}
          >
            <Modal.Header>
              <p className="eyebrow">PROJECT SETTINGS</p>
              <Modal.Heading slot="title">编辑学习项目</Modal.Heading>
            </Modal.Header>
            <Modal.CloseTrigger aria-label="关闭" isDisabled={saving}>
              <X size={18} aria-hidden="true" />
            </Modal.CloseTrigger>

            <Modal.Body className="flex flex-col gap-4">
              <p className="text-xs leading-relaxed text-muted">
                修改主题不会重新生成当前学习路线；需要变更路线时，请新建学习路线。
              </p>

              <TextField value={title} onChange={setTitle} isRequired maxLength={300} isDisabled={saving}>
                <Label>项目名称</Label>
                <Input />
                <FieldError>请填写项目名称。</FieldError>
              </TextField>

              <TextField value={topic} onChange={setTopic} isRequired maxLength={300} isDisabled={saving}>
                <Label>学习主题</Label>
                <Input />
                <FieldError>请填写学习主题。</FieldError>
              </TextField>

              <TextField value={background} onChange={setBackground} maxLength={4000} isDisabled={saving}>
                <Label>学习背景</Label>
                <TextArea rows={3} />
              </TextField>

              <TextField value={goal} onChange={setGoal} maxLength={4000} isDisabled={saving}>
                <Label>学习目标</Label>
                <TextArea rows={3} />
              </TextField>

              <NumberField
                value={weeklyHours}
                onChange={setWeeklyHours}
                isRequired
                minValue={1}
                maxValue={168}
                isDisabled={saving}
                className="max-w-56"
              >
                <Label>每周投入时间</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
                <Description>1 到 168 小时。</Description>
                <FieldError>每周投入时间需要在 1 到 168 小时之间。</FieldError>
              </NumberField>

              {error && (
                <p className="text-sm font-medium text-danger" role="alert">
                  {error}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button type="button" variant="secondary" onClick={onClose} isDisabled={saving}>
                取消
              </Button>
              <Button type="submit" variant="primary" isDisabled={saving}>
                {saving && <Spinner size="sm" color="current" aria-hidden="true" />}
                保存修改
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
