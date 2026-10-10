"use client";

import { Label, ListBox, Select } from "@heroui/react";

export type SelectOption = { id: string; label: string };

export function SelectField({ label, value, options, onChange, isDisabled, placeholder = "请选择", className }: {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select
      className={className}
      fullWidth
      value={value || null}
      onChange={(key) => onChange(key === null ? "" : String(key))}
      isDisabled={isDisabled}
      placeholder={placeholder}
    >
      <Label>{label}</Label>
      <Select.Trigger className="w-full min-w-0">
        <Select.Value className="min-w-0 truncate" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-w-[calc(100vw-2rem)]">
        <ListBox items={options}>
          {(option) => (
            <ListBox.Item id={option.id} textValue={option.label}>
              <span className="min-w-0 whitespace-normal wrap-anywhere">{option.label}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
