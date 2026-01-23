/**
 * @file ecat-tailwind-loader.js
 * @description Webpack loader for injecting Tailwind CSS into ecat modules
 * @author coffee
 */

const { getLoaderOptions } = require('../webpack.utils.js');
const path = require('path');
const fs = require('fs');



module.exports = function (source) {
  const options = getLoaderOptions(this) || {};
  const { 
    cssPath = 'assets/styles/tailwind.css', // 默认相对路径（相对于目标文件所在目录）
    cssImportPath = '@assets/styles/tailwind.css', // 默认相对路径（相对于目标文件所在目录）
    testPatterns = [/\.index\.js$/]         // 默认匹配 .index.js 文件（支持正则/字符串数组）
  } = options; 
  const { resourcePath } = this;

  // 1. 动态匹配目标文件（如 .index.js、main.js 等）
  const isTarget = testPatterns.some(pattern => {
    // 支持正则或字符串模式（如传入 [".index.js", "main.js"]）
    const regex = pattern instanceof RegExp ? pattern : new RegExp(`${pattern}$`);
    return regex.test(resourcePath);
  });

  // 非目标文件直接返回原内容
  if (!isTarget) return source;

  // 2. 获取目标文件所在目录（如 /src/ta）
  const fileDir = path.dirname(resourcePath);

  // 3. 构造要检查的 CSS 文件绝对路径（相对于目标文件所在目录）
  const cssFilePath = path.join(fileDir, cssPath); // 示例：/src/ta/assets/styles/tailwind.css

  // 4. 检查 CSS 文件是否存在
  const cssFileExists = fs.existsSync(cssFilePath);

  // 5. 若文件不存在 或 已存在导入语句，返回原内容
  if (!cssFileExists || source.includes(`import "${cssImportPath}";`)) return source;

  // 6. 注入 CSS 导入语句（使用相对路径）
  return `import "${cssImportPath}";\n${source}`;
};