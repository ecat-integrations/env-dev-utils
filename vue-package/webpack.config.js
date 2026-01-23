/**
 * @description 生成 Webpack 配置打包文件，适配vue2和vue3
 * 
 * @author coffee
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * @description Ecat 针对ruoyi框架的vue页面webpack配置文件
 * 
*/
const ruoyiWebpackConfig = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  }
}

/**
 * 
 * @description 读取模块配置文件，动态生成 Ecat 基础的 Webpack 配置
 * @param {*} basePath 集成目录路径，用于读取模块配置文件
 * @returns 
 */
async function webpackBaseConfig(basePath) {
  try {
    // 读取 JSON 文件，使用传入的 basePath
    const configData = await fs.readFile(path.join(basePath, 'module-config.json'), 'utf8');
    const config = JSON.parse(configData);

    const entry = {};

    // 动态生成 entry 对象，使用传入的 basePath
    config.sub_modules.forEach(moduleConfig => {
      const moduleName = moduleConfig.module;
      entry[moduleName] = path.join(basePath, `${moduleName}/.index.js`);
    });

    // 配置 Webpack
    return {
      entry: entry,
      output: {
        path: path.resolve(basePath, 'dist'),
        filename: '[name].js',
        publicPath: config.public_path, // 配置 publicPath
        library: '__dynamicModule_[name]', // 动态生成library名称
        libraryTarget: 'umd',
        libraryExport: 'default',
        umdNamedDefine: true,
        globalObject: 'this'
      },
      module: {
      },
      plugins: [
      ],
      resolve: {
        extensions: ['.vue', '.js'],
        alias: {
          '@ruoyi-ui': path.resolve(__dirname, '../../../../../../../ruoyi-ui/src'),
          // 强制使用包含编译器的完整版本
          // 'vue$': 'vue/dist/vue.esm-bundler.js'
        },
        // 为每个模块设置 @ 别名
        plugins: [
          {
            apply: (resolver) => {
              resolver.hooks.resolve.tapAsync('CustomAliasPlugin', (request, context, callback) => {
                if (request.request && request.request.startsWith('@')) {
                  const currentPath = request.path;
                  const moduleName = Object.keys(entry).find(key => currentPath.includes(key));
                  if (moduleName) {
                    const aliasPath = path.join(basePath, moduleName);
                    const newRequest = {
                      ...request,
                      request: path.join(aliasPath, request.request.slice(1))
                    };
                    console.log('Resolving alias:', request.request, 'to', newRequest.request); // 添加调试信息
                    resolver.doResolve(resolver.hooks.resolve, newRequest, null, context, callback);
                    return;
                  }
                }
                callback();
              });
            }
          }
        ]
      },
      externals: {
        vue: {
          root: 'Vue',
          commonjs: 'vue',
          commonjs2: 'vue',
          amd: 'vue'
        },
        echarts: {
          root: 'echarts',
          commonjs: 'echarts',
          commonjs2: 'echarts',
          amd: 'echarts'
        },
        // 配置Element Plus图标库为外部依赖
        '@element-plus/icons-vue': {
          root: 'ElementPlusIconsVue', // 全局变量名（需与主模块引入的变量一致）
          commonjs: '@element-plus/icons-vue',
          commonjs2: '@element-plus/icons-vue',
          amd: '@element-plus/icons-vue'
        },
        'element-plus': {
          root: 'ElementPlus',  // 全局变量名
          commonjs: 'element-plus',
          commonjs2: 'element-plus',
          amd: 'element-plus'
        }
      },
      optimization: {
        splitChunks: false, // 明确禁止代码分割
        runtimeChunk: false // 不生成运行时代码块
      },
      devtool: 'source-map'
    };
  } catch (error) {
    console.error('Error generating Webpack config:', error);
    return {};
  }
}

/**
 * 
 * @description 生成 Webpack 配置文件，适配vue2和vue3
 * @param {*} basePath 集成目录路径，用于读取模块配置文件
 * @param {*} userConfig 用户自定义配置，如果没有传入则使用默认空对象
 * @returns 
 */
async function generateWebpackConfig(basePath, userConfig = {}) { // 添加默认空对象
  try {
    // 获取基础配置
    const baseConfig = await webpackBaseConfig(basePath);

    const customConfig = {
      ...userConfig, // 用户自定义配置
      ...ruoyiWebpackConfig 
    };
    
    // 配置合并逻辑
    const mergedConfig = {
      ...baseConfig, // 优先保留基础配置结构
      ...customConfig // 第一层key相同的属性会被用户配置覆盖
    };
    
    return mergedConfig;
  } catch (error) {
    console.error('Error generating Webpack config:', error);
    throw error; // 抛出错误以便调用者处理
  }
}

// 导出动态生成的 Webpack 配置
module.exports = function(basePath, userConfig = {}) {
  return generateWebpackConfig(basePath, userConfig);
};