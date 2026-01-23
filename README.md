# env-dev-utils

## 简介

`env-dev-utils` 是一个独立的前端开发工具仓库，专门为 env 业务（环境监测相关集成模块）提供统一的构建配置和工具函数。

## 使用场景

本工具包适用于所有使用 **ruoyi-ui** 框架（支持 Vue2 和 Vue3）的前端项目。当 ruoyi-ui 框架的前端需要加载 env 相关的集成模块时，需要引用此工具包。

## 使用方式

### 1. 独立 Git 仓库

本仓库作为独立的 Git 仓库进行管理，需要与 ecat-integrations 主仓库平级放置：

```
ecat-integrations/
├── env-dev-utils/          # 独立的 git 仓库
│   └── vue-package/
├── env-access-control/
├── env-alarm-manager/
└── ...
```

### 2. 在 env- 集成模块中引用

在各 env- 集成模块的 `webpack.config.js` 中引用：

```javascript
const getCommonWebpackConfig = require("../../../../../env-dev-utils/vue-package/webpack.config.js");
```

### 3. 自定义 Loader 引用

```javascript
const ecatTailwindLoader = path.resolve(
  "../../../../../env-dev-utils/vue-package/webpack-loaders/",
  "ecat-tailwind-loader.js"
);
```

## 功能特性

- **多框架支持**：支持 ruoyi-ui-vue2 和 ruoyi-ui-vue3
- **动态配置**：通过 `module-config.json` 动态生成 webpack entry 配置
- **Tailwind CSS**：自定义 loader 动态注入 Tailwind CSS
- **别名解析**：实现 `@` 别名的动态解析
- **外部依赖**：预配置 Element Plus、ECharts 等常用库

## 依赖的 env- 集成模块

以下模块依赖于本工具包：

- env-access-control
- env-alarm-manager
- env-data-manager
- env-device-manager
- env-maintenance-manager
- env-material-manager
- env-patrol-manager
- env-quality-control-manager

## 版本要求

- Node.js >= 14
- npm >= 6 或 yarn >= 1.22

## 许可证

Copyright © ECAT Team
