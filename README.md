# Stock Agent

Stock Agent是一套面向 A 股、港股、美股的 AI 投研辅助平台。项目通过多数据源行情抓取、技术指标分析、新闻检索、LLM 推理和通知推送，帮助用户自动生成每日股票分析报告、大盘复盘与策略问答结果。


## 项目概述

Stock Agent的目标是把“数据获取 -> 技术分析 -> 新闻检索 -> AI 分析 -> 报告生成 -> 通知推送”的日常投研流程自动化。

适合的使用场景包括：

- 对 A 股、港股、美股和 ETF 做多市场行情聚合。
- 结合技术指标、新闻、公告、资金流和基本面信息生成 AI 决策摘要。
- 通过飞书、钉钉等渠道推送报告。
- 使用 Web 工作台进行手动分析、历史报告查看、配置管理和 Agent 问股。

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 多市场数据聚合 | 支持 A 股、港股、美股、ETF，接入 efinance、AkShare、Tushare、yfinance、Longbridge、TickFlow 等数据源。 |
| AI 分析报告 | 通过 LiteLLM 统一接入 OpenAI compatible、DeepSeek、通义千问等模型生态，输出趋势、评分、风险、催化因素和操作检查清单。 |
| 大盘复盘 | 支持独立运行市场复盘，汇总指数、热点、宏观线索和市场情绪。 |
| 新闻与舆情 | 支持 Tavily、SerpAPI 等搜索能力，为个股分析补充事件和新闻上下文。 |
| Web 工作台 | React + Vite 前端提供手动分析、历史报告、配置管理、Markdown 渲染、主题切换等能力。 |
| Agent 问股 | 支持多轮策略问答，可围绕均线、趋势、热点、事件、成长、预期等维度组织分析。 |
| 通知推送 | 支持飞书、钉钉等渠道。 |

## 技术架构

```text
客户端层
     Web UI 
        |
        v
服务入口
  main.py / server.py / FastAPI API
        |
        v
业务编排层
  StockAnalysisPipeline / Agent Orchestrator 
        |
        v
能力层
  Data Provider / Technical Analysis / News Search / LLM Analyzer / Report Renderer / Notification Sender
        |
        v
基础设施
  SQLite / SQLAlchemy / LiteLLM / 外部行情与搜索服务 / 通知渠道
```

主要技术栈：

| 层级 | 技术 |
| --- | --- |
| 后端 | Python 3.10+、FastAPI、SQLAlchemy、SQLite、pandas、numpy、schedule、tenacity |
| AI 接入 | OpenAI SDK |
| 数据源 | efinance、AkShare、yfinance、TickFlow |
| 前端 | React 19、TypeScript、Vite、Tailwind CSS、Zustand、Recharts、React Router |
| 测试与质量 | pytest、flake8、py_compile、ESLint、TypeScript build、Vitest、Playwright |

## 环境要求

- Docker Desktop 或 Docker Engine。
- Docker Compose。
- Python 3.10 或更高版本，用于本地脚本、测试或非 Docker 开发。
- Node.js 20 或更高版本，用于 Web 前端开发和构建。
- Git。
- 至少一个可用的 LLM API Key，或本地 Ollama 模型。

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/hz35572/StockAgent.git
cd StockAgent
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件，并至少配置自选股和一个 LLM 渠道。下面是最小示例：

```env
STOCK_LIST=600519,000001,AAPL,hk00700
LITELLM_MODEL=openai/deepseek-ai/DeepSeek-V3
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
```

也可以使用 DeepSeek、Gemini、Anthropic、Ollama 或多渠道配置。

### 3. 使用 Docker 启动 Web 服务

```powershell
docker-compose -f ./docker/docker-compose.local.yml up -d --build server
```

启动后访问：

- Web 服务：`http://localhost:8081`
- OpenAPI 文档：`http://localhost:8081/docs`

### 4. 查看服务状态

```powershell
docker-compose -f ./docker/docker-compose.local.yml ps
```

