/** Real-world depth markers that fade in on the depth scale as you pass them. */
export interface Landmark {
  depth: number;
  label: string;
}

export const LANDMARKS: readonly Landmark[] = [
  { depth: 200, label: 'sunlight gives out' },
  { depth: 332, label: 'deepest scuba dive on record' },
  { depth: 500, label: 'emperor penguins can reach this' },
  { depth: 1000, label: 'midnight zone: 2 °C and black' },
  { depth: 2200, label: 'sperm whales have been tracked this deep' },
  { depth: 3000, label: 'an undersea volcano glows below' },
  { depth: 3800, label: 'the Titanic rests at this depth' },
  { depth: 4000, label: 'abyssal plain: anglerfish country' },
  { depth: 6000, label: 'hadal zone begins' },
  { depth: 7000, label: 'trench floor' },
];
