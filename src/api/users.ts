// src/api/users.ts
// Deterministic user data generator — same index always produces same user
// Supports 1M+ items generated on-the-fly with zero storage

// =============================================================================
// Seed Data
// =============================================================================

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna',
  'Kenneth', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Ruth',
  'Jose', 'Julie', 'Nathan', 'Olivia', 'Henry', 'Joyce', 'Peter', 'Virginia',
  'Douglas', 'Victoria', 'Zachary', 'Kelly', 'Adam', 'Lauren', 'Kyle', 'Christina',
  'Noah', 'Joan', 'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Walter', 'Megan',
  'Christian', 'Andrea', 'Keith', 'Cheryl', 'Roger', 'Hannah', 'Terry', 'Jacqueline',
  'Austin', 'Martha', 'Sean', 'Gloria', 'Gerald', 'Teresa', 'Carl', 'Ann',
  'Harold', 'Sara', 'Dylan', 'Madison', 'Arthur', 'Frances', 'Lawrence', 'Kathryn',
  'Jordan', 'Janice', 'Jesse', 'Jean', 'Bryan', 'Abigail', 'Billy', 'Alice',
  'Bruce', 'Judy', 'Gabriel', 'Sophia', 'Joe', 'Grace', 'Logan', 'Denise',
  'Albert', 'Amber', 'Willie', 'Doris', 'Alan', 'Marilyn', 'Eugene', 'Danielle',
  'Russell', 'Beverly', 'Vincent', 'Isabella', 'Philip', 'Theresa', 'Bobby', 'Diana',
  'Johnny', 'Natalie', 'Bradley', 'Brittany', 'Roy', 'Charlotte', 'Ralph', 'Marie',
  'Louis', 'Kayla', 'Randy', 'Alexis', 'Wayne', 'Lori'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
  'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
  'Vasquez', 'Simmons', 'Griffin', 'Franco', 'Hart', 'Stevens', 'Henry', 'Tucker',
  'Hunter', 'Daniels', 'Cole', 'Burns', 'May', 'Palmer', 'Walsh', 'Gibson'
]

const COMPANIES = [
  'Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Stark Industries',
  'Wayne Enterprises', 'Cyberdyne', 'Tyrell Corp', 'Aperture Science', 'Oscorp',
  'Massive Dynamic', 'Soylent Corp', 'Rekall', 'Omni Consumer', 'Weyland-Yutani',
  'InGen', 'Wonka Industries', 'Gekko & Co', 'Sterling Cooper', 'Dunder Mifflin',
  'Pied Piper', 'Hooli', 'Prestige Worldwide', 'Nakatomi Corp', 'Bluth Company',
  'LexCorp', 'Abstergo', 'Dharma Initiative', 'Virtucon', 'Oceanic Airlines',
  'Morley & Associates', 'Vehement Capital', 'Strickland Propane', 'TelAmeriCorp',
  'Planet Express', 'Buy n Large', 'MomCorp', 'Spacely Sprockets', 'Cogswell Cogs',
  'Monsters Inc', 'Los Pollos Hermanos', 'Gray Matter', 'Beneke Fabricators',
  'Madrigal Electromotive', 'Sandpiper Crossing', 'Mesa Verde', 'Hamlin Hamlin McGill'
]

const DEPARTMENTS = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Human Resources', 'Operations', 'Legal', 'Research', 'Support',
  'Product', 'Data Science', 'Security', 'DevOps', 'QA',
  'Analytics', 'Content', 'Partnerships', 'Strategy', 'Infrastructure'
]

const ROLES = [
  'Software Engineer', 'Senior Engineer', 'Staff Engineer', 'Principal Engineer',
  'Engineering Manager', 'Designer', 'Senior Designer', 'Product Designer',
  'Product Manager', 'Senior PM', 'Data Analyst', 'Data Scientist',
  'DevOps Engineer', 'SRE', 'QA Engineer', 'Technical Writer',
  'Sales Representative', 'Account Executive', 'Marketing Specialist', 'HR Coordinator',
  'Financial Analyst', 'Legal Counsel', 'Operations Manager', 'Support Engineer',
  'Security Analyst', 'Research Scientist', 'Content Strategist', 'UX Researcher',
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Mobile Developer'
]

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'San Francisco', 'Seattle', 'Denver', 'Austin', 'Portland',
  'Boston', 'Miami', 'Atlanta', 'Dallas', 'Minneapolis',
  'San Diego', 'Nashville', 'Detroit', 'Philadelphia', 'Charlotte',
  'London', 'Paris', 'Berlin', 'Tokyo', 'Toronto',
  'Sydney', 'Amsterdam', 'Stockholm', 'Dublin', 'Singapore',
  'Barcelona', 'Copenhagen', 'Lisbon', 'Prague', 'Vienna',
  'Seoul', 'Taipei', 'Melbourne', 'Vancouver', 'Zurich'
]