### 5. 查看日志

持续查看 Web 服务日志：

```powershell
docker-compose -f ./docker/docker-compose.local.yml logs -f server
```

只查看最近 100 行日志：

```powershell
docker-compose -f ./docker/docker-compose.local.yml logs --tail 100 server
```

也可以直接查看容器日志：

```powershell
docker logs -f stock-server-local
```

### 6. 停止服务

停止并删除本次 Compose 创建的容器和网络：

```powershell
docker-compose -f ./docker/docker-compose.local.yml down
```

仅暂停 Web 服务容器：

```powershell
docker-compose -f ./docker/docker-compose.local.yml stop server
```

## 使用方法


### Docker 服务管理

启动 Web 服务：

```powershell
docker-compose -f ./docker/docker-compose.local.yml up -d --build server
```

启动定时分析服务：

```powershell
docker-compose -f ./docker/docker-compose.local.yml up -d --build analyzer
```

同时启动 Web 服务和定时分析服务：

```powershell
docker-compose -f ./docker/docker-compose.local.yml up -d --build
```

重启 Web 服务：

```powershell
docker-compose -f ./docker/docker-compose.local.yml restart server
```

查看运行状态：

```powershell
docker-compose -f ./docker/docker-compose.local.yml ps
```

查看 Web 服务日志：

```powershell
docker-compose -f ./docker/docker-compose.local.yml logs -f server
```

停止所有服务：

```powershell
docker-compose -f ./docker/docker-compose.local.yml down
```

### Web 前端开发

如需单独启动前端开发服务，可在本机运行：

```bash
cd apps/dsa-web
npm ci
npm run dev
```

生产构建：

```bash
cd apps/dsa-web
npm run lint
npm run build
```

## 配置说明

DSA 主要通过 `.env`、系统环境变量和 Web 设置页管理配置。常用配置包括：

| 配置类别 | 示例变量 | 说明 |
| LLM 主模型 | `LITELLM_MODEL` | LiteLLM 模型名，如 `openai/...`、`deepseek/...`、`ollama/...`。 |
| OpenAI compatible | `OPENAI_API_KEY`、`OPENAI_BASE_URL` | 兼容 OpenAI API 的平台接入配置。 |
| 搜索服务 | `TAVILY_API_KEY`、`SERPAPI_API_KEY` | 新闻和事件检索。 |
| 通知渠道 | `FEISHU_WEBHOOK_URL`、`TELEGRAM_BOT_TOKEN` 等 | 报告推送渠道。 |

## 项目结构

```text
StockAgent/
├── main.py                  # CLI、调度和分析任务入口
├── server.py                # FastAPI 服务入口
├── api/                     # FastAPI 应用、路由和中间件
├── src/                     # 核心业务逻辑
│   ├── core/                # 分析流水线、大盘复盘、回测等编排逻辑
│   ├── services/            # 业务服务层
│   ├── repositories/        # 数据访问层
│   ├── schemas/             # 数据结构和契约
│   ├── agent/               # Agent 问股系统
│   ├── llm/                 # LLM 适配与参数管理
│   └── notification_sender/ # 通知发送器
├── data_provider/           # 多数据源适配与 fallback
├── apps/dsa-web/            # React + Vite Web 前端
├── bot/                     # 机器人接入
├── scripts/                 # 本地脚本和 CI 辅助脚本
├── docker/                  # Docker 相关配置
├── tests/                   # pytest 测试
├── templates/               # 报告模板
├── reports/                 # 本地生成的报告
└── docs/                    # 项目文档
```

## 开发与验证

后端推荐检查：

```bash
pip install -r requirements.txt
pip install flake8 pytest
./scripts/ci_gate.sh
```

如只修改少量 Python 文件，可先做最低限度编译检查：

```bash
python -m py_compile main.py server.py
```

前端推荐检查：

```bash
cd apps/dsa-web
npm ci
npm run lint
npm run build
```
