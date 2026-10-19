// Project completion is independent of the selected timeline node.
export function modelProgress(generation) {
  return generation === 1
    ? { key: 'completed', label: '已完成', color: '#6ee7b7', dash: '' }
    : { key: 'planned', label: '待开展', color: '#9296b2', dash: '4 3' };
}
