type LogoEffectReplayHandler = () => void;

const replayHandlers = new Map<string, Set<LogoEffectReplayHandler>>();

export function requestLogoEffectReplay(playbackKey = "primary") {
  for (const handler of replayHandlers.get(playbackKey) ?? []) handler();
}

export function subscribeLogoEffectReplay(playbackKey: string, handler: LogoEffectReplayHandler) {
  const handlers = replayHandlers.get(playbackKey) ?? new Set<LogoEffectReplayHandler>();
  handlers.add(handler);
  replayHandlers.set(playbackKey, handlers);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) replayHandlers.delete(playbackKey);
  };
}
