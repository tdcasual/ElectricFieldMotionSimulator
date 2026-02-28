export function fieldPosition() {
  return { key: 'x', label: 'X', type: 'number', step: 1 };
}

export function fieldSize() {
  return [
    { key: 'width', label: '宽度', type: 'number', min: 0, step: 1 },
    { key: 'height', label: '高度', type: 'number', min: 0, step: 1 }
  ];
}
