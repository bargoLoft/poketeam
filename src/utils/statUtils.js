export function getStatColor(value) {
  // Returns a color based on stat value (max 255)
  // Red for low (<50), Orange for medium-low (50-79), Yellow for medium (80-99),
  // Light green (100-129), Green (130-159), Teal for high (160+)
  if (value < 50) return '#ef4444';
  if (value < 80) return '#f97316';
  if (value < 100) return '#eab308';
  if (value < 130) return '#84cc16';
  if (value < 160) return '#22c55e';
  return '#06b6d4';
}

export function getStatPercent(value) {
  // Returns percentage based on max stat of 255
  return Math.min((value / 200) * 100, 100);
}

export const statLabels = {
  hp: 'HP',
  atk: '공격',
  def: '방어',
  spa: '특공',
  spd: '특방',
  spe: '스피드'
};
