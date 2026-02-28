// src/data/people.js
// Shared people data — names, colors, deterministic hash, generators.
// Imported by examples (bundled by esbuild) and API (runtime Bun).
// Each generator returns a minimal shape — consumers add fields as needed.

// =============================================================================
// Seed Data
// =============================================================================

export const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael',
  'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan',
  'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles',
  'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret',
  'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Dorothy', 'Paul',
  'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Timothy',
  'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen',
  'Brenda', 'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole',
  'Brandon', 'Helen', 'Benjamin', 'Samantha', 'Samuel', 'Katherine',
  'Raymond', 'Christine', 'Gregory', 'Debra', 'Frank', 'Rachel', 'Alexander',
  'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine', 'Dennis', 'Maria',
  'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Ruth', 'Jose', 'Julie',
  'Nathan', 'Olivia', 'Henry', 'Joyce', 'Peter', 'Virginia', 'Douglas',
  'Victoria', 'Zachary', 'Kelly', 'Adam', 'Lauren', 'Kyle', 'Christina',
  'Noah', 'Joan', 'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Walter', 'Megan',
  'Christian', 'Andrea', 'Keith', 'Cheryl', 'Roger', 'Hannah', 'Terry',
  'Jacqueline', 'Austin', 'Martha', 'Sean', 'Gloria', 'Gerald', 'Teresa',
  'Carl', 'Ann', 'Harold', 'Sara', 'Dylan', 'Madison', 'Arthur', 'Frances',
  'Lawrence', 'Kathryn', 'Jordan', 'Janice', 'Jesse', 'Jean', 'Bryan',
  'Abigail', 'Billy', 'Alice', 'Bruce', 'Judy', 'Gabriel', 'Sophia', 'Joe',
  'Grace', 'Logan', 'Denise', 'Albert', 'Amber', 'Willie', 'Doris', 'Alan',
  'Marilyn', 'Eugene', 'Danielle', 'Russell', 'Beverly', 'Vincent',
  'Isabella', 'Philip', 'Theresa', 'Bobby', 'Diana', 'Johnny', 'Natalie',
  'Bradley', 'Brittany', 'Roy', 'Charlotte', 'Ralph', 'Marie', 'Louis',
  'Kayla', 'Randy', 'Alexis', 'Wayne', 'Lori'
]

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
  'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris',
  'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan',
  'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos',
  'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood',
  'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross',
  'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan',
  'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
  'Vasquez', 'Simmons', 'Griffin', 'Franco', 'Hart', 'Stevens', 'Henry',
  'Tucker', 'Hunter', 'Daniels', 'Cole', 'Burns', 'May', 'Palmer', 'Walsh',
  'Gibson'
]

export const AVATAR_COLORS = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5',
  '#039be5', '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33',
  '#fdd835', '#ffb300', '#fb8c00', '#f4511e', '#6d4c41', '#757575',
  '#546e7a', '#26a69a', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0',
  '#42a5f5', '#29b6f6', '#26c6da', '#66bb6a', '#9ccc65', '#d4e157',
  '#ffee58', '#ffca28', '#ffa726', '#ff7043', '#8d6e63'
]

export const EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'icloud.com',
  'fastmail.com', 'hey.com', 'zoho.com', 'tutanota.com', 'mail.com'
]

export const COMPANIES = [
  'Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Stark Industries',
  'Wayne Enterprises', 'Cyberdyne', 'Tyrell Corp', 'Aperture Science',
  'Oscorp', 'Massive Dynamic', 'Soylent Corp', 'Rekall', 'Omni Consumer',
  'Weyland-Yutani', 'InGen', 'Wonka Industries', 'Gekko & Co',
  'Sterling Cooper', 'Dunder Mifflin', 'Pied Piper', 'Hooli',
  'Prestige Worldwide', 'Nakatomi Corp', 'Bluth Company', 'LexCorp',
  'Abstergo', 'Dharma Initiative', 'Virtucon', 'Oceanic Airlines',
  'Morley & Associates', 'Vehement Capital', 'Strickland Propane',
  'TelAmeriCorp', 'Planet Express', 'Buy n Large', 'MomCorp',
  'Spacely Sprockets', 'Cogswell Cogs', 'Monsters Inc',
  'Los Pollos Hermanos', 'Gray Matter', 'Beneke Fabricators',
  'Madrigal Electromotive', 'Sandpiper Crossing', 'Mesa Verde',
  'Hamlin Hamlin McGill'
]

export const DEPARTMENTS = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Human Resources', 'Operations', 'Legal', 'Research', 'Support',
  'Product', 'Data Science', 'Security', 'DevOps', 'QA', 'Analytics',
  'Content', 'Partnerships', 'Strategy', 'Infrastructure'
]

