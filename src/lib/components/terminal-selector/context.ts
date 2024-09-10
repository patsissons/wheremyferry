import type { Terminal } from '$lib/client';
import { getContext, setContext } from 'svelte';

const selectorContextKey = 'terminal-selector:selected';

type SelectorHandler = (terminal: Terminal) => void;

export function setSelectedHandler(handler: SelectorHandler) {
  setContext(selectorContextKey, handler);
}

export function getSelectedHandler() {
  return getContext<SelectorHandler>(selectorContextKey);
}
