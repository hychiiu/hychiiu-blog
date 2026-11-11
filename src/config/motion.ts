/**
 * JS 驱动动画的参数（docs/DESIGN.md §6、§10）。CSS 里的时长 / 曲线在 styles/tokens.css。
 * k 为指数插值速率（1/s）：v += (t − v)(1 − e^(−k·dt))，数值越大收敛越快，永不过冲。
 */
export const dockMotion = {
  /** 最大放大倍数 */
  maxScale: 1.28,
  /** 余弦衰减半径（以槽位计，约影响上下各两项） */
  falloffSlots: 2.5,
  kScale: 18,
  kPointer: 24,
  kDot: 20,
  epsilon: 0.0005,
  /** 图标字形尺寸（px），与 Dock.astro 一致 */
  glyph: 20,
  /** 激活点与字形的间距（px） */
  dotGap: 6,
};
