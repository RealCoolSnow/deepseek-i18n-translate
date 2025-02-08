# DeepSeek i18n Translation Toolkit

[中文文档](README_zh.md) | [English Version](README.md)

A CLI tool for automating UI text translations using DeepSeek's API. Preserves code formatting while translating JSON locale files.

## Features
- 🚀 Automated JSON file translation
- 🔒 Preserves {{variables}} and <HTMLTags>
- ⚡ Concurrent translation requests
- 📝 Translation change logging
- 🔄 Smart diffing for existing translations

## Prerequisites
- Node.js 16+
- pnpm
- DeepSeek API key

## Configuration
1. Copy `.env.example` to `.env`:
```env
DEEPSEEK_API_KEY=your-api-key-here
SOURCE_DIR=./locales/en # Source directory for en locale files
TARGET_BASE_DIR=./locales # Target base directory for translated files
# Optional proxy:
# HTTPS_PROXY=http://127.0.0.1:7890
```

## Usage
```bash
# Make script executable
chmod +x translate.sh

# Run translation
./translate.sh
```

## File Structure
```
locales/
├── en/          # Source files
│   └── *.json
└── [lang]/      # Translated files
```

## Proxy Setup
Uncomment in `.env`:
```env
HTTPS_PROXY=http://your.proxy:port
```

## Logging
Translations are logged to `translation-log.txt` with:
- Original text
- Translated text
- JSON key path

## Tips
1. Test with small files first
2. Monitor API rate limits
3. Review logs for skipped translations
4. Keep backup of original files
```

Key elements from your implementation:
- Uses temporary directory for dependency isolation
- Auto-loads environment variables
- Handles both proxy and direct connections
- Preserves code formatting in translations
- Maintains translation version history