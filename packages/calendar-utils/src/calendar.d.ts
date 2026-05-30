export interface GregorianDateParts {
  gy: number;
  gm: number;
  gd: number;
}

export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDateParts;
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateParts;
export function formatIsoDate(parts: GregorianDateParts): string;
export function formatJalaliDate(parts: JalaliDateParts): string;
export function parseJalaliDate(value: string): JalaliDateParts;
export function isValidJalaliDate(value: string): boolean;
export function jalaliToIsoDate(value: string): string;
export function isoDateToJalali(value: string): string;
