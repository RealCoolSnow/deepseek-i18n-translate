#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 加载 .env 文件
if [ -f "${SCRIPT_DIR}/.env" ]; then
  export $(cat "${SCRIPT_DIR}/.env" | grep -v '^#' | xargs)
fi

# 检查环境变量
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "Error: DEEPSEEK_API_KEY environment variable is not set"
  echo "Please create a .env file in the scripts directory with your DeepSeek API key"
  echo "Example: DEEPSEEK_API_KEY=your-api-key-here"
  exit 1
fi

# 创建临时目录
TEMP_DIR="${SCRIPT_DIR}/temp_translate"
mkdir -p "$TEMP_DIR"

# 初始化临时 package.json
cd "$TEMP_DIR"
echo '{
  "name": "translate-temp",
  "version": "1.0.0",
  "private": true
}' > package.json

# 安装依赖
pnpm add typescript ts-node @types/node https-proxy-agent node-fetch@2 @types/node-fetch@2

# 复制翻译脚本到临时目录
cp "${SCRIPT_DIR}/translate-i18n.ts" "$TEMP_DIR/"

# 创建 tsconfig.json
echo '{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "moduleResolution": "node",
    "allowJs": true,
    "resolveJsonModule": true
  },
  "ts-node": {
    "compilerOptions": {
      "module": "CommonJS"
    }
  }
}' > tsconfig.json

# 设置默认环境变量（如果未设置）
export SOURCE_DIR=${SOURCE_DIR:-"./locales/en"}
export TARGET_BASE_DIR=${TARGET_BASE_DIR:-"./locales"}

# 运行翻译脚本
SOURCE_DIR="$SOURCE_DIR" TARGET_BASE_DIR="$TARGET_BASE_DIR" DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" npx ts-node --esm translate-i18n.ts

# 清理临时目录
cd "${SCRIPT_DIR}"
rm -rf "$TEMP_DIR"