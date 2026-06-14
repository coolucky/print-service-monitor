# Windows Server 离线部署指南

## 概述

本指南用于将打印机状态报告服务部署到**无法连接互联网**的 Windows Server 上。

## 前提条件

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows Server 2016+ / Windows 10+ |
| Node.js | v18.x 或 v20.x LTS (x64) |
| 内存 | 最少 512MB 可用 |
| 磁盘 | 至少 500MB 可用空间 |
| 网络 | 能访问内网打印机和打印服务器 |

## 部署步骤

### 第一步：在开发机上打包（需要网络）

```bash
cd printer-status-report/deploy
chmod +x pack-offline.sh
./pack-offline.sh
```

这会生成 `deploy/printer-status-report-offline-YYYYMMDD.zip`。

### 第二步：准备 Node.js

如果目标服务器没有 Node.js：
1. 在有网络的机器上下载 Node.js **免安装版** (zip)：
   - https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip
2. 将 zip 文件放入部署包根目录，启动脚本会自动解压安装
3. 或者手动解压到部署目录下的 `nodejs/` 子目录

### 第三步：传输到目标服务器

通过 U盘、内网共享等方式将以下文件传输到 Windows Server：
- `printer-status-report-offline-YYYYMMDD.zip`
- `node-v20.x-win-x64.zip`（如服务器无 Node.js）

### 第四步：部署

1. 在 Windows Server 上解压 `printer-status-report-offline-YYYYMMDD.zip` 到目标目录，例如：
   ```
   C:\PrinterStatus\
   ```

2. 如需安装 Node.js，将 `node-v20.x-win-x64.zip` 放到 `C:\PrinterStatus\` 目录下

3. **以管理员身份**运行 `start-service.bat`：
   ```cmd
   cd C:\PrinterStatus
   start-service.bat
   ```

4. 自定义前端端口（可选）：
   ```cmd
   start-service.bat 8080
   ```

## 目录结构

```
C:\PrinterStatus\
├── start-service.bat      # 启动脚本
├── stop-service.bat       # 停止脚本
├── frontend-server.js     # 前端服务（自动生成）
├── dist/                  # 前端构建文件
├── backend/               # 后端服务
│   ├── server.js
│   ├── node_modules/      # 后端依赖（已预装）
│   ├── routes/
│   ├── services/
│   ├── config/
│   └── .env               # 环境配置（自动生成）
├── nodejs/                # Node.js 免安装版（可选）
├── logs/                  # 日志目录（自动创建）
│   ├── backend.log
│   └── frontend.log
├── settings.json          # 应用设置
├── users.json             # 用户数据
└── printers-data.json     # 打印机数据
```

## 端口说明

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| 前端 | 5175 | 可通过 `start-service.bat [端口]` 自定义 |
| 后端 | 3001 | 在 `start-service.bat` 中修改 `BACKEND_PORT` |

## 使用方法

### 启动服务
```cmd
:: 使用默认端口
start-service.bat

:: 自定义前端端口为 8080
start-service.bat 8080
```

### 停止服务
```cmd
stop-service.bat
```

### 访问服务
- 本机：`http://localhost:端口号`
- 内网其他电脑：`http://服务器IP:端口号`

## 开机自启动（可选）

### 方法一：任务计划程序
1. 打开"任务计划程序" (taskschd.msc)
2. 创建基本任务，名称: `PrinterStatusReport`
3. 触发器: 计算机启动时
4. 操作: 启动程序
   - 程序: `C:\PrinterStatus\start-service.bat`
   - 起始位置: `C:\PrinterStatus`
5. 勾选"使用最高权限运行"

### 方法二：放入启动文件夹
将 `start-service.bat` 的快捷方式放入：
```
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\
```

## 故障排查

### 服务无法启动
1. 检查日志文件 `logs\backend.log` 和 `logs\frontend.log`
2. 确认 Node.js 已正确安装：`node --version`
3. 确认端口未被占用：`netstat -ano | findstr ":3001"`

### 内网无法访问
1. 确认 Windows 防火墙已添加规则（脚本会自动添加，但需管理员权限）
2. 手动添加防火墙规则：
   ```cmd
   netsh advfirewall firewall add rule name="PrinterStatus" dir=in action=allow protocol=TCP localport=5175
   ```
3. 确认服务器和客户端在同一网段

### 打印机无法连接
1. 确认服务器能 ping 通打印机 IP
2. 确认打印机 SNMP 服务已启用
3. 检查 SNMP Community String 配置

## 数据备份

重要数据文件：
- `settings.json` - 系统设置
- `users.json` - 用户账号
- `printers-data.json` - 打印机配置
- `printer-history.json` - 历史记录
- `backend/snapshots/` - 系统快照

建议定期备份以上文件到内网共享目录。
