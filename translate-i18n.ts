import { promises as fs } from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const LOCALES = [
  'zh',    // 简体中文 (CN)
];
const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR || './locales/en');
const TARGET_BASE_DIR = path.resolve(process.env.TARGET_BASE_DIR || './locales');

// 语言代码映射
const LANGUAGE_MAP: Record<string, string> = {
  'zh': 'Chinese Simplified',
};

// 创建代理 agent
const proxyUrl = process.env.HTTPS_PROXY || '';
const proxyAgent = new HttpsProxyAgent(proxyUrl);

// 添加日志文件路径
const LOG_FILE = path.join(__dirname, 'translation-log.txt');

async function logTranslation(original: string, translated: string, path: string) {
  const key = path.split('.').pop() || path;
  const logEntry = `Key: ${key}
Original: ${original}
Translated: ${translated}
----------------------------------------
`;
  await fs.appendFile(LOG_FILE, logEntry, 'utf-8');
}

async function translateText(text: string, targetLang: string, path: string = ''): Promise<string> {
  try {
    // 如果文本全是标签或变量，直接返回原文
    const strippedText = text.replace(/\{\{[^}]+\}\}|<[^>]+>/g, '').trim();
    if (!strippedText) {
      return text;
    }

    // 保护所有需要保留的标签和变量
    const placeholders: { placeholder: string; original: string }[] = [];
    let counter = 0;

    const textToTranslate = text
      // 保护 {{var}} 形式的变量
      .replace(/\{\{([^}]+)\}\}/g, (match) => {
        const placeholder = `__VAR${counter++}__`;
        placeholders.push({ placeholder, original: match });
        return placeholder;
      })
      // 保护 <TagName /> 形式的自闭合标签
      .replace(/<([A-Z][a-zA-Z]*)\s*\/>/g, (match) => {
        const placeholder = `__TAG${counter++}__`;
        placeholders.push({ placeholder, original: match });
        return placeholder;
      })
      // 保护 <TagName>text</TagName> 形式的标签
      .replace(/<([A-Z][a-zA-Z]*)>.*?<\/\1>/g, (match) => {
        const placeholder = `__TAG${counter++}__`;
        placeholders.push({ placeholder, original: match });
        return placeholder;
      });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        agent: proxyAgent,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
          {
            role: 'system',
            content: `你是一个专业的网页翻译专家，负责将英文界面文本翻译成简体中文。请遵循以下规则：

1. 保持简洁专业的UI翻译风格
2. 保留所有技术术语和变量不变
3. 不要添加任何解释或额外内容
4. 保持标点符号与原文一致
5. 如果不确定翻译，返回空字符串

常见UI翻译示例：
"Subscription canceled" -> "订阅已取消"
"Your subscription is scheduled to be canceled on {{- endDate }}." -> "您的订阅将于 {{- endDate }} 取消"
"Thank you for subscribing" -> "感谢订阅"
"All" -> "全部"
"Details" -> "详情"
"Settings" -> "设置"
"Log" -> "日志"
"Actions" -> "操作"
"Status" -> "状态"
"Active" -> "活跃"
"Inactive" -> "未激活"
"Loading..." -> "加载中..."
"Error" -> "错误"
"Success" -> "成功"
"Warning" -> "警告"
"Info" -> "信息"
"Close" -> "关闭"
"Save" -> "保存"
"Cancel" -> "取消"
"Delete" -> "删除"
"Edit" -> "编辑"
"View" -> "查看"
"Next" -> "下一步"
"Previous" -> "上一步"
"Back" -> "返回"
"Continue" -> "继续"
"Finish" -> "完成"
"Start" -> "开始"
"Submit" -> "提交"
"Reset" -> "重置"`
          },
          {
            role: 'user',
            content: `${textToTranslate}`
          }
        ],
        temperature: 0.1,
        top_p: 0.7,
        stream: false,
        max_tokens: 2000,
        stop: []
      })
    });

    const data = await response.json();
    if (!response.ok || !data.choices?.[0]?.message?.content) {
      await logTranslation(text, text, path);
      return text;
    }

    // 清理返回的文本
    let translatedText = data.choices[0].message.content.trim();
    translatedText = translatedText.replace(/^(翻译:|译文:|Translation:|翻译结果:|结果:)/i, '').trim();
    translatedText = translatedText.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    translatedText = translatedText.replace(/\n+/g, ' ').trim();

    // 如果翻译结果无效或为空，返回原文
    if (!translatedText || translatedText === text || translatedText.includes('__VAR') || translatedText.includes('__TAG')) {
      await logTranslation(text, text, path);
      return text;
    }

    // 还原所有占位符
    placeholders.forEach(({ placeholder, original }) => {
      translatedText = translatedText.replace(placeholder, original);
    });

    await logTranslation(text, translatedText, path);
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    await logTranslation(text, text, path);
    return text;
  }
}

