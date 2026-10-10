| 场景 | 结果 | 截图 |
| --- | --- | --- |
| projects-workspace-and-dialogs | 通过 | 8 组双主题 + 2 张单主题（用户路径） |
| project-edit-save | 通过 | 2 组双主题截图 |
| project-delete-confirmation | 通过 | 3 组双主题截图 |
| workspace-loading-error-retry | 通过 | 3 组双主题截图 |
| theme-preference-roundtrip | 通过 | 3 组双主题截图 |
| layout-breakpoint-768-band | 通过 | 1 组双主题截图 |
| layout-breakpoint-900-band | 通过 | 1 组双主题截图 |
| tooltip-theme-consistency | 通过 | 1 组双主题截图 |
| rail-empty-and-error-states | 通过 | 2 组双主题截图 |

> 注意：5 张截图在弹窗打开时用受控 DOM 切换主题生成（projects-workspace-and-dialogs/project-edit-dialog, projects-workspace-and-dialogs/narrow-edit-dialog, project-edit-save/edit-dialog-draft, project-delete-confirmation/delete-dialog-disabled, project-delete-confirmation/delete-dialog-enabled），只能证明浮层随主题变色，不能作为“用户可在弹窗内切换主题”的证据。

> 注意：4 张截图声明不覆盖浮层主题一致性（projects-workspace-and-dialogs/after-dialog-close, layout-breakpoint-768-band/band-768-row-layout, rail-empty-and-error-states/rail-error-state, rail-empty-and-error-states/rail-empty-state），不得被引用为 Tooltip/弹窗/选择器浮层的主题证据。
