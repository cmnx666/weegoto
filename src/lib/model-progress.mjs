// Project completion is independent of the selected timeline node.
export function modelProgress(generation, modelColor = '#9296b2') {
  return generation === 1
    ? { key: 'completed', label: '已完成', color: '#6ee7b7', dash: '' }
    : { key: 'planned', label: '待开展', color: modelColor, dash: '' };
}
