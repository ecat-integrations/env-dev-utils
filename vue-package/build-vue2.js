/**
 * @file build.js
 * @description 生成子模块的路由配置文件 vue2版本，适合自由结构目录，不支持嵌套路由
 * 
 * @author coffee
 */

const fs = require('fs').promises;
const path = require('path');

// 从命令行参数获取模块路径
const moduleBasePath = process.argv[2];
if (!moduleBasePath) {
    console.error('Error: Module base path is required as a command-line argument.');
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

// 生成子模块的 .config.js 文件
async function generateRoutesFiles() {
    const config = await readModuleConfig();
    if (!config) return;

    // 记录 modeleType 不重复的标识
    const modeleTypeSet = new Set();
    // 遍历每个子模块
    config.sub_modules.forEach(async (moduleConfig) => {
        const moduleName = moduleConfig.module;
        const modeleType = moduleConfig.mtype;
        const moduleRoutes = moduleConfig.module_routes;

        const modulePath = config.module_path;
        const moduleNamePrefix = config.module_name;

        if (modeleTypeSet.has(modeleType)) {
            // 抛出异常
            throw new Error(`Duplicate mtype found: ${modeleType} in module-config.json`);
        }
        modeleTypeSet.add(modeleType);

        // 生成 import 内容
        const importContent = moduleRoutes
           .map(route => {
                return `import ${route.name} from "./${route.component}";`;
            })
           .join('\n');

        // 生成路由配置内容
        const routesContent = moduleRoutes
           .map(route => {
                return `  {
    path: "${modulePath}${moduleName}/${route.path}",
    name: "${moduleNamePrefix}_${route.name}",
    component: ${route.name},
    entry: ${route.entry ? route.entry : false}
  }`;
            })
           .join(',\n');

        // 生成完整的 .config.js 文件内容
        const routesJsContent = `// 注意：此文件由 build.js 自动生成，请勿手动修改，否则会被自动覆盖！

${importContent}

export const mtype = "${modeleType}";

export const routes = [
${routesContent}
];

export const moduleInfo = {
  "name": "${moduleName}",
  "path": "${modulePath}${moduleName}",
  "mtype": mtype,
  "routes": routes,
}
`;

        // 确保子模块目录存在
        const moduleDir = path.resolve(moduleBasePath, moduleName);
        const dirExists = await exists(moduleDir);
        if (!dirExists) {
            await fs.mkdir(moduleDir, { recursive: true });
        }

        // 写入 .config.js 文件
        const routesFilePath = path.resolve(moduleDir, '.config.js');
        await fs.writeFile(routesFilePath, routesJsContent, 'utf8');
        console.log(`Generated .config.js for ${moduleName}`);
    });
}

// 生成 .index.js 文件
async function generateIndexFile() {
    const config = await readModuleConfig();
    if (!config) return;

    config.sub_modules.forEach(async (moduleConfig) => {
        const moduleName = moduleConfig.module;
        const moduleDir = path.resolve(moduleBasePath, moduleName);

        const indexJsContent = `// 注意：此文件由 build.js 自动生成，请勿手动修改，否则会被自动覆盖！

import {routes, moduleInfo} from "./.config";
import initRequest from "./api.js";

export default {
  install(Vue, VueRouter, utils, options) {
    // 注册组件
    // for (const route of routes) {
    //   Vue.component(route.name, route.component);
    // }
    VueRouter.addRoutes(routes);
    // 注册工具类
    initRequest(utils.request);
    return moduleInfo;
  },
};`;

        const indexFilePath = path.resolve(moduleDir, '.index.js');
        await fs.writeFile(indexFilePath, indexJsContent, 'utf8');
        console.log(`Generated .index.js for ${moduleName}`);
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
}

main();  