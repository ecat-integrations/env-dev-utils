/**
 * @description 生成 Webpack 配置打包文件，适配vue2和vue3
 * 
 * @author coffee
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * @description Ecat 针对 ruoyi 框架的 vue 页面 webpack 配置文件。
 *
 * 收口策略（设计目标：统一 + 兜底）：本模块是所有 env-* 集成 vue 打包的必经入口
 * （骨架 entry/output/UMD/externals/resolve 全在此产出，子集成脱离它无法构建），
 * 故在此保证底线规则对所有集成生效——不管子集成怎么写自己的 .vue 规则。
 */

// 底线 .vue 编译选项：所有集成必生效，子集成关不掉。以后发现还有需要全集成统一的 .vue 编译选项，
// 往这里加一行即可，所有走本入口的集成自动生效。
// comments:false——vue-loader 默认把模板根 <!-- --> 注释编译成 createCommentVNode，注释在根元素前会使组件
// 渲染成 Fragment 多根，经宿主 AppMain <transition mode="out-in"> 包裹时间歇挂不上 enter 钩子致 SPA 导航白屏
// （bug-record-20260807-184548）。让注释不进渲染产物，根恒单一元素，从结构上杜绝白屏复发。
const BASELINE_VUE_COMPILER_OPTIONS = { comments: false };

// 子集成没声明时的兜底 loader（data-manager 这类只有 .js/.vue、不自带 loader 规则的集成靠它）。
// 已声明同 test 的不重复补，避免和子集成的 postcss 变体 .css 等重复触发 loader。
const SHARED_FALLBACK_LOADERS = [
  { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
  { test: /\.(css|scss)$/, use: ['style-loader', 'css-loader', 'sass-loader'] }
];

function isVueRule(r) {
  return !!(r && r.test && /\\\.vue\$/.test(String(r.test)));
}
function sameTest(r, testRegex) {
  return !!(r && r.test && String(r.test) === String(testRegex));
}

/**
 * 底线注入：对子集成传进来的 loader 规则做收口（不修改入参规则对象）：
 *  1. .vue 规则必有 comments:false——local 已有 .vue 规则则把底线合并进去（local 的 isCustomElement/whitespace
 *     等选项全保留，底线放最后展开，关不掉，即便 local 写 comments:true 也盖回 false）；local 没写 .vue 规则
 *     则兜底加一条。
 *  2. .js/.css 缺则补兜底，有则不重复（防和 local 变体重复触发 loader 两次）。
 * 不限制 local 怎么写、不抛错，只保证底线。
 */
function applyBaseline(rules) {
  const out = [];
  let hasVue = false;
  for (const r of rules) {
    if (isVueRule(r)) {
      out.push({
        ...r,
        options: {
          ...(r.options || {}),
          compilerOptions: {
            ...((r.options && r.options.compilerOptions) || {}),   // local 选项保留
            ...BASELINE_VUE_COMPILER_OPTIONS                         // 底线最后 → 永远盖过 local
          }
        }
      });
      hasVue = true;
    } else {
      out.push(r);
    }
  }
  if (!hasVue) {
    out.push({
      test: /\.vue$/,
      loader: 'vue-loader',
      options: { compilerOptions: { ...BASELINE_VUE_COMPILER_OPTIONS } }
    });
  }
  for (const fb of SHARED_FALLBACK_LOADERS) {
    if (!out.some(r => sameTest(r, fb.test))) out.push(fb);
  }
  return out;
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
async function generateWebpackConfig(basePath, userConfig = {}) {
  try {
    const baseConfig = await webpackBaseConfig(basePath);
    const localRules = (userConfig.module && userConfig.module.rules) || [];
    // 收口：utils 做最终组装。module 由 utils 产出（applyBaseline 底线注入），子集成拿不到对 module 的最终决定权；
    // plugins 原样收；externals 合并而非覆盖（保住 vue/echarts/element-plus 核心外部依赖不被 local 顶掉）。
    return {
      ...baseConfig,
      ...userConfig,
      externals: { ...(baseConfig.externals || {}), ...(userConfig.externals || {}) },
      plugins: [...(baseConfig.plugins || []), ...(userConfig.plugins || [])],
      module: { rules: applyBaseline(localRules) }
    };
  } catch (error) {
    console.error('Error generating Webpack config:', error);
    throw error; // 抛出错误以便调用者处理
  }
}

// 导出动态生成的 Webpack 配置。applyBaseline 同时导出，供底线契约测试直接调用。
module.exports = function (basePath, userConfig = {}) {
  return generateWebpackConfig(basePath, userConfig);
};
module.exports.applyBaseline = applyBaseline;