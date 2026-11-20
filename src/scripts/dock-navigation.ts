import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

type Callbacks = {
  start(to: URL): void;
  finish(cancelled: boolean): void;
};

/**
 * Dock 的导航生命周期；由持久 Dock 的单次 bind 调用，不持有视觉/天气状态。
 * Astro 的 preparation 可能在 swap 前中止，必须同时跟踪 signal、loader 与过渡结束。
 * 每个异步出口绑定原 preparation，旧导航不能结束新导航；结算时移除 abort 监听。
 */
export function bindDockNavigation(
  document: Document,
  callbacks: Callbacks,
  schedule: (callback: FrameRequestCallback) => number = requestAnimationFrame,
): void {
  let current: TransitionBeforePreparationEvent | null = null;
  let removeAbort: (() => void) | undefined;

  const finish = (event: TransitionBeforePreparationEvent, cancelled: boolean) => {
    if (current !== event) return;
    removeAbort?.();
    removeAbort = undefined;
    current = null;
    callbacks.finish(cancelled);
  };

  document.addEventListener('astro:before-preparation', (event) => {
    removeAbort?.();
    current = event;
    const cancel = () => finish(event, true);
    event.signal.addEventListener('abort', cancel, { once: true });
    removeAbort = () => event.signal.removeEventListener('abort', cancel);
    callbacks.start(event.to);

    // 等同一 dispatch 的后续监听器完成，处理 preventDefault / 已中止的 signal。
    queueMicrotask(() => {
      if (event.defaultPrevented || event.signal.aborted) cancel();
    });

    // loader 是 Astro 公开的扩展点；保留接收者、完成及原异常，不改变 Router 的取消决定。
    const loader = event.loader;
    event.loader = async () => {
      try {
        await loader.call(event);
      } catch (error) {
        cancel();
        throw error;
      }
      if (event.defaultPrevented || event.signal.aborted) cancel();
    };
  });

  document.addEventListener('astro:before-swap', (event: TransitionBeforeSwapEvent) => {
    const preparation = current;
    if (!preparation || preparation.signal !== event.signal) return;
    if (event.viewTransition) {
      event.viewTransition.finished.then(
        () => finish(preparation, false),
        () => finish(preparation, true),
      );
    } else {
      schedule(() => finish(preparation, false));
    }
  });
}
