import test from 'node:test';
import assert from 'node:assert';
import { validateTimetable } from '../src/services/validator.js';

test('Phase 5: Conflict Validator Unit Tests (Coverage for each violation code)', async (t) => {
  // Base mock helper to construct timetable entry items
  function createEntry(overrides = {}) {
    return {
      id: 1,
      version_id: 1,
      section_id: 1,
      section_name: 'CSE-4A',
      section_strength: 40,
      subject_id: 1,
      subject_code: 'CS201',
      subject_name: 'Data Structures',
      subject_type: 'theory',
      weekly_periods: 3,
      lab_block_length: 1,
      faculty_id: 1,
      faculty_name: 'Dr. Alan Turing',
      max_periods_per_day: 4,
      room_id: 1,
      room_name: 'CR-101',
      room_type: 'classroom',
      room_capacity: 50,
      day_id: 1,
      day_name: 'Monday',
      day_index: 1,
      slot_id: 1,
      slot_no: 1,
      start_time: '09:00',
      end_time: '09:50',
      is_break: 0,
      slot_label: 'Period 1',
      is_lab_block: 0,
      locked: 0,
      ...overrides
    };
  }

  await t.test('Code 1: BREAK_SLOT_USED', () => {
    const entries = [
      createEntry({ is_break: 1, slot_label: 'Tea Break', start_time: '10:40', end_time: '11:00' })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'BREAK_SLOT_USED');
    assert.ok(violation, 'Expected BREAK_SLOT_USED violation');
    assert.strictEqual(violation.severity, 'error');
  });

  await t.test('Code 2: FACULTY_DOUBLE_BOOKED', () => {
    const entries = [
      createEntry({ id: 1, section_id: 1, faculty_id: 1, day_id: 1, slot_id: 1 }),
      createEntry({ id: 2, section_id: 2, faculty_id: 1, day_id: 1, slot_id: 1, room_id: 2 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'FACULTY_DOUBLE_BOOKED');
    assert.ok(violation, 'Expected FACULTY_DOUBLE_BOOKED violation');
  });

  await t.test('Code 3: SECTION_DOUBLE_BOOKED', () => {
    const entries = [
      createEntry({ id: 1, section_id: 1, faculty_id: 1, day_id: 1, slot_id: 1 }),
      createEntry({ id: 2, section_id: 1, faculty_id: 2, day_id: 1, slot_id: 1, room_id: 2 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'SECTION_DOUBLE_BOOKED');
    assert.ok(violation, 'Expected SECTION_DOUBLE_BOOKED violation');
  });

  await t.test('Code 4: ROOM_DOUBLE_BOOKED', () => {
    const entries = [
      createEntry({ id: 1, section_id: 1, faculty_id: 1, room_id: 1, day_id: 1, slot_id: 1 }),
      createEntry({ id: 2, section_id: 2, faculty_id: 2, room_id: 1, day_id: 1, slot_id: 1 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'ROOM_DOUBLE_BOOKED');
    assert.ok(violation, 'Expected ROOM_DOUBLE_BOOKED violation');
  });

  await t.test('Code 5: FACULTY_UNAVAILABLE', () => {
    // Knuth (faculty_id 3) was seeded as unavailable on Saturday (day_id 6)
    const entries = [
      createEntry({ faculty_id: 3, faculty_name: 'Prof. Donald Knuth', day_id: 6, day_name: 'Saturday', slot_id: 1 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'FACULTY_UNAVAILABLE');
    assert.ok(violation, 'Expected FACULTY_UNAVAILABLE violation');
  });

  await t.test('Code 6: ROOM_TYPE_MISMATCH', () => {
    const entries = [
      createEntry({ subject_type: 'lab', room_type: 'classroom', room_name: 'CR-101' })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'ROOM_TYPE_MISMATCH');
    assert.ok(violation, 'Expected ROOM_TYPE_MISMATCH violation');
  });

  await t.test('Code 7: ROOM_CAPACITY_INSUFFICIENT', () => {
    const entries = [
      createEntry({ section_strength: 65, room_capacity: 40, room_name: 'Small Room' })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'ROOM_CAPACITY_INSUFFICIENT');
    assert.ok(violation, 'Expected ROOM_CAPACITY_INSUFFICIENT violation');
  });

  await t.test('Code 8: LAB_BLOCK_NOT_CONTIGUOUS', () => {
    // Two lab slots on same day separated by a non-contiguous gap (slot 1 and slot 4)
    const entries = [
      createEntry({
        id: 1,
        subject_id: 10,
        subject_code: 'CS201L',
        subject_type: 'lab',
        lab_block_length: 2,
        is_lab_block: 1,
        room_type: 'lab',
        room_id: 9,
        slot_id: 1,
        slot_no: 1,
        day_id: 1
      }),
      createEntry({
        id: 2,
        subject_id: 10,
        subject_code: 'CS201L',
        subject_type: 'lab',
        lab_block_length: 2,
        is_lab_block: 1,
        room_type: 'lab',
        room_id: 9,
        slot_id: 4,
        slot_no: 4, // Broken gap!
        day_id: 1
      })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    assert.strictEqual(res.isValid, false);
    const violation = res.violations.find(v => v.code === 'LAB_BLOCK_NOT_CONTIGUOUS');
    assert.ok(violation, 'Expected LAB_BLOCK_NOT_CONTIGUOUS violation');
  });

  await t.test('Code 9: SUBJECT_PERIODS_MISMATCH', () => {
    // Validate an empty timetable version where required subjects are missing
    const res = validateTimetable([], { skipPeriodCountCheck: false });
    // When versionId is present or period count check is active:
    // Testing directly against an artificial version with 0 entries
    const dbTest = validateTimetable(999999);
    const violation = dbTest.violations.find(v => v.code === 'SUBJECT_PERIODS_MISMATCH');
    assert.ok(violation, 'Expected SUBJECT_PERIODS_MISMATCH violation');
  });

  await t.test('Code 10: FACULTY_OVERLOAD_DAY', () => {
    // Faculty with max_periods_per_day = 4 assigned 5 classes on Monday
    const entries = [
      createEntry({ id: 1, faculty_id: 1, max_periods_per_day: 4, day_id: 1, slot_id: 1, slot_no: 1 }),
      createEntry({ id: 2, faculty_id: 1, max_periods_per_day: 4, day_id: 1, slot_id: 2, slot_no: 2 }),
      createEntry({ id: 3, faculty_id: 1, max_periods_per_day: 4, day_id: 1, slot_id: 4, slot_no: 4 }),
      createEntry({ id: 4, faculty_id: 1, max_periods_per_day: 4, day_id: 1, slot_id: 5, slot_no: 5 }),
      createEntry({ id: 5, faculty_id: 1, max_periods_per_day: 4, day_id: 1, slot_id: 7, slot_no: 7 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    const violation = res.violations.find(v => v.code === 'FACULTY_OVERLOAD_DAY');
    assert.ok(violation, 'Expected FACULTY_OVERLOAD_DAY warning');
    assert.strictEqual(violation.severity, 'warning');
  });

  await t.test('Code 11: EXCESSIVE_GAPS', () => {
    // Section classes at slot 1 and slot 7 on same day -> 5 gap periods
    const entries = [
      createEntry({ id: 1, section_id: 1, day_id: 1, slot_id: 1, slot_no: 1, faculty_id: 1 }),
      createEntry({ id: 2, section_id: 1, day_id: 1, slot_id: 7, slot_no: 7, faculty_id: 2 })
    ];
    const res = validateTimetable(entries, { skipPeriodCountCheck: true });
    const violation = res.violations.find(v => v.code === 'EXCESSIVE_GAPS');
    assert.ok(violation, 'Expected EXCESSIVE_GAPS warning');
    assert.strictEqual(violation.severity, 'warning');
  });
});
