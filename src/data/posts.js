// src/data/posts.js
// Shared social feed post data + generator.
// Imported by examples (bundled by esbuild) and API (runtime Bun).

import { pick, hash, AVATAR_COLORS, FIRST_NAMES, LAST_NAMES } from './people.js'

// =============================================================================
// Post Texts — varied lengths for realistic feed
// =============================================================================

export const SHORT_POSTS = [
  '🎵',
  'Nice!',
  'love this',
  '👍👍👍',
  'haha same',
  'brb',
  'omw!',
  '🔥🔥🔥',
  'mood',
  'facts',
  'this >>>',
  '💯',
  'vibes',
  'same tbh',
  'legend',
  'crying 😭',
  'W',
  'iconic',
  'no way',
  'sheesh'
]

export const MEDIUM_POSTS = [
  'Just discovered 1970s Brazilian funk on Radiooooo and I can\'t stop dancing at my desk. The groove is absolutely infectious.',
  'Has anyone tried exploring music from Mongolia? The throat singing combined with modern production is mind-blowing.',
  'Spent my entire Sunday afternoon going through 1960s Ethiopian jazz. Mulatu Astatke was way ahead of his time.',
  'The algorithm dropped me into 1980s Japanese city pop and now I understand the hype. The production quality is unreal.',
  'Today I learned that psychedelic rock had a massive scene in 1960s Turkey. The guitar tones are completely unique.',
  'Listening to 1950s Cuban mambo at 7am on a Monday and honestly it\'s the best decision I\'ve made this week.',
  'Can we talk about how good 1990s Malian blues is? Ali Farka Touré basically invented a genre.',
  'Random mode dropped me into 1940s Argentina tango and now I\'m emotionally compromised.',
  'Found some incredible 1930s Django Reinhardt recordings. Gypsy jazz is criminally underrated.',
  'Anyone else obsessed with 1960s Cambodian rock? Sinn Sisamouth was a genius taken too soon.',
  'Currently lost in 1920s Parisian café music. Accordion, wine, regret — the full package.',
  'Just tried the decade slider for the first time and ended up in 1970s Nigerian Afrobeat. Fela forever.',
  'The 1960s Jamaican ska scene was pure joy distilled into music. The Skatalites could do no wrong.',
  'I made a playlist that follows jazz from New Orleans to Paris to Tokyo. Three continents, one groove.',
  'Exploring 1950s Indian film music and the orchestration is blowing my mind. Bollywood strings hit different.',
  'Can\'t believe I slept on 1980s Congolese soukous for so long. The guitar work is absolutely dazzling.'
]

export const LONG_POSTS = [
  'I\'ve been going down the deepest rabbit hole exploring how music traveled along the Silk Road. You can trace melodic patterns from Chinese traditional music through Central Asian folk songs into Persian classical music and eventually into Andalusian flamenco. It\'s like an audible map of human migration spanning thousands of years. The pentatonic scales, the ornamentation techniques, the rhythmic patterns — they mutate and evolve but you can hear the common DNA running through all of it.',

  'OK so I just spent 4 hours exploring Soviet-era Georgian polyphonic singing and I need everyone to stop what they\'re doing and listen to this immediately. The way multiple voices weave together in these complex harmonic structures that predate Western classical harmony by centuries is absolutely staggering. UNESCO recognized it as a masterpiece of intangible cultural heritage and honestly they undersold it. Each voice operates independently but they lock together into these resonant overtone patterns that feel almost mathematical in their precision.',

  'The thing about exploring music geographically is that you start to hear connections that history books don\'t teach you. Like how West African griot traditions traveled across the Atlantic with enslaved people and became the foundation for blues, which became jazz, which became funk, which became hip-hop — but simultaneously those same rhythmic patterns went to Cuba and became son, which became salsa, which influenced Afrobeat back in West Africa. It\'s a giant feedback loop spanning centuries and continents. Once you hear it, you can never unhear it. Every genre is a conversation with every other genre.',

  'I made a playlist that follows the evolution of electronic music across continents and decades: starting with Delia Derbyshire and the BBC Radiophonic Workshop in 1960s UK, through Kraftwerk in 1970s Germany, to Yellow Magic Orchestra in 1970s Japan, then Chicago house and Detroit techno in the 1980s, Goa trance from India in the 1990s, and finally the minimal techno scene in 2000s Romania. What strikes me is how each scene took the technology of the previous one and filtered it through their own cultural lens, creating something genuinely new each time.'
]

// =============================================================================
// Image Subjects — gradient placeholders with labels
// =============================================================================

