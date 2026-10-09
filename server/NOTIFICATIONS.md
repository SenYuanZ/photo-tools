# 站内通知运行与验收

默认提醒只影响后续新建排单，省略 `reminders` 时继承服务者设置，`[]` 为明确关闭。公开预约和手工排单共用服务端默认值。

## 时间与运行

- 排单的日期和 HH:mm 作为北京时间（UTC+8）解释。现有 schedules.created_at 沿用业务库原有北京时间存储约定。
- notifications 的 DATETIME(3) 明确存储 UTC，实体 transformer 负责序列化与 dateStrings 反序列化，不依赖运行主机时区。
- 保持当前 mysql2 默认 local 连接时区和 dateStrings=true；不要单独替换连接时区选项。业务库原有 created_at 继续按北京时间字面值解释，数据库生成该字段的时区应保持 UTC+8。
- Nest 服务持续运行时，每分钟生成一次通知。10 分钟内补发，登记之前错过的提醒和已开始的排单跳过。
- 日志包含 generated、failed、durationMs；异常任务下一分钟自动重试。没有外部通知通道，不需要新增环境变量。
- 多实例通过锁定排单行、唯一索引去重。历史通知不会因恢复排单重复生成。
- 站内刷新最多额外延迟 60 秒；关闭网页仍生成通知，重新登录后查看。不会产生手机系统弹窗。

## 数据库与发布

新表 notifications，包括 UTC 时间快照、正文、已读和失效时间；不改原有提醒字段。表与排单没有级联删除外键，以保留历史记录。

索引：uq_notification_event(schedule_id, reminder_type, event_start_at) 唯一；idx_notification_inbox(user_id, created_at, id)；idx_notification_unread(user_id, read_at, invalidated_at)。

发布前备份现有数据库。当前项目 synchronize=true，先发布后端，确认建表及索引、检查日志，再发布前端。不要运行 db:init/reset。可执行 `SHOW CREATE TABLE notifications` 核对实际建表 SQL。回滚应用时保留该表，避免丢失通知历史和去重记录。

## 验证

单测：`npm test -- --runInBand`。独立数据库集成测试（需要 MySQL 用户具备建库权限）：

```powershell
$env:NOTIFICATIONS_MYSQL_E2E='1'
npm run test:e2e -- --runInBand --testPathPatterns=notifications
```

测试读取 .env.local/.env 的连接配置，只创建 photo_order_notification_test_ 加随机标识的独立测试库，结束后删除该测试库，绝不初始化、重置或 seed 业务数据库。默认未启用时集成测试跳过。

验收：设置默认 1 小时，登记距离开始稍多于 1 小时的排单，确认到点只有一条通知；首页角标递增，点击进入最新排单与客户详情并标记已读；改期、关闭提醒、暂存、完单、删除后旧提醒失效且不计未读。三主题与移动端/桌面均检查布局、错误、空列表和分页。

本次本地验证：app 格式、lint、39 项单测和构建通过；server lint、15 项单测、10 项隔离 MySQL/JWT e2e 和构建通过，包含 UTC 主机时区复测。e2e 核对真实建表 SQL、毫秒时间精度及唯一索引。界面使用正式 Vue 组件与临时数据检查三主题及 320/390/1280px，已清理验收脚本。尚未部署，实际业务账号从登记到定时通知的完整人工验收需在发布后执行。
