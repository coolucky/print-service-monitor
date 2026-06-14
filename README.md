# Print Service Monitoring System

一个基于 Node.js 的企业级打印服务监控系统，提供实时打印机状态监控、墨粉余量追踪、报表生成和系统快照管理功能。

## 功能特性

### 核心功能
- **多打印机实时监控** — 通过 SNMP 协议、Web 抓取和 OCR 技术获取打印机墨粉余量和在线状态
- **打印服务器监控** — 实时监控 PaperCut 等打印服务器的运行状态，记录宕机/恢复事件
- **可视化仪表盘** — 墨粉余量进度条、打印机在线/离线状态、24小时时间线展示
- **报表系统** — 支持多模板样式生成打印机状态报告，可导出为 HTML/Markdown
- **系统快照** — 一键备份/恢复系统设置、用户数据、打印机配置
- **用户管理与认证** — 支持多角色（管理员/编辑者），JWT Token 认证，忘记密码邮件重置
- **邮件通知** — SMTP 邮件配置，支持报表定时发送、碳粉低量告警
- **许可证管理** — 内置许可证到期日期管理
- **深色/浅色主题** — 支持主题切换，自动跟随系统偏好
- **响应式设计** — 基于 Material-UI (MUI) 构建，适配桌面和移动端

### 数据采集方式
| 方式 | 说明 | 可靠性 |
|------|------|--------|
| Web Scrape | 从打印机 Web 管理界面直接抓取数据 | 高 |
| HTTP API | 通过打印服务器 API 获取数据 | 中高 |
| SNMP | 通过 SNMP 协议读取打印机 MIB 信息 | 中 |
| Screenshot OCR | 截图 + OCR 文字识别（Tesseract.js） | 中 |

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Node.js + Express 5.x |
| **前端** | React 18 + Material-UI (MUI) + Emotion |
| **认证** | JWT (JSON Web Token) + bcryptjs |
| **数据采集** | net-snmp, cheerio, puppeteer, tesseract.js |
| **邮件** | nodemailer |
| **日期处理** | date-fns |
| **数据存储** | JSON 文件存储（轻量级，无需数据库） |

## 项目结构

```
Print service monitoring system/
├── frontend-server.js          # 前端静态文件服务器（含 API 代理）
├── settings.json               # 系统设置（邮箱、许可证等）
├── users.json                  # 用户数据
├── printers-data.json          # 打印机配置
├── printer-history.json        # 打印机历史记录
├── dist/                       # 前端构建产物（Vite）
│   ├── index.html
│   └── assets/
├── backend/
│   ├── server.js               # 后端主入口
│   ├── package.json            # 后端依赖
│   ├── printerScraper.js       # 打印机数据爬取
│   ├── config/                 # 配置文件
│   │   ├── routeConfig.js
│   │   ├── printers.json
│   │   ├── printServers.json
│   │   ├── alertConfig.json
│   │   └── settings.json
│   ├── routes/                 # API 路由
│   │   ├── index.js            # 主路由聚合
│   │   ├── auth.js             # 认证路由
│   │   ├── printers.js         # 打印机管理
│   │   ├── printServers.js     # 打印服务器管理
│   │   ├── settings.js         # 系统设置
│   │   ├── reports.js          # 报表生成
│   │   ├── snapshots.js        # 系统快照
│   │   ├── alerts.js           # 告警管理
│   │   ├── users.js            # 用户管理
│   │   ├── health.js           # 健康检查
│   │   └── update.js           # 软件更新
│   ├── services/               # 业务服务层
│   │   ├── printerService.js
│   │   ├── printServerMonitoringService.js
│   │   ├── snmpService.js
│   │   ├── screenshotOcrService.js
│   │   ├── emailService.js
│   │   ├── alertService.js
│   │   ├── settingsService.js
│   │   ├── snapshotService.js
│   │   ├── userService.js
│   │   └── serverMonitoringService.js
│   ├── middleware/             # 中间件
│   │   ├── authMiddleware.js   # JWT 认证
│   │   ├── validation.js       # 输入校验
│   │   └── responseFormatter.js # 响应格式化
│   └── utils/
│       └── jwtUtils.js         # JWT 工具
└── snapshots/                  # 系统快照存储
```

## 快速开始

### 环境要求
- **Node.js** >= 18.x（推荐 20.x LTS）
- **Windows** / Linux / macOS
- 无需数据库（JSON 文件存储）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/coolucky/print-service-monitor.git
cd print-service-monitor

# 2. 安装后端依赖
cd backend && npm install && cd ..

# 3. 启动后端服务（端口 3001）
cd backend && node server.js &

# 4. 启动前端服务（端口 5175）
node frontend-server.js
```

### 访问系统
- 前端地址：`http://localhost:5175`
- 后端 API：`http://localhost:3001/api`
- 默认管理员账号：`admin` / `admin123`

## API 接口概览

### 公开接口（无需认证）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/license-days` | 许可证剩余天数 |
| GET | `/api/status/printers` | 打印机状态列表 |
| GET | `/api/status/print-servers` | 打印服务器状态 |
| GET | `/api/status/print-servers/timeline` | 打印服务器时间线 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/forgot-password` | 忘记密码 |

### 受保护接口（需要 JWT Token）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/printers` | 打印机 CRUD |
| GET/POST | `/api/settings` | 系统设置读写 |
| POST | `/api/reports/generate` | 生成报表 |
| GET/POST/DELETE | `/api/snapshots` | 系统快照管理 |
| GET/POST | `/api/users` | 用户管理 |
| GET/POST | `/api/alerts` | 告警配置 |
| GET/POST | `/api/print-servers` | 打印服务器管理 |

## 配置说明

### settings.json
```json
{
  "email": {
    "smtpServer": "SMTP 服务器地址",
    "smtpPort": "25",
    "smtpUser": "用户名",
    "smtpPass": "密码"
  },
  "license": {
    "expirationDate": "许可证到期日期 (YYYY-MM-DD)"
  },
  "emailContacts": {
    "senders": ["发件人列表"],
    "recipients": ["收件人列表"],
    "ccRecipients": ["抄送人列表"]
  },
  "reportSettings": {
    "weeklySchedule": {
      "enabled": true,
      "dayOfWeek": 5,
      "hour": 17,
      "minute": 30
    }
  }
}
```

## 许可证

本项目为内部使用工具，未指定开源许可证。

---

**Author:** coolucky | **Repository:** [print-service-monitor](https://github.com/coolucky/print-service-monitor)