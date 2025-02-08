#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 加载 .env 文件
echo "=== 开始加载 .env 文件 ==="
if [ -f "${SCRIPT_DIR}/.env" ]; then
  while IFS='=' read -r key value; do
    # 去除首尾空格和引号，并处理行内注释
    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')
    value=$(echo "$value" | sed -e 's/#.*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')
    
    if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
      export "$key"="$value"
      echo "[ENV] 已加载: $key='$value'"
    fi
  done < "${SCRIPT_DIR}/.env"
else
  echo "警告: 未找到 .env 文件"
fi
echo "=== 完成加载 .env 文件 ==="

# 检查环境变量
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "Error: DEEPSEEK_API_KEY environment variable is not set"
  echo "Please create a .env file in the scripts directory with your DeepSeek API key"
  echo "Example: DEEPSEEK_API_KEY=your-api-key-here"
  exit 1
fi

# 检查目标语言配置
if [ -z "$TARGET_LANGS" ]; then
  echo "Error: TARGET_LANGS environment variable must be set"
  echo "Example: TARGET_LANGS=zh,ja,ko"
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
# 在设置默认值前添加调试信息
echo "=== 环境变量检查 ==="
echo "DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:-(未设置)}"
echo "SOURCE_DIR: ${SOURCE_DIR:-(未设置)}"
echo "TARGET_BASE_DIR: ${TARGET_BASE_DIR:-(未设置)}"
echo "HTTPS_PROXY: ${HTTPS_PROXY:-(未设置)}"

# 设置默认环境变量（如果未设置）
if [ -z "$SOURCE_DIR" ]; then
  SOURCE_DIR="${SCRIPT_DIR}/locales/en"
  echo "Using default SOURCE_DIR: $SOURCE_DIR"
fi

if [ -z "$TARGET_BASE_DIR" ]; then
  TARGET_BASE_DIR="${SCRIPT_DIR}/locales"
  echo "Using default TARGET_BASE_DIR: $TARGET_BASE_DIR"
fi

# 确保目录存在
mkdir -p "$SOURCE_DIR"
mkdir -p "$TARGET_BASE_DIR"

# 运行翻译脚本
SOURCE_DIR="$SOURCE_DIR" TARGET_BASE_DIR="$TARGET_BASE_DIR" DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" npx ts-node translate-i18n.ts

# 清理临时目录
cd "${SCRIPT_DIR}"
rm -rf "$TEMP_DIR"