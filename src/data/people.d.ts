export const FIRST_NAMES: string[];
export const LAST_NAMES: string[];
export const AVATAR_COLORS: string[];
export const EMAIL_DOMAINS: string[];
export const COMPANIES: string[];
export const DEPARTMENTS: string[];
export const ROLES: string[];
export const CITIES: string[];
export const COUNTRIES: string[];

export const hash: (index: number, seed?: number) => number;
export const pick: <T>(arr: readonly T[], index: number, seed?: number) => T;
export const textColor: (bgColor: string, lightColor?: string, darkColor?: string) => string;

export interface SimpleUser {
  id: number;
  name: string;
  email: string;
  initials: string;
  color: string;
  textColor: string;
}

export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  department: string;
  role: string;
  initials: string;
  color: string;
  textColor: string;
  city: string;
  country: string;
}

export const makeUser: (i: number) => SimpleUser;
export const makeContact: (i: number) => Contact;
export const makeUsers: (count: number, startIndex?: number) => SimpleUser[];
export const makeContacts: (count: number, startIndex?: number) => Contact[];
