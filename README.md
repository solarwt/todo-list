# Todo Reminder

一个基于 Next.js App Router 的待办提醒应用，定位为清爽、专业、适合日常使用的效率工具。

## 功能

- 创建带标题、备注、提醒时间和优先级的任务
- 使用 `localStorage` 保留本地任务数据
- 按全部、进行中、已逾期、已完成筛选任务
- 标记完成、删除任务，或将提醒推迟 10 分钟
- 到期后显示轻量 toast 提醒，并避免重复提醒同一任务

## 本地运行

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

开发服务器默认运行在 `http://localhost:3000`。
