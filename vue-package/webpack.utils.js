// Webpack 相关工具函数

/**
 * 深度合并两个对象（支持数组拼接、对象递归合并）
 * @param {Object} target 目标对象（被合并的对象）
 * @param {Object} source 源对象（要合并进去的对象）
 * @returns {Object} 合并后的新对象（不修改原对象）
 * 
 * @author coffee
 */
function deepMerge(target, source) {

  /*
  关键逻辑说明
  数组处理：若两个对象的同名属性均为数组，用 [...targetValue, ...sourceValue] 拼接（顺序是 target 在前，source 在后）。
  嵌套对象处理：若同名属性是对象（非数组），递归调用 deepMerge 合并内部属性。
  普通属性：后面对象（source）的属性值会覆盖前面对象（target）的同名属性值（符合常规对象合并逻辑）。
  新增属性：若 source 有 target 没有的属性，会直接添加到合并结果中。

  注意事项
  该函数是浅拷贝实现，若对象中包含特殊类型（如 Date、RegExp 等），需要额外处理（当前示例未包含，可根据需求扩展）。
  若需要严格不修改原对象，可将 merged 初始化为 JSON.parse(JSON.stringify(target))（深度克隆），但会牺牲性能和能力（根据场景选择）。


  const a = {
      name: "张三",
      tests: [1, 2],
      nested: {
          arr: [3],
          num: 10
      }
  };

  const b = {
      name: "李四",  // 普通属性会被覆盖为 "李四"
      tests: [3, 4, 5],  // 数组会被合并为 [1,2,3,4,5]
      nested: {
          arr: [4, 5],  // 嵌套数组合并为 [3,4,5]
          num: 20,  // 嵌套普通属性覆盖为 20
          newKey: "新增属性"  // 新增属性会被保留
      },
      age: 25  // 新增属性会被保留
  };

  const merged = deepMerge(a, b);
  console.log(merged);
  输出：
  {
      name: "李四",
      tests: [1, 2, 3, 4, 5],
      nested: {
          arr: [3, 4, 5],
          num: 20,
          newKey: "新增属性"
      },
      age: 25
  }

  */

  // 避免修改原对象，创建副本
  const merged = { ...target };

  for (const key in source) {
      if (source.hasOwnProperty(key)) {
          const sourceValue = source[key];
          const targetValue = target[key];

          // 如果是数组，拼接数组
          if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
              merged[key] = [...targetValue, ...sourceValue];
          }
          // 如果是对象且不是数组，递归合并
          else if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
                   typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
              merged[key] = deepMerge(targetValue, sourceValue);
          }
          // 其他情况（普通值或非对象），用源对象的值覆盖
          else {
              merged[key] = sourceValue !== undefined ? sourceValue : targetValue;
          }
      }
  }
  return merged;
}

/**
 * 手动实现的 loader 配置参数获取函数（简化版）
 * @param {Object} context loader 上下文（即 loader 函数中的 this）
 * @returns {Object} 解析后的配置参数对象
 * 
 * @author coffee
 */
function getLoaderOptions(context) {
  // 1. 检查 context 是否存在（loader 上下文中的 this）
  if (!context || typeof context !== 'object') {
      return {};
  }

  // 2. 获取 query 属性（Webpack 会将配置参数挂载到 this.query）
  const query = context.query;

  // 3. 处理对象类型的 options（推荐方式）
  if (typeof query === 'object' && query !== null && !Array.isArray(query)) {
      return query;
  }

  // 4. 处理查询字符串类型（如 '?key=value&num=123'）
  if (typeof query === 'string' && query.startsWith('?')) {
      const params = {};
      const queryString = query.slice(1); // 移除开头的 '?'
      const keyValuePairs = queryString.split('&');

      for (const pair of keyValuePairs) {
          if (!pair) continue; // 跳过空字符串（如 query 为 '?'）
          const [key, value] = pair.split('=');
          if (key) {
              // 解码 URL 编码（如 %20 转空格，%26 转 &）
              const decodedKey = decodeURIComponent(key);
              const decodedValue = value ? decodeURIComponent(value) : true; // 无值时默认为 true（如 '?key' 解析为 { key: true }）
              params[decodedKey] = decodedValue;
          }
      }
      return params;
  }

  // 5. 其他情况返回空对象
  return {};
}

module.exports = { deepMerge, getLoaderOptions };
