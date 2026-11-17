/**
 * Read-only display data from ../content (names, colours, art paths, dialogue).
 * Fine to use in screens. Game RULES (rewards, drops, answers) are never decided here:
 * they come from the API.
 */
import petsJson from '@content/pets.json'
import skillsJson from '@content/skills.json'
import eggsJson from '@content/eggs.json'
import dialogueJson from '@content/dialogue/ch1.json'
import type { Category, PetForm, Rarity } from './api/types'

export const CATEGORY_KO: Record<Category, string> = { digital: '디지털', ai: 'AI', making: '메이킹', computing: '컴퓨팅' }
export const CATEGORY_ICON: Record<Category, string> = { digital: '💾', ai: '🧠', making: '🔧', computing: '💻' }

export const RARITY = Object.fromEntries(
  eggsJson.eggs.map((e) => [e.rarity, { eggKo: e.name_ko, colour: e.colour, need: e.hatch_correct_needed }]),
) as Record<Rarity, { eggKo: string; colour: string; need: number }>

export const SPECIES = Object.fromEntries(petsJson.pets.map((p) => [p.id, p]))
export const SKILLS = Object.fromEntries(skillsJson.skills.map((s) => [s.id, s]))
export const DIALOGUE = dialogueJson

/** URL of a pet drawing in public/art. Level 10 uses the animated shining file. */
export function petArtUrl(speciesId: string, form: PetForm): string {
  const file = form === 'shining' ? 'shining_anim' : form
  return `${import.meta.env.BASE_URL}art/pet_${speciesId}_${file}.svg`
}

/** Replace {pet} and {player} in dialogue text. */
export function fillText(text: string, pet: string, player: string): string {
  return text.replaceAll('{pet}', pet).replaceAll('{player}', player)
}
