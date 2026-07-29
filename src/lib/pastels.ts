const PASTELS = [
  "#F8C8DC",
  "#CDE7FF",
  "#D8F3DC",
  "#FFE5B4",
  "#E6D5FF",
  "#FFF1A8",
  "#C8F0E8",
  "#FFD6C9",
  "#D7E3FC",
  "#E8F5C8",
  "#FADADD",
  "#D8E2DC",
  "#FDE2E4",
  "#E2ECE9",
  "#BEE1E6",
  "#F0EFEB",
];

export function pastelForIndex(index: number): string {
  if (index < PASTELS.length) {
    return PASTELS[index];
  }

  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 70% 87%)`;
}
