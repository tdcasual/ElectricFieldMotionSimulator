export function closeContextMenuUi(contextMenu, onClosed) {
  if (contextMenu?.style) {
    contextMenu.style.display = 'none';
  }
  if (typeof onClosed === 'function') {
    onClosed();
  }
}
