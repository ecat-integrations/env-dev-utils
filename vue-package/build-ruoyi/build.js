/**
 * @file build.js
 * @description 生成子模块的路由配置文件，适配ruoyi-ui框架，支持嵌套路由
 * 
 * @author coffee
 */

const fs = require('fs').promises;
const path = require('path');

// 从命令行参数获取模块路径
const moduleBasePath = process.argv[2];
if (!moduleBasePath) {
  console.error('Error: Module base path is required as a command - line argument.');
  process.exit(1);
}

// 读取 module-config.json 文件
async function readModuleConfig() {
  try {
    const configData = await fs.readFile(path.join(moduleBasePath, 'module-config.json'), 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading module-config.json:', error);
    return null;
  }
}

// 检查文件或目录是否存在
async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// 递归收集所有需要导入的组件
function collectComponents(routes, components = []) {
  routes.forEach(route => {
    if (route.component && route.component !== 'Layout') {
      components.push({
        name: route.name,
        path: route.component
      });
    }
    if (route.children && route.children.length > 0) {
      collectComponents(route.children, components);
    }
  });
  return components;
}

// 递归生成路由配置内容
function generateRouteContent(route, basePath, moduleNamePrefix, moduleName, isRoot = true) {
  const component = route.component === 'Layout' 
    ? `"${route.component}"` 
    : route.name;

  const meta = route.meta || {};
  const metaString = JSON.stringify(meta, null, 4)
    .replace(/\n\s+/g, '\n    ');

  // 修改2：根据isRoot判断是否拼接basePath
  const pathValue = isRoot 
    ? `${basePath}/${route.path}` 
    : route.path;

  const childrenContent = route.children?.length 
    ? `,
    "children": [
      ${route.children.map(child => generateRouteContent(child, basePath, moduleNamePrefix, moduleName, false)).join(',\n      ')}
    ]` 
    : '';

  return `{
    "name": "${moduleNamePrefix}_${route.name}",
    "path": "${pathValue}",  
    "hidden": ${route.hidden !== undefined ? route.hidden : false},
    "redirect": "${route.redirect || 'noRedirect'}",
    "component": ${component},
    ${route.alwaysShow !== undefined ? `"alwaysShow": ${route.alwaysShow},` : ''}
    "meta": ${metaString}
    ${childrenContent}
  }`;
}

// 生成子模块的 .config.js 文件，支持嵌套路由
async function generateRoutesFiles() {
  const config = await readModuleConfig();
  if (!config) return;

  const modeleTypeSet = new Set();

  // 使用 for...of 处理异步循环
  for (const moduleConfig of config.sub_modules) {
    const moduleName = moduleConfig.module;
    const modeleType = moduleConfig.mtype;
    const moduleRoutes = moduleConfig.module_routes;

    const modulePath = config.module_path.replace(/\/$/, ''); // 移除末尾斜杠
    const moduleNamePrefix = config.module_name;

    if (modeleTypeSet.has(modeleType)) {
      throw new Error(`Duplicate mtype found: ${modeleType} in module-config.json`);
    }
    modeleTypeSet.add(modeleType);

    // 收集所有需要导入的组件（包括子路由）
    const components = collectComponents(moduleRoutes);
    const importContent = components.map(comp =>
      `import ${comp.name} from "./${comp.path}";`
    ).join('\n');

    // 生成基础路径（modulePath + moduleName）
    const basePath = `${modulePath}/${moduleName}`;

    // 生成路由配置（递归处理子路由）
    const routesContent = moduleRoutes.map(route =>
      generateRouteContent(route, basePath, moduleNamePrefix, moduleName)
    ).join(',\n');

    // 生成完整的 .config.js 内容
    const routesJsContent = `// 注意：此文件由 build.js 自动生成，请勿手动修改，否则会被自动覆盖！

${importContent}

export const mtype = "${modeleType}";

export const routes = [
${routesContent}
];

export const moduleInfo = {
  "name": "${moduleName}",
  "path": "${basePath}",
  "mtype": mtype,
  "routes": routes,
}
`;

    // 创建模块目录并写入文件
    const moduleDir = path.resolve(moduleBasePath, moduleName);
    if (!await exists(moduleDir)) {
      await fs.mkdir(moduleDir, { recursive: true });
    }

    const routesFilePath = path.resolve(moduleDir, '.config.js');
    await fs.writeFile(routesFilePath, routesJsContent, 'utf8');
    console.log(`Generated .config.js for ${moduleName}`);
  }
}

// 生成 .index.js 文件
async function generateIndexFile() {
  const config = await readModuleConfig();
  if (!config) return;
  const indexContent = await fs.readFile(path.join(__dirname, 'index.js'), 'utf8');

  config.sub_modules.forEach(async (moduleConfig) => {
    const moduleName = moduleConfig.module;
    const moduleDir = path.resolve(moduleBasePath, moduleName);

    const indexFilePath = path.resolve(moduleDir, '.index.js');
    await fs.writeFile(indexFilePath, indexContent, 'utf8');
    console.log(`Generated .index.js for ${moduleName}`);
  });
}

// 生成 utils/request.js 文件
async function generateRequestFile() {
  const config = await readModuleConfig();
  if (!config) return;
  const requestContent = await fs.readFile(path.join(__dirname, 'request.js'), 'utf8');

  config.sub_modules.forEach(async (moduleConfig) => {
    const moduleName = moduleConfig.module;
    const requestDir = path.resolve(moduleBasePath, moduleName, 'utils');
    const dirExists = await exists(requestDir);
    if (!dirExists) {
      await fs.mkdir(requestDir, { recursive: true });
    }
    const requestFilePath = path.resolve(requestDir, 'request.js');
    await fs.writeFile(requestFilePath, requestContent, 'utf8');
    console.log(`Generated utils/request.js for ${moduleName}`);
  });
}

// 执行生成
async function main() {
  await generateRoutesFiles().catch(error => {
    console.error('Error generating .config.js files:', error);
  });
  await generateIndexFile().catch(error => {
    console.error('Error generating .index.js files:', error);
  });
  await generateRequestFile().catch(error => {
    console.error('Error generating utils/request.js files:', error);
  });
}

main();