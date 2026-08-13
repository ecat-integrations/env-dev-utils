/**
 * 红线测试：验证 utils 底线注入契约。
 *
 * 契约（设计目标"统一 + 兜底"）：不管子集成怎么写 .vue 规则，utils 收口后 .vue 规则里
 * comments:false 必生效（防模板根注释 → Fragment → 宿主 <transition mode="out-in"> 白屏，
 * bug-record-20260807-184548）。local 的其它编译选项（isCustomElement/whitespace）保留；
 * local 没写 .vue 规则时 utils 兜底加一条；缺 .js/.css loader 的（如 data-manager）补兜底，已写的不重复。
 *
 * 运行：node apply-baseline.test.js
 */
const path = require('path');
const utils = require(path.resolve(__dirname, 'webpack.config.js'));
const applyBaseline = utils.applyBaseline;

const VUE = String(/\.vue$/);
const JS = String(/\.js$/);

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}
function count(rules, testStr) {
  return rules.filter(r => r && r.test && String(r.test) === testStr).length;
}
function findVue(rules) {
  return rules.find(r => r && r.test && String(r.test) === VUE);
}

if (typeof applyBaseline !== 'function') {
  console.log('RED: applyBaseline 未导出/未实现');
  process.exit(1);
}

// 1. local .vue 已带 comments:false → 保留
{
  const r = applyBaseline([{ test: /\.vue$/, loader: 'vue-loader', options: { compilerOptions: { comments: false } } }]);
  const vue = findVue(r);
  assert('1. 已带 comments:false 保留', vue && vue.options.compilerOptions.comments === false);
}

// 2. local .vue 带 isCustomElement、无 comments → 补 comments:false，且保留 isCustomElement
{
  const ice = tag => tag === 'flow-form';
  const r = applyBaseline([{ test: /\.vue$/, loader: 'vue-loader', options: { compilerOptions: { isCustomElement: ice } } }]);
  const vue = findVue(r);
  assert('2. 补 comments:false 且保留 isCustomElement',
    vue && vue.options.compilerOptions.comments === false && vue.options.compilerOptions.isCustomElement === ice);
}

// 3. local .vue 写 comments:true → 强行改回 false（底线不可被 local 关掉）
{
  const r = applyBaseline([{ test: /\.vue$/, loader: 'vue-loader', options: { compilerOptions: { comments: true } } }]);
  const vue = findVue(r);
  assert('3. comments:true 强制改回 false', vue && vue.options.compilerOptions.comments === false);
}

// 4. local 无 .vue 规则 → 兜底加一条带 comments:false
{
  const r = applyBaseline([{ test: /\.js$/, loader: 'babel-loader' }]);
  const vue = findVue(r);
  assert('4. 无 .vue 规则兜底加一条', !!vue && vue.options.compilerOptions.comments === false);
}

// 5. 非 .vue 规则不动（local 的 .index.js tailwind 规则等原样保留）
{
  const r = applyBaseline([{ test: /\.index\.js$/, use: [{ loader: 'ecat-tailwind-loader.js' }] }]);
  const idx = r.find(x => x && x.test && String(x.test) === String(/\.index\.js$/));
  assert('5. 非 .vue 规则不动', idx && JSON.stringify(idx.use) === JSON.stringify([{ loader: 'ecat-tailwind-loader.js' }]));
}

// 6. local 无任何规则（data-manager 场景）→ 兜底 .vue + .js + .css，且不重复
{
  const r = applyBaseline([]);
  assert('6. 空规则兜底 .vue', count(r, VUE) === 1 && findVue(r).options.compilerOptions.comments === false);
  assert('6. 空规则兜底 .js(恰一条)', count(r, JS) === 1);
}

// 7. local 已有 .js → 兜底不重复补 .js（避免和 local 的 postcss 变体重复）
{
  const r = applyBaseline([{ test: /\.vue$/, options: { compilerOptions: {} } }, { test: /\.js$/, loader: 'babel-loader' }]);
  assert('7. local 有 .js 时不重复补', count(r, JS) === 1);
}

console.log('\n' + (fail === 0 ? 'ALL GREEN' : 'RED: ' + fail + ' failed') + ' (' + pass + ' passed)');
process.exit(fail === 0 ? 0 : 1);