export const IMAGE_SUBJECTS = [
  { label: 'Sunset over the mountains', aspect: 'wide', palette: ['#ff6b35', '#ffa94d', '#c92a2a', '#2b2d42'] },
  { label: 'Street market in Marrakech', aspect: 'tall', palette: ['#e07a5f', '#f2cc8f', '#81b29a', '#3d405b'] },
  { label: 'Cherry blossoms in Kyoto', aspect: 'wide', palette: ['#ffb7c5', '#f8bbd0', '#4a7c59', '#2d3436'] },
  { label: 'Northern lights in Iceland', aspect: 'wide', palette: ['#00b4d8', '#06d6a0', '#073b4c', '#118ab2'] },
  { label: 'Vinyl record collection', aspect: 'square', palette: ['#1a1a2e', '#16213e', '#e94560', '#0f3460'] },
  { label: 'Café in Paris', aspect: 'tall', palette: ['#d4a373', '#ccd5ae', '#e9edc9', '#606c38'] },
  { label: 'Festival crowd at sunset', aspect: 'wide', palette: ['#ff006e', '#fb5607', '#ffbe0b', '#3a0ca3'] },
  { label: 'Old radio dial close-up', aspect: 'square', palette: ['#6b705c', '#a5a58d', '#cb997e', '#ddbea9'] }
]

// =============================================================================
// Tags
// =============================================================================

export const TAGS = [
  ['#music', '#discovery'],
  ['#worldmusic', '#culture'],
  ['#vinyl', '#analog'],
  ['#jazz', '#soul'],
  ['#electronic', '#ambient'],
  ['#folk', '#traditional'],
  ['#radiooooo', '#timetraveling'],
  ['#playlist', '#vibes']
]

// =============================================================================
// Generators
// =============================================================================

/**
 * Pick a post text by index. Deterministic.
 * Also returns whether the post has an image.
 * Distribution: ~20% short, ~40% medium, ~20% long, ~20% image+short.
 *
 * @param {number} i - 0-based index
 * @returns {{ text: string, hasImage: boolean, image: object|null }}
 */
const pickPostContent = (i) => {
  const bucket = hash(i, 70) % 10

  if (bucket <= 1) {
    return { text: SHORT_POSTS[hash(i, 71) % SHORT_POSTS.length], hasImage: false, image: null }
  }
  if (bucket <= 5) {
    const text = MEDIUM_POSTS[hash(i, 72) % MEDIUM_POSTS.length]
    const hasImage = hash(i, 73) % 3 === 0
    return { text, hasImage, image: hasImage ? IMAGE_SUBJECTS[hash(i, 74) % IMAGE_SUBJECTS.length] : null }
  }
  if (bucket <= 7) {
    return { text: LONG_POSTS[hash(i, 75) % LONG_POSTS.length], hasImage: false, image: null }
  }
  // Image post with short caption
  return {
    text: SHORT_POSTS[hash(i, 76) % SHORT_POSTS.length],
    hasImage: true,
    image: IMAGE_SUBJECTS[hash(i, 77) % IMAGE_SUBJECTS.length]
  }
}

/**
 * Generate a social feed post by index. Deterministic.
 *
 * @param {number} i - 0-based index
 * @returns {{ id: number, user: string, initials: string, color: string, text: string, hasImage: boolean, image: object|null, tags: string[], time: string, likes: number, comments: number }}
 */
export const makePost = (i) => {
  const firstName = pick(FIRST_NAMES, i, 80)
  const lastName = pick(LAST_NAMES, i, 81)
  const color = pick(AVATAR_COLORS, i, 82)
  const initials = firstName[0] + lastName[0]

  const { text, hasImage, image } = pickPostContent(i)
  const tags = TAGS[hash(i, 83) % TAGS.length]

  const hours = Math.floor(i / 4)
  const time = hours < 24
    ? `${hours}h ago`
    : `${Math.floor(hours / 24)}d ago`

  const likes = Math.floor(Math.abs(Math.sin(i * 2.1)) * 500)
  const comments = Math.floor(Math.abs(Math.cos(i * 1.7)) * 80)

  return {
    id: i,
    user: `${firstName} ${lastName}`,
    initials,
    color,
    text,
    hasImage,
    image,
    tags,
    time,
    likes,
    comments
  }
}

/**
 * Generate a batch of posts.
 * @param {number} count
 * @param {number} [startIndex=0]
 * @returns {Array}
 */
export const makePosts = (count, startIndex = 0) =>
  Array.from({ length: count }, (_, i) => makePost(startIndex + i))
