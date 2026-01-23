// 注意：此文件由 build.js 自动生成，请勿手动修改，否则会被自动覆盖！
/**
 * @description ecat集成模块的请求实例
 * 
 * @author coffee
 */


// 定义请求实例
const requestInstance = function(config) {
  // 函数调用时，实际执行 call 方法
  return this.call(config);
};

// 为函数添加 init、get、call 方法（作为函数的属性）
requestInstance.init = function(providedRequest) {
  if (this.request) {
      throw new Error('Request instance has already been initialized');
  }
  if (typeof providedRequest!== 'function') {
      throw new Error('The provided request must be a function');
  }
  this.request = providedRequest; // 将请求函数存储在实例的属性中
};

requestInstance.get = function() {
  if (!this.request) {
      throw new Error('Request instance has not been initialized yet');
  }
  return this.request;
};

requestInstance.call = function(config) {
  if (!this.request) {
      throw new Error('Request instance has not been initialized yet');
  }
  return this.request(config); // 调用实际的请求函数
};

// 使用 Proxy 包装函数（此时目标是函数，apply 拦截器生效）
const proxyInstance = new Proxy(requestInstance, {
  apply(target, thisArg, args) {
      return target.apply(proxyInstance, args);
  }
});

export default proxyInstance;