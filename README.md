# env-dev-utils

## 简介

`env-dev-utils` 是一个独立的前端开发工具仓库，专门为 env 业务（环境监测相关集成模块）提供统一的构建配置和工具函数。

## 使用场景

本工具包适用于所有使用 **ruoyi-ui** 框架（支持 Vue2 和 Vue3）的前端项目。当 ruoyi-ui 框架的前端需要加载 env 相关的集成模块时，需要引用此工具包。

## 测试运行
启动/重启 ecat-core和 ruoyi集成的ruoyi-ui 模块，启动 ecat-core 和 ruoyi-ui 的服务。
```bash
# 在项目根目录运行
./ecat-integrations/env-dev-utils/restart-ecat-dev.sh
```


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
- env-compare-manager

## 版本要求

- Node.js >= 14
- npm >= 6 或 yarn >= 1.22

## 许可证

Copyright © ECAT Team

## 协议声明
1. 核心依赖：本插件基于 **ECAT Core**（Apache License 2.0）开发，Core 项目地址：https://github.com/ecat-project/ecat-core。
2. 插件自身：本插件的源代码采用 [Apache License 2.0] 授权。
3. 合规说明：使用本插件需遵守 ECAT Core 的 Apache 2.0 协议规则，若复用 ECAT Core 代码片段，需保留原版权声明。

### 许可证获取
- ECAT Core 完整许可证：https://github.com/ecat-project/ecat-core/blob/main/LICENSE
- 本插件许可证：./LICENSE

