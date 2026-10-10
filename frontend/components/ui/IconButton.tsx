"use client";

import { Button, Tooltip, type ButtonProps } from "@heroui/react";

export function IconButton({ label, children, ...props }: Omit<ButtonProps, "aria-label" | "isIconOnly"> & { label: string }) {
  return (
    <Tooltip delay={400}>
      <Button type="button" variant="ghost" size="sm" {...props} isIconOnly aria-label={label}>
        {children}
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}
