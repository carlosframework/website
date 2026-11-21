// 🤖 The quiz's rules, with no DOM: the steps, which brick an answer pulls from the pile, and the verdict. quiz.js
// keeps one state object, { stack, fresh, answers, pulled }, in sessionStorage; every function here returns a new one.

// The twelve statements, in the deck's order (src/_data/quiz-copy.json, quiz.s.<key>.*).
export const KEYS = ['data', 'toolchain', 'onedb', 'idle', 'yaml', 'hello', 'pager', 'hope', 'slow', 'lockin', 'agent', 'backups'];
// The sixteen things the picker offers (quiz.stack.thing.<slug>), in the order the chips show them.
export const THINGS = ['rails', 'postgres', 'redis', 'sidekiq', 'docker', 'kubernetes', 'nginx', 'heroku', 's3', 'cdn', 'lb', 'terraform', 'ci', 'monitoring', 'elasticsearch', 'cron'];
// The brick each fact is about. Where the visitor has it, "Absolutely not" pulls that one; otherwise the top brick.
export const PULL = { toolchain: 'docker', onedb: 'postgres', yaml: 'kubernetes', hello: 'sidekiq', pager: 'redis', idle: 'heroku', lockin: 'heroku' };
// Every step has an address: '' is the intro, then #stack, #1 to #12 and #result.
export const STEPS = ['intro', 'stack', ...KEYS.map((_, i) => String(i + 1)), 'result'];

export const empty = () => ({ stack: [], fresh: false, answers: {}, pulled: {} });

// Anything read back from storage is checked, so a stale or edited value cannot break the page.
export function clean(raw) {
  const s = empty();
  if (!raw || typeof raw !== 'object') return s;
  if (Array.isArray(raw.stack)) s.stack = [...new Set(raw.stack)].filter(t => THINGS.includes(t));
  s.fresh = raw.fresh === true && !s.stack.length;
  for (const k of KEYS) if (raw.answers?.[k] === 'yes' || raw.answers?.[k] === 'no') s.answers[k] = raw.answers[k];
  const left = new Set(s.stack);
  for (const k of KEYS) {
    const b = raw.pulled?.[k];
    if (s.answers[k] === 'no' && left.has(b)) { s.pulled[k] = b; left.delete(b); }
  }
  return s;
}

// What is left of the visitor's pile, bottom first.
export const pile = s => { const gone = new Set(Object.values(s.pulled)); return s.stack.filter(t => !gone.has(t)); };

// Tick or untick a thing. The pile keeps the order things were ticked in (each new brick lands on top), and the
// answers stand: what they pulled is worked out again against the new pile.
export function toggleThing(s, thing, on) {
  const stack = on ? [...s.stack.filter(t => t !== thing), thing] : s.stack.filter(t => t !== thing);
  return replay({ ...s, stack, fresh: false });
}
export function startFresh(s) { return replay({ ...s, stack: [], fresh: true }); }
function replay(s) {
  let out = { ...s, answers: {}, pulled: {} };
  for (const k of KEYS) if (s.answers[k]) out = answer(out, k, s.answers[k]);
  return out;
}

// Answer a statement. "Absolutely not" pulls a brick (the one the fact is about, or the top one; none if the pile is
// empty); "Absolutely" puts back whatever an earlier "Absolutely not" to the same statement had pulled.
export function answer(s, key, value) {
  const answers = { ...s.answers, [key]: value }, pulled = { ...s.pulled };
  delete pulled[key];
  if (value === 'no') {
    const left = pile({ ...s, pulled });
    const brick = left.includes(PULL[key]) ? PULL[key] : left[left.length - 1];
    if (brick) pulled[key] = brick;
  }
  return { ...s, answers, pulled };
}

export const noCount = s => KEYS.filter(k => s.answers[k] === 'no').length;
// All twelve, 7 to 11, or 0 to 6 "Absolutely not" answers.
export function verdict(s) { const n = noCount(s); return n === 12 ? 'all' : n >= 7 ? 'most' : 'few'; }

export const stepOf = hash => { const h = String(hash || '').replace(/^#/, ''); return STEPS.includes(h) ? h : 'intro'; };
export const keyOf = step => KEYS[Number(step) - 1];
export const next = step => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)];
export const prev = step => STEPS[Math.max(0, STEPS.indexOf(step) - 1)];
// Fills {name} placeholders in a string from the copy.
export const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