async function translateObject(
  obj: any, 
  existingObj: any | null, 
  targetLang: string, 
  prefix = ''
): Promise<any> {
  // 如果是数组，保持数组格式
  if (Array.isArray(obj)) {
    const result = [];
    for (let i = 0; i < obj.length; i++) {
      const value = obj[i];
      if (typeof value === 'string') {
        // 如果现有翻译存在且是数组，使用现有翻译
        if (Array.isArray(existingObj) && existingObj[i]) {
          result.push(existingObj[i]);
          continue;
        }
        
        const translatedText = await translateText(value, targetLang);
        result.push(translatedText);
      } else if (typeof value === 'object' && value !== null) {
        result.push(await translateObject(
          value,
          Array.isArray(existingObj) ? existingObj[i] : null,
          targetLang,
          `${prefix}[${i}]`
        ));
      } else {
        result.push(value);
      }
    }
    return result;
  }

  // 原有的对象处理逻辑
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      console.log(`Processing object: ${currentPath}`);
      
      // 检查对象结构是否相同
      const existingKeys = existingObj?.[key] ? Object.keys(existingObj[key]) : [];
      const newKeys = Object.keys(value);
      const hasStructureChanged = 
        !existingKeys.length || 
        newKeys.length !== existingKeys.length ||
        newKeys.some(k => !existingObj?.[key]?.[k]);
      
      if (hasStructureChanged) {
        console.log(`Structure changed in ${currentPath}, translating all children`);
        result[key] = await translateObject(
          value,
          null, // 不使用现有翻译
          targetLang,
          currentPath
        );
      } else {
        result[key] = await translateObject(
          value,
          existingObj?.[key] || null,
          targetLang,
          currentPath
        );
      }
    } else if (typeof value === 'string') {
      try {
        // 如果现有翻译存在且结构没变，使用现有翻译
        if (existingObj && key in existingObj && existingObj[key]) {
          console.log(`Using existing translation for: ${currentPath}`);
          result[key] = existingObj[key];
          continue;
        }
        
        console.log(`Translating: ${currentPath} = "${value}"`);
        const translatedText = await translateText(value, targetLang, currentPath);
        result[key] = translatedText;
        console.log(`Translated to ${targetLang}: "${translatedText}"`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error translating "${currentPath}": ${error}`);
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

async function processFile(filePath: string, targetLang: string) {
  try {
    console.log(`\n=== Processing ${path.basename(filePath)} to ${targetLang} ===`);
    
    // 读取源文件
    console.log('Reading source file...');
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceObj = JSON.parse(content);
    
    // 检查目标文件是否存在
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const targetDir = path.join(TARGET_BASE_DIR, targetLang, path.dirname(relativePath));
    const targetPath = path.join(targetDir, path.basename(filePath));
    
    let existingObj = null;
    try {
      const existingContent = await fs.readFile(targetPath, 'utf-8');
      existingObj = JSON.parse(existingContent);
      console.log('Found existing translation file');
    } catch (error) {
      console.log('No existing translation file found');
    }
    
    // 翻译对象
    console.log('Starting translation...');
    const translatedObj = await translateObject(sourceObj, existingObj, targetLang);
    
    // 创建目标目录
    console.log(`Creating directory: ${targetDir}`);
    await fs.mkdir(targetDir, { recursive: true });
    
    // 写入翻译后的文件
    console.log(`Writing translated file: ${targetPath}`);
    await fs.writeFile(
      targetPath,
      JSON.stringify(translatedObj, null, 2),
      'utf-8'
    );
    
    console.log(`✓ Successfully translated ${path.basename(filePath)} to ${targetLang}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}: ${error}`);
  }
}

async function main() {
  try {
    console.log('\n=== Starting Translation Process ===');
    console.log(`Source directory: ${SOURCE_DIR}`);
    console.log(`Target languages: ${LOCALES.join(', ')}`);
    
    // 获取所有源文件
    const files = await fs.readdir(SOURCE_DIR);
    console.log(`Found ${files.length} files to translate\n`);
    
    // 处理每个文件和语言
    for (const locale of LOCALES) {
      console.log(`\n=== Processing ${locale} translations ===`);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(SOURCE_DIR, file);
          await processFile(filePath, locale);
        }
      }
    }
    
    console.log('\n=== Translation Process Completed! ===');
  } catch (error) {
    console.error('\n✗ Translation Process Failed:', error);
    process.exit(1);
  }
}

main(); 