import type { Prompt } from '../logic/types';

/**
 * Throwaway prompt for the How to Play practice dive. Not in the daily pool
 * (it lives outside prompts/), so it never shows up in a real dive.
 */
export const PRACTICE_PROMPT: Prompt = {
  id: 'practice-blues',
  prompt: 'Name a shade of blue',
  category: 'words',
  answers: [
    { name: 'Navy', aliases: ['navy blue'], tier: 'shallows', fact: 'Named after the dark uniforms of the British Royal Navy.' },
    { name: 'Sky blue', tier: 'shallows', fact: 'The sky looks blue because air scatters blue light the most.' },
    { name: 'Light blue', tier: 'shallows', fact: 'Russian has two separate basic words for light and dark blue.' },
    { name: 'Baby blue', tier: 'shallows', fact: 'Pastel blue for baby boys only became the norm in the mid-1900s.' },
    { name: 'Royal blue', tier: 'shallows', fact: 'Said to come from a dress made for Queen Charlotte.' },
    { name: 'Teal', tier: 'red-herring', fact: 'Named after a duck with a blue-green stripe on its head.' },
    { name: 'Turquoise', tier: 'red-herring', fact: 'From the French for "Turkish": the stone came to Europe via Turkey.' },
    { name: 'Cobalt', aliases: ['cobalt blue'], tier: 'shoal', fact: 'A pigment made with cobalt, used in Chinese porcelain for centuries.' },
    { name: 'Azure', tier: 'shoal', fact: 'From lapis lazuli, by way of Persian.' },
    { name: 'Cyan', tier: 'shoal', fact: 'One of the three ink colours in every colour printer.' },
    { name: 'Indigo', tier: 'shoal', fact: 'Newton added it to the rainbow partly to get seven colours.' },
    { name: 'Sapphire', tier: 'shoal', fact: 'Sapphires come in almost every colour except red, which are rubies.' },
    { name: 'Aqua', aliases: ['aquamarine'], tier: 'shoal', fact: 'Latin for water.' },
    { name: 'Denim', aliases: ['denim blue'], tier: 'shoal', fact: 'Denim traditionally gets its blue from indigo dye.' },
    { name: 'Cerulean', tier: 'twilight', fact: 'From the Latin "caeruleum", meaning sky-coloured.' },
    { name: 'Ultramarine', tier: 'twilight', fact: 'Once worth more than gold, ground from Afghan lapis lazuli.' },
    { name: 'Periwinkle', tier: 'twilight', fact: 'Named after a little purple-blue flower.' },
    { name: 'Cornflower', aliases: ['cornflower blue'], tier: 'twilight', fact: 'Named after the blue flower that grows wild in cornfields.' },
    { name: 'Prussian blue', tier: 'twilight', fact: 'Created by accident in Berlin around 1706: the first modern synthetic pigment.' },
    { name: 'Midnight blue', tier: 'twilight', fact: 'Bathy\'s favourite. Obviously.' },
    { name: 'International Klein Blue', aliases: ['klein blue', 'ikb'], tier: 'abyssal', fact: 'A deep ultramarine artist Yves Klein registered in 1960.' },
    { name: 'Egyptian blue', tier: 'abyssal', fact: 'The first known synthetic pigment, made in ancient Egypt.' },
    { name: 'YInMn blue', aliases: ['yinmn', 'yinmin blue', 'mas blue'], tier: 'gem', fact: 'Discovered by accident at Oregon State University in 2009.' },
  ],
};
