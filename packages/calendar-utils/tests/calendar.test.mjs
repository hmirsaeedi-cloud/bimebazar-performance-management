import test from "node:test";
import assert from "node:assert/strict";
import {
  gregorianToJalali,
  isoDateToJalali,
  isValidJalaliDate,
  jalaliToGregorian,
  jalaliToIsoDate,
} from "../src/calendar.mjs";

test("converts Nowruz 1403 to Gregorian ISO", () => {
  assert.equal(jalaliToIsoDate("1403-01-01"), "2024-03-20");
});

test("converts Gregorian ISO to Jalali", () => {
  assert.equal(isoDateToJalali("2024-03-20"), "1403-01-01");
});

test("round trips a BimeBazar profile join date", () => {
  const gregorian = jalaliToGregorian(1402, 7, 15);
  assert.deepEqual(gregorianToJalali(gregorian.gy, gregorian.gm, gregorian.gd), {
    jy: 1402,
    jm: 7,
    jd: 15,
  });
});

test("rejects invalid Jalali dates", () => {
  assert.equal(isValidJalaliDate("1402-13-01"), false);
  assert.equal(isValidJalaliDate("1402-12-30"), false);
  assert.equal(isValidJalaliDate("1403-12-30"), true);
});
