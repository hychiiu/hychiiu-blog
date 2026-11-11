/**
 * Dock 客户端入口（docs/DESIGN.md §7 Dock、§6 动效）。
 * - controls：主题 / 语言按钮与跳转后的状态同步
 * - engine：悬停放大（临界阻尼指数插值，无回弹），状态挂在 window 上，跨页面不重置
 */
import { bindControls, syncDock } from './controls';
import { initEngine, kick } from './engine';

const sync = () => {
  syncDock();
  kick();
};

bindControls();
document.addEventListener('astro:page-load', () => {
  initEngine();
  sync();
});
document.addEventListener('astro:after-swap', sync);