const COUNTRIES = [
  'United States', 'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States', 'United States',
  'United Kingdom', 'France', 'Germany', 'Japan', 'Canada',
  'Australia', 'Netherlands', 'Sweden', 'Ireland', 'Singapore',
  'Spain', 'Denmark', 'Portugal', 'Czech Republic', 'Austria',
  'South Korea', 'Taiwan', 'Australia', 'Canada', 'Switzerland'
]

const EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'icloud.com',
  'fastmail.com', 'hey.com', 'zoho.com', 'tutanota.com', 'mail.com'
]

const STATUSES = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive', 'pending', 'suspended'] as const

const AVATAR_COLORS = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab',
  '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
  '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00',
  '#f4511e', '#6d4c41', '#757575', '#546e7a', '#26a69a',
  '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0', '#42a5f5',
  '#29b6f6', '#26c6da', '#66bb6a', '#9ccc65', '#d4e157',
  '#ffee58', '#ffca28', '#ffa726', '#ff7043', '#8d6e63'
]

// =============================================================================
// Deterministic Hash
// =============================================================================

/**
 * Simple deterministic hash — same input always produces the same output.
 * Uses FNV-1a variant for good distribution with minimal computation.
 */
const hash = (index: number, seed: number = 0): number => {
  let h = 2166136261 ^ seed
  h = Math.imul(h ^ (index & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 8) & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 16) & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 24) & 0xff), 16777619)
  return h >>> 0
}

/** Pick deterministically from an array using index + seed */
const pick = <T>(arr: readonly T[], index: number, seed: number = 0): T =>
  arr[hash(index, seed) % arr.length]

// =============================================================================
// User Type
// =============================================================================

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  avatar: string
  avatarColor: string
  role: string
  department: string
  company: string
  city: string
  country: string
  status: string
  joinedYear: number
}

// =============================================================================
// Configuration
// =============================================================================

export const DEFAULT_TOTAL = 1_000_000
export const MAX_LIMIT = 200

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate a single user by index (1-based ID).
 * Fully deterministic — calling with the same index always returns the same user.
 */
export const generateUser = (index: number): User => {
  const id = index
  const firstName = pick(FIRST_NAMES, index, 1)
  const lastName = pick(LAST_NAMES, index, 2)
  const domain = pick(EMAIL_DOMAINS, index, 3)

  // Email: lowercase first.last + suffix to avoid collisions
  const emailSuffix = index > 1000 ? index.toString(36) : ''
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@${domain}`

  const avatar = firstName[0] + lastName[0]
  const avatarColor = pick(AVATAR_COLORS, index, 4)
  const role = pick(ROLES, index, 5)
  const department = pick(DEPARTMENTS, index, 6)
  const company = pick(COMPANIES, index, 7)
  const city = pick(CITIES, index, 8)
  const cityIndex = CITIES.indexOf(city)
  const country = cityIndex >= 0 ? COUNTRIES[cityIndex] : 'United States'
  const status = pick(STATUSES, index, 10)
  const joinedYear = 2015 + (hash(index, 11) % 11) // 2015–2025

  return {
    id,
    firstName,
    lastName,
    email,
    avatar,
    avatarColor,
    role,
    department,
    company,
    city,
    country,
    status,
    joinedYear
  }
}

/**
 * Generate a page of users.
 * Returns the exact shape vlist's AdapterResponse expects.
 */
export const getUsers = (
  offset: number,
  limit: number,
  total: number = DEFAULT_TOTAL
): { items: User[]; total: number; hasMore: boolean } => {
  const clamped = Math.min(limit, MAX_LIMIT)
  const start = Math.max(0, offset)
  const end = Math.min(start + clamped, total)

  const items: User[] = []
  for (let i = start; i < end; i++) {
    items.push(generateUser(i + 1)) // 1-based IDs
  }

  return {
    items,
    total,
    hasMore: end < total
  }
}

/**
 * Get a single user by ID (1-based).
 * Returns null if out of range.
 */
export const getUserById = (id: number, total: number = DEFAULT_TOTAL): User | null => {
  if (id < 1 || id > total) return null
  return generateUser(id)
}
