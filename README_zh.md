# DeepSeek 国际化翻译工具

一个使用 DeepSeek API 自动翻译 JSON 本地化文件的命令行工具，保留代码格式。

## 功能特性
- 🚀 自动化 JSON 文件翻译
- 🔒 保留 {{变量}} 和 <HTML标签>
- ⚡ 并发翻译请求
- 📝 翻译变更日志
- 🔄 智能差异对比现有翻译

## 环境要求
- Node.js 16+
- pnpm
- DeepSeek API 密钥

## 配置指南
1. 复制 `.env.example` 为 `.env`：
```env
DEEPSEEK_API_KEY=你的API密钥
SOURCE_DIR=./locales/en # 英文源文件目录
TARGET_BASE_DIR=./locales # 翻译文件输出目录
TARGET_LANGS=zh,ja,ko # 目标语言代码，逗号分隔
# 如需代理请取消注释：
# HTTPS_PROXY=http://127.0.0.1:7890
```

## 使用说明
```bash
# 添加执行权限
chmod +x translate.sh

# 运行翻译
./translate.sh
```

## 文件结构
```
locales/
├── en/          # 源文件
│   └── *.json
└── [语言代码]/   # 翻译文件
```

## 代理设置
在 `.env` 中取消注释：
```env
HTTPS_PROXY=http://你的代理地址:端口
```

## 日志记录
翻译日志保存在 `translation-log.txt`，包含：
- 原文
- 译文
- JSON键路径

## 使用建议
1. 先用小文件测试
2. 注意API调用频率限制
3. 定期检查翻译日志
4. 保留原始文件备份

[查看英文文档](README.md) 