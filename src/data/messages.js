// src/data/messages.js
// Shared chat message corpus + generator.
// Imported by examples (bundled by esbuild) and API (runtime Bun).

import { pick, hash, AVATAR_COLORS, FIRST_NAMES } from './people.js'

// =============================================================================
// Message Corpus — varied lengths for realistic chat
// =============================================================================

export const SHORT_MESSAGES = [
  'Hey! 👋',
  'What\'s up?',
  'lol',
  '👍',
  'brb',
  'omw',
  'k',
  'nice',
  'true',
  'same',
  'facts',
  '💯',
  '🔥🔥🔥',
  'haha',
  'mood',
  'this >>>',
  'exactly',
  'for real',
  'same here',
  'love this',
  '😂',
  'rip',
  'nah',
  'bet',
  'gg',
  'yep',
  'nope',
  'sure',
  'wow',
  'nice find!',
  '🎵🎵🎵',
  'Added to my favorites',
  'Same!',
  'Not a single skip',
  'Pure magic ✨',
  'Both tbh'
]

export const MEDIUM_MESSAGES = [
  'Just discovered some amazing 1960s Turkish psychedelic rock',
  'Check out this new album I found on Radiooooo 🎶',
  '1970s Brazilian funk. The groove is incredible.',
  'I\'ve been on a 1960s Japanese city pop kick lately',
  'Did you know you can scroll through music by country AND decade?',
  'I spent 3 hours exploring Soviet-era Georgian folk music yesterday',
  'The polyphonic singing is out of this world',
  'Just found 1950s West African highlife music',
  'The rhythmic complexity is insane',
  'Wait, have you tried the random mode?',
  'It drops you into a random country and decade',
  'Yesterday I landed on 1980s Iceland',
  'Found this whole experimental electronic scene from Reykjavik',
  'Has anyone tried making a playlist across continents?',
  'Like following jazz from New Orleans to Paris to Tokyo?',
  'Just pick a decade, then click through countries',
  'I can\'t stop dancing at my desk',
  'The mambo recordings are pure joy',
  'Currently exploring 1920s French chanson',
  'The emotion in those recordings...',
  'Found a hidden gem from 1930s Argentina',
  'Tango orchestras were doing incredible things',
  'The arrangements are so sophisticated',
  'Anyone else obsessed with 1960s Cambodian rock?',
  'Dengue Fever turned me onto it',
  'But the original recordings are even better',
  'Just discovered 1970s Nigerian Afrobeat',
  'Fela\'s stuff is revolutionary',
  'The 20-minute jams are hypnotic',
  'Tony Allen on drums 🥁',
  'One of the greatest drummers ever',
  'I\'ve been exploring 1950s American rockabilly',
  'Carl Perkins, Jerry Lee Lewis era',
  'The energy is unmatched',
  'That Sun Records sound',
  'Capturing lightning in a bottle',
  'Anyone into 1980s New Wave?',
  'Talking Heads, Devo, B-52s',
  'The creativity was off the charts',
  'Currently lost in 1960s Brazilian bossa nova',
  'João Gilberto\'s guitar playing is mesmerizing',
  'Antonio Carlos Jobim\'s melodies',
  'Just tried 1950s Indian film music',
  'The orchestration is incredible',
  'Robert Johnson, Blind Lemon Jefferson',
  'Found some 1930s Django Reinhardt recordings',
  'Gypsy jazz is so underrated',
  'His technique with only two working fingers',
  'Anyone into 1970s German krautrock?',
  'Can, Neu!, Kraftwerk',
  'Kraftwerk basically invented electronic music',
  'Just discovered 1960s Jamaican ska',
  'The Skatalites were incredible',
  'Such a joyful sound',
  'Exploring 1950s Cuban mambo',
  'Tito Puente, Machito',
  'The brass sections 🎺',
  'Latin jazz at its peak',
  'Currently diving into 1940s swing',
  'Duke Ellington, Count Basie',
  'Every instrument has a voice',
  'Mariya Takeuchi, Tatsuro Yamashita',
  'The production quality is insane',
  'So smooth, so polished',
  'The open tunings create such beautiful harmonics',
  'Beyond just the Beatles',
  'The Kinks, The Who, Small Faces',
  'Those vocal harmonies 🎤',
  'Lee \'Scratch\' Perry\'s production',
  'Those dub techniques',
  'Invented remixing basically',
  'King Tubby too',
  'Studio as instrument'
]

export const LONG_MESSAGES = [
  'I\'ve been going down the deepest rabbit hole exploring how music traveled along the Silk Road. You can trace melodic patterns from Chinese traditional music through Central Asian folk songs into Persian classical music and eventually into Andalusian flamenco.',
  'OK so I just spent 4 hours exploring Soviet-era Georgian polyphonic singing and I need everyone to stop what they\'re doing and listen to this immediately. The way multiple voices weave together in these complex harmonic structures that predate Western classical harmony by centuries is absolutely staggering.',
  'The thing about exploring music geographically is that you start to hear connections that history books don\'t teach you. Like how West African griot traditions traveled across the Atlantic and became the foundation for blues, which became jazz, which became funk, which became hip-hop.',
  'I made a playlist that follows the evolution of electronic music across continents and decades: starting with Delia Derbyshire and the BBC Radiophonic Workshop in 1960s UK, through Kraftwerk in 1970s Germany, to Yellow Magic Orchestra in 1970s Japan, then Chicago house and Detroit techno in the 1980s.',
  'Has anyone else noticed how the pentatonic scale appears independently in music from cultures that never had contact? You hear it in West African music, Chinese traditional music, Celtic folk, Native American songs, and Japanese min\'yō. It\'s like a universal musical grammar that humans converge on regardless of geography.',
  'So I started exploring 1950s exotica music — Martin Denny, Les Baxter — and it\'s this weird American fantasy of \"tropical\" music that was actually recorded in Hollywood studios. But then actual musicians from those cultures started incorporating those arrangements back, creating this feedback loop.',
  'I\'ve been tracing the evolution of the drum machine from its first appearance in 1960s easy listening records through to Roland\'s TR-808 becoming the backbone of hip-hop. What strikes me is that an instrument designed for cocktail lounges ended up defining street music.',
  'The story of how Brazilian tropicália mixed psychedelic rock with bossa nova and traditional northeastern music in the late 1960s is one of the most fascinating cultural fusions I\'ve come across. Gilberto Gil and Caetano Veloso were literally arrested for being too innovative.'
]

// =============================================================================
// Chat Users — distinct from people.js users, these are chat personas
// =============================================================================

export const CHAT_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Iris', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul',
  'Quinn', 'Rosa', 'Sam', 'Tara', 'André', 'Björk', 'Carmen', 'Diego',
  'Elena', 'François', 'Gabriela', 'Hans', 'Ingrid', 'Juan', 'Keiko',
  'Lars', 'Maya', 'Nico', 'Olga', 'Pedro', 'Qiao', 'Raj', 'Sofia',
  'Tomas', 'Ulrich', 'Valentina', 'Wei', 'Xiang', 'Yara', 'Zara',
  'Ahmed', 'Bianca', 'Chen', 'Dmitri', 'Esther', 'Fatima', 'Giorgio',
  'Hana', 'Ivan', 'Jasmine', 'Klaus', 'Lucia', 'Marco', 'Nina', 'Omar',
  'Petra', 'Rashid', 'Suki', 'Tariq', 'Ursula', 'Vera', 'Wolfgang',
  'Ximena', 'Yasmin', 'Zhen'
]

export const CHAT_COLORS = [
  '#667eea', '#e06595', '#38a169', '#d97706', '#4facfe', '#f093fb',
  '#fa709a', '#a8edea', '#ffd89b', '#f6d365', '#fbc2eb', '#d299c2',
  '#89f7fe', '#66a6ff', '#f5576c', '#feca57', '#48dbfb', '#ff9ff3',
  '#54a0ff', '#00d2d3', '#5f27cd', '#ee5a6f'
]

// =============================================================================
// Generators
// =============================================================================

/**
 * Get a chat user by index. Deterministic.
 * @param {number} i - 0-based index
 * @returns {{ name: string, initials: string, color: string }}
 */
export const getChatUser = (i) => {
  const name = CHAT_NAMES[i % CHAT_NAMES.length]
  return {
    name,
    initials: name.slice(0, 2).toUpperCase(),
    color: CHAT_COLORS[i % CHAT_COLORS.length]
  }
}

/**
 * Pick a message by index. Deterministic.
 * Distribution: ~30% short, ~50% medium, ~20% long.
 * @param {number} i - 0-based index
 * @returns {string}
 */
export const pickMessage = (i) => {
  const bucket = hash(i, 50) % 10
  if (bucket <= 2) return SHORT_MESSAGES[hash(i, 51) % SHORT_MESSAGES.length]
  if (bucket <= 7) return MEDIUM_MESSAGES[hash(i, 52) % MEDIUM_MESSAGES.length]
  return LONG_MESSAGES[hash(i, 53) % LONG_MESSAGES.length]
}

/**
 * Generate a chat message by index. Deterministic.
 * Returns everything needed to render a message bubble.
 *
 * @param {number} i - 0-based index (chronological order, 0 = oldest)
 * @param {object} [options]
 * @param {number} [options.totalMessages=5000] - total message count (for date distribution)
 * @param {string[]} [options.dateLabels] - pre-generated date labels array
 * @returns {{ id: string, text: string, user: string, initials: string, color: string, isSelf: boolean, time: string, dateSection: number }}
 */
export const makeMessage = (i, options = {}) => {
  const { totalMessages = 5000, dateLabels } = options

  // Assign user (exclude index 0 for "self" messages sent by the viewer)
  const userIdx = hash(i, 60) % CHAT_NAMES.length
  const user = getChatUser(userIdx)

  // Distribute messages across date labels
  const dateLabelCount = dateLabels ? dateLabels.length : 365
  const dayIndex = Math.floor((i / totalMessages) * dateLabelCount)
  const dateSection = Math.min(dayIndex, dateLabelCount - 1)

  // Time within the day (8am – 10pm)
  const messagesPerDay = totalMessages / dateLabelCount
  const indexInDay = i % messagesPerDay
  const hour = 8 + Math.floor((indexInDay / messagesPerDay) * 14)
  const minute = (hash(i, 61) % 60)

  return {
    id: `msg-${i}`,
    text: pickMessage(i),
    user: user.name,
    initials: user.initials,
    color: user.color,
    isSelf: false,
    time: `${hour}:${String(minute).padStart(2, '0')}`,
    dateSection
  }
}

/**
 * Generate a batch of messages.
 * @param {number} count
 * @param {object} [options] - passed to makeMessage
 * @returns {Array}
 */
export const makeMessages = (count, options = {}) =>
  Array.from({ length: count }, (_, i) => makeMessage(i, { ...options, totalMessages: count }))