export const ROLES = [
  'Software Engineer', 'Senior Engineer', 'Staff Engineer',
  'Principal Engineer', 'Engineering Manager', 'Designer', 'Senior Designer',
  'Product Designer', 'Product Manager', 'Senior PM', 'Data Analyst',
  'Data Scientist', 'DevOps Engineer', 'SRE', 'QA Engineer',
  'Technical Writer', 'Sales Representative', 'Account Executive',
  'Marketing Specialist', 'HR Coordinator', 'Financial Analyst',
  'Legal Counsel', 'Operations Manager', 'Support Engineer',
  'Security Analyst', 'Research Scientist', 'Content Strategist',
  'UX Researcher', 'Frontend Developer', 'Backend Developer',
  'Fullstack Developer', 'Mobile Developer'
]

export const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'San Francisco', 'Seattle', 'Denver', 'Austin', 'Portland', 'Boston',
  'Miami', 'Atlanta', 'Dallas', 'Minneapolis', 'San Diego', 'Nashville',
  'Detroit', 'Philadelphia', 'Charlotte', 'London', 'Paris', 'Berlin',
  'Tokyo', 'Toronto', 'Sydney', 'Amsterdam', 'Stockholm', 'Dublin',
  'Singapore', 'Barcelona', 'Copenhagen', 'Lisbon', 'Prague', 'Vienna',
  'Seoul', 'Taipei', 'Melbourne', 'Vancouver', 'Zurich'
]

export const COUNTRIES = [
  'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States',
  'United States', 'United States', 'United States', 'United States',
  'United Kingdom', 'France', 'Germany', 'Japan', 'Canada', 'Australia',
  'Netherlands', 'Sweden', 'Ireland', 'Singapore', 'Spain', 'Denmark',
  'Portugal', 'Czech Republic', 'Austria', 'South Korea', 'Taiwan',
  'Australia', 'Canada', 'Switzerland'
]

// =============================================================================
// Deterministic Hash
// =============================================================================

/**
 * FNV-1a hash — same index + seed always produces the same output.
 * @param {number} index
 * @param {number} [seed=0]
 * @returns {number} Unsigned 32-bit integer
 */
export const hash = (index, seed = 0) => {
  let h = 2166136261 ^ seed
  h = Math.imul(h ^ (index & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 8) & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 16) & 0xff), 16777619)
  h = Math.imul(h ^ ((index >> 24) & 0xff), 16777619)
  return h >>> 0
}

/**
 * Pick deterministically from an array using index + seed.
 * @template T
 * @param {T[]} arr
 * @param {number} index
 * @param {number} [seed=0]
 * @returns {T}
 */
export const pick = (arr, index, seed = 0) =>
  arr[hash(index, seed) % arr.length]

// =============================================================================
// Generators
// =============================================================================

/**
 * Generate a user by index. Deterministic — same index, same user.
 * Lightweight shape for list examples (basic, scroll-restore, etc).
 *
 * @param {number} i - 0-based index
 * @returns {{ id: number, name: string, email: string, initials: string, color: string }}
 */
export const makeUser = (i) => {
  const firstName = pick(FIRST_NAMES, i, 1)
  const lastName = pick(LAST_NAMES, i, 2)
  const domain = pick(EMAIL_DOMAINS, i, 3)
  const suffix = i >= 1000 ? i.toString(36) : ''

  return {
    id: i + 1,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@${domain}`,
    initials: firstName[0] + lastName[0],
    color: pick(AVATAR_COLORS, i, 4)
  }
}

/**
 * Generate a contact by index. Deterministic.
 * Richer shape for contact list / sticky-headers (A–Z grouped).
 *
 * @param {number} i - 0-based index
 * @returns {{ id: number, firstName: string, lastName: string, email: string, phone: string, company: string, department: string, role: string, initials: string, color: string, city: string, country: string }}
 */
export const makeContact = (i) => {
  const firstName = pick(FIRST_NAMES, i, 1)
  const lastName = pick(LAST_NAMES, i, 2)
  const domain = pick(EMAIL_DOMAINS, i, 3)
  const suffix = i >= 1000 ? i.toString(36) : ''

  // Deterministic phone: (XXX) XXX-XXXX
  const area = 200 + (hash(i, 20) % 800)
  const mid = 200 + (hash(i, 21) % 800)
  const last = 1000 + (hash(i, 22) % 9000)

  const city = pick(CITIES, i, 8)
  const cityIndex = CITIES.indexOf(city)

  return {
    id: i + 1,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@${domain}`,
    phone: `(${area}) ${mid}-${last}`,
    company: pick(COMPANIES, i, 7),
    department: pick(DEPARTMENTS, i, 6),
    role: pick(ROLES, i, 5),
    initials: firstName[0] + lastName[0],
    color: pick(AVATAR_COLORS, i, 4),
    city,
    country: cityIndex >= 0 ? COUNTRIES[cityIndex] : 'United States'
  }
}

/**
 * Generate a batch of users.
 * @param {number} count
 * @param {number} [startIndex=0]
 * @returns {Array}
 */
export const makeUsers = (count, startIndex = 0) =>
  Array.from({ length: count }, (_, i) => makeUser(startIndex + i))

/**
 * Generate a batch of contacts.
 * @param {number} count
 * @param {number} [startIndex=0]
 * @returns {Array}
 */
export const makeContacts = (count, startIndex = 0) =>
  Array.from({ length: count }, (_, i) => makeContact(startIndex + i))
