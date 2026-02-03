// 注意：此文件由 build.js 自动生成，请勿手动修改，否则会被自动覆盖！
/**
 * @description ecat集成模块的入口文件
 *
 * @author coffee
 */

import {routes, moduleInfo} from "./.config";
import request from "@/utils/request";

export default {
  install(Vue, VueRouter, utils, options) {
    // 注册组件
    // for (const route of routes) {
    //   Vue.component(route.name, route.component);
    // }
    // VueRouter.addRoutes(routes);
    // 注册工具类
    request.init(utils.request);
    return moduleInfo;
  },
};