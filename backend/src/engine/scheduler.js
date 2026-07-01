// backend/src/engine/scheduler.js
// ================================================================
// S³ Auto-Timetable Scheduler v2
// Enhanced constraints + per-class schedule config
// ================================================================

const DAYS = [0, 1, 2, 3, 4];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function schedule(input) {
  const {
    sections,
    teachers,
    assignments,
    constraints = [],
    periodsPerDay = 7,
    classConfigs = {},
  } = input;

  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
  const constraintMap = buildConstraintMap(constraints);

  const sectionPeriods = {};
  for (const s of sections) {
    const cfg = classConfigs[s.id];
    sectionPeriods[s.id] = cfg?.periodsPerDay || periodsPerDay;
  }

  // Build required slots — handle double periods
  const required = [];
  for (const a of assignments) {
    const count = a.periodsPerWeek || 1;
    if (a.isDouble) {
      const pairs = Math.floor(count / 2);
      const singles = count % 2;
      for (let i = 0; i < pairs; i++) {
        required.push({ ...a, _double: true, _id: `${a.teacherId}-${a.subjectId}-${a.sectionId}-dp${i}` });
      }
      for (let i = 0; i < singles; i++) {
        required.push({ ...a, _double: false, _id: `${a.teacherId}-${a.subjectId}-${a.sectionId}-s${i}` });
      }
    } else {
      for (let i = 0; i < count; i++) {
        required.push({ ...a, _double: false, _id: `${a.teacherId}-${a.subjectId}-${a.sectionId}-${i}` });
      }
    }
  }

  shuffleArray(required);

  const sectionGrid = {};
  const teacherGrid = {};
  for (const s of sections) {
    sectionGrid[s.id] = {};
    for (const d of DAYS) sectionGrid[s.id][d] = {};
  }
  for (const t of teachers) {
    teacherGrid[t.id] = {};
    for (const d of DAYS) teacherGrid[t.id][d] = {};
  }

  const teacherHours = Object.fromEntries(teachers.map(t => [t.id, 0]));
  const teacherDayCount = Object.fromEntries(
    teachers.map(t => [t.id, Object.fromEntries(DAYS.map(d => [d, 0]))])
  );

  const result = [];
  const conflicts = [];

  for (const req of required) {
    const teacher = teacherMap[req.teacherId];
    const maxHours = teacher?.maxHoursPerWeek || 999;
    const maxPerDay = getConstraintValue(constraintMap[req.teacherId], 'MAX_PER_DAY') || 999;
    const maxConsec = getConstraintValue(constraintMap[req.teacherId], 'MAX_CONSECUTIVE') || 4;
    const sectionMaxPeriods = sectionPeriods[req.sectionId] || periodsPerDay;
    const cfg = classConfigs[req.sectionId] || {};
    const breakPeriods = cfg.breakAfterPeriods || [];

    if (teacherHours[req.teacherId] >= maxHours) {
      conflicts.push({ type: 'MAX_HOURS_EXCEEDED', teacherId: req.teacherId, message: `${teacher?.name} reached max hours` });
      continue;
    }

    const candidates = [];

    for (const day of DAYS) {
      if (hasConstraint(constraintMap[req.teacherId], 'DAY_OFF', day)) continue;
      if (teacherDayCount[req.teacherId][day] >= maxPerDay) continue;

      for (let period = 1; period <= sectionMaxPeriods; period++) {
        if (breakPeriods.includes(period)) continue;

        if (req._double) {
          const next = period + 1;
          if (next > sectionMaxPeriods || breakPeriods.includes(next)) continue;
          if (
            isValidPlacement(req, day, period, sectionGrid, teacherGrid, constraintMap, sectionMaxPeriods, result, maxConsec, cfg) &&
            !sectionGrid[req.sectionId]?.[day]?.[next] &&
            !teacherGrid[req.teacherId]?.[day]?.[next]
          ) {
            candidates.push({ day, period, score: scoreSlot(req, day, period, result, sectionMaxPeriods, constraintMap), double: true });
          }
        } else {
          if (isValidPlacement(req, day, period, sectionGrid, teacherGrid, constraintMap, sectionMaxPeriods, result, maxConsec, cfg)) {
            candidates.push({ day, period, score: scoreSlot(req, day, period, result, sectionMaxPeriods, constraintMap), double: false });
          }
        }
      }
    }

    if (candidates.length === 0) {
      conflicts.push({ type: 'NO_VALID_SLOT', teacherId: req.teacherId, subjectId: req.subjectId, sectionId: req.sectionId, message: `Could not place ${req._id}` });
      continue;
    }

    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];

    const slot = { teacherId: req.teacherId, subjectId: req.subjectId, sectionId: req.sectionId, day: best.day, period: best.period, isDouble: false };
    sectionGrid[req.sectionId][best.day][best.period] = slot;
    teacherGrid[req.teacherId][best.day][best.period] = slot;
    teacherHours[req.teacherId]++;
    teacherDayCount[req.teacherId][best.day]++;
    result.push(slot);

    if (best.double) {
      const slot2 = { ...slot, period: best.period + 1, isDouble: true };
      sectionGrid[req.sectionId][best.day][best.period + 1] = slot2;
      teacherGrid[req.teacherId][best.day][best.period + 1] = slot2;
      teacherHours[req.teacherId]++;
      teacherDayCount[req.teacherId][best.day]++;
      result.push(slot2);
    }
  }

  return {
    success: conflicts.length === 0,
    slots: result,
    conflicts,
    stats: {
      totalRequired: required.length,
      placed: result.length,
      conflicts: conflicts.length,
      teacherHours: Object.fromEntries(teachers.map(t => [t.id, { name: t.name, hours: teacherHours[t.id], max: t.maxHoursPerWeek }])),
    },
  };
}

function isValidPlacement(req, day, period, sectionGrid, teacherGrid, constraintMap, periodsPerDay, placed, maxConsec, classCfg) {
  if (sectionGrid[req.sectionId]?.[day]?.[period]) return false;
  if (teacherGrid[req.teacherId]?.[day]?.[period]) return false;

  const cs = constraintMap[req.teacherId] || [];
  const breakAfter = classCfg?.breakAfterPeriods || [];
  const totalPeriods = classCfg?.periodsPerDay || periodsPerDay;

  for (const c of cs) {
    switch (c.type) {
      case 'UNAVAILABLE':
        if ((c.day === null || c.day === day) && (c.period === null || c.period === period)) return false;
        break;
      case 'NO_LAST_PERIOD':
        if (period === totalPeriods) return false;
        break;
      case 'NO_FIRST_PERIOD':
        if (period === 1) return false;
        break;
      case 'LATE_START':
        if (period <= (parseInt(c.value) || 2)) return false;
        break;
      case 'EARLY_FINISH':
        if (period >= totalPeriods - (parseInt(c.value) || 1)) return false;
        break;
      case 'BEFORE_BREAK_ONLY': {
        const firstBreak = breakAfter.length > 0 ? breakAfter[0] : Math.floor(totalPeriods / 2);
        if (period > firstBreak) return false;
        break;
      }
      case 'AFTER_BREAK_ONLY': {
        const firstBreak = breakAfter.length > 0 ? breakAfter[0] : Math.floor(totalPeriods / 2);
        if (period <= firstBreak) return false;
        break;
      }
      case 'DAY_OFF':
        if (c.day === day) return false;
        break;
      case 'MIN_REST': {
        const todayPeriods = placed.filter(s => s.teacherId === req.teacherId && s.day === day).map(s => s.period);
        if (todayPeriods.includes(period - 1) || todayPeriods.includes(period + 1)) return false;
        break;
      }
    }
  }

  // No same subject twice in same day for same section
  if (placed.some(s => s.sectionId === req.sectionId && s.subjectId === req.subjectId && s.day === day)) return false;

  // Max consecutive
  const teacherToday = placed.filter(s => s.teacherId === req.teacherId && s.day === day).map(s => s.period);
  if (getConsecutiveCount(teacherToday, period) >= maxConsec) return false;

  return true;
}

function scoreSlot(req, day, period, placed, periodsPerDay, constraintMap) {
  let score = 0;
  const cs = constraintMap[req.teacherId] || [];

  // Penalize same day for same subject
  if (placed.some(s => s.sectionId === req.sectionId && s.subjectId === req.subjectId && s.day === day)) score += 100;

  // Morning/afternoon subject preferences
  if (cs.some(c => c.type === 'MORNING_SUBJECT' && String(c.value) === String(req.subjectId))) score += period * 3;
  if (cs.some(c => c.type === 'AFTERNOON_SUBJECT' && String(c.value) === String(req.subjectId))) score += (periodsPerDay - period) * 3;

  // Teacher time preferences
  if (cs.some(c => c.type === 'PREFER_MORNING')) score += period * 1.5;
  if (cs.some(c => c.type === 'PREFER_AFTERNOON')) score += (periodsPerDay - period) * 1.5;

  // Consecutive penalty
  const todayPeriods = placed.filter(s => s.teacherId === req.teacherId && s.day === day).map(s => s.period);
  if (getConsecutiveCount(todayPeriods, period) >= 3) score += 15;

  // Spread across days
  const loadToday = placed.filter(s => s.teacherId === req.teacherId && s.day === day).length;
  score += loadToday * (cs.some(c => c.type === 'BALANCED_DAYS') ? 10 : 5);

  score += period * 0.3;
  score += Math.random() * 0.5;

  return score;
}

function buildConstraintMap(constraints) {
  const map = {};
  for (const c of constraints) {
    if (!map[c.teacherId]) map[c.teacherId] = [];
    map[c.teacherId].push(c);
  }
  return map;
}

function hasConstraint(cs, type, day = null) {
  if (!cs) return false;
  return cs.some(c => c.type === type && (day === null || c.day === null || c.day === day));
}

function getConstraintValue(cs, type) {
  if (!cs) return null;
  const c = cs?.find(c => c.type === type);
  return c?.value ? parseInt(c.value) : null;
}

function getConsecutiveCount(existingPeriods, newPeriod) {
  const all = [...existingPeriods, newPeriod].sort((a, b) => a - b);
  let maxRun = 1, run = 1;
  for (let i = 1; i < all.length; i++) {
    if (all[i] === all[i - 1] + 1) { run++; maxRun = Math.max(maxRun, run); }
    else run = 1;
  }
  return maxRun;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

module.exports = { schedule, DAYS, DAY_NAMES };
