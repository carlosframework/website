// 🤖 The quiz's rules, with no DOM: the ecosystems and their typical stacks, the steps, which statements a visitor
// gets, which brick an answer pulls from the pile, the verdict and where each brick goes in the result. quiz.js keeps
// one state object, { eco, stack, fresh, answers, pulled }, in sessionStorage; every function here returns a new one.
// Every word is in src/_data/quiz-copy.json: quiz.eco.<eco>, quiz.stack.thing.<thing>, quiz.stack.group.<group>.

// The twelve statements everyone can get, in the deck's order (quiz.s.<key>.*). The no-script page is these.
export const KEYS = ['data', 'toolchain', 'onedb', 'idle', 'yaml', 'hello', 'pager', 'hope', 'slow', 'lockin', 'agent', 'backups'];
// One bonus statement per ecosystem, in place of statement 2 (the generic toolchain one); and one for anyone running
// Kubernetes, in place of statement 5 (the YAML one). "Not sure" keeps both generic statements.
export const BONUS = { rails: 'b-rails', laravel: 'b-php', django: 'b-django', node: 'b-node', java: 'b-java', dotnet: 'b-dotnet', wordpress: 'b-wordpress', go: 'b-go', supabase: 'b-supabase' };
export const HELM = 'b-helm';
export const ALL_KEYS = [...KEYS, ...Object.values(BONUS), HELM];
export function keysFor(s) {
  const keys = [...KEYS];
  if (BONUS[s.eco]) keys[1] = BONUS[s.eco];
  if (s.stack.includes('kubernetes')) keys[4] = HELM;
  return keys;
}

// Where each kind of thing goes in the result: into the app, run by Carloku, or still the visitor's.
export const GROUPS = ['app', 'db', 'jobs', 'cache', 'realtime', 'hosting', 'shared'];
// Every thing the picker can offer: its group on the picker and where it goes in the result.
const T = (group, to) => ({ group, to });
export const THINGS = {
  puma: T('app', 'app'), passenger: T('app', 'app'), phpfpm: T('app', 'app'), nginx: T('app', 'app'), apache: T('app', 'app'), gunicorn: T('app', 'app'), uvicorn: T('app', 'app'),
  nodejs: T('app', 'app'), pm2: T('app', 'app'), tomcat: T('app', 'app'), kestrel: T('app', 'app'), edgefn: T('app', 'app'),
  postgres: T('db', 'app'), mysql: T('db', 'app'), sqlserver: T('db', 'app'), mongodb: T('db', 'app'), prisma: T('db', 'app'), supadb: T('db', 'app'),
  sidekiq: T('jobs', 'app'), horizon: T('jobs', 'app'), celery: T('jobs', 'app'), rabbitmq: T('jobs', 'app'), bullmq: T('jobs', 'app'), hangfire: T('jobs', 'app'),
  kafka: T('jobs', 'app'), quartz: T('jobs', 'app'), wpcron: T('jobs', 'app'), asynq: T('jobs', 'app'), schedfn: T('jobs', 'app'),
  redis: T('cache', 'app'), memcached: T('cache', 'app'),
  actioncable: T('realtime', 'app'), reverb: T('realtime', 'app'), channels: T('realtime', 'app'), socketio: T('realtime', 'app'), signalr: T('realtime', 'app'),
  springws: T('realtime', 'app'), suparealtime: T('realtime', 'app'),
  heroku: T('hosting', 'carloku'), forge: T('hosting', 'carloku'), render: T('hosting', 'carloku'), vercel: T('hosting', 'carloku'), azure: T('hosting', 'carloku'),
  aws: T('hosting', 'carloku'), wpengine: T('hosting', 'carloku'), flyio: T('hosting', 'carloku'), netlify: T('hosting', 'carloku'),
  lb: T('shared', 'carloku'), cdn: T('shared', 'carloku'), docker: T('shared', 'carloku'), kubernetes: T('shared', 'carloku'), terraform: T('shared', 'carloku'),
  ci: T('shared', 'yours'), monitoring: T('shared', 'yours'), elasticsearch: T('shared', 'app'), cron: T('shared', 'app'),
  supabase: T('shared', 'app'), auth0: T('shared', 'app'), clerk: T('shared', 'app'), pusher: T('shared', 'app'),
};
export const SHARED = Object.keys(THINGS).filter(t => THINGS[t].group === 'shared');
// Always in the result, whatever was picked: Carloku also does TLS and backups; the code repository stays yours.
export const ALWAYS = { carloku: ['tls', 'backups'], yours: ['repo'] };

// The ecosystems (quiz.eco.<eco>), each with a typical stack, ticked to start with, and a few alternatives
// offered unticked. Every ecosystem also gets the shared group, unticked. Go is "halfway there": only what is left.
export const ECOS = {
  rails: { ticked: ['puma', 'postgres', 'sidekiq', 'redis', 'actioncable', 'heroku'], more: ['passenger', 'mysql', 'memcached', 'render', 'aws'] },
  laravel: { ticked: ['phpfpm', 'nginx', 'mysql', 'horizon', 'redis', 'reverb', 'forge'], more: ['apache', 'postgres', 'memcached', 'aws'] },
  django: { ticked: ['gunicorn', 'postgres', 'celery', 'rabbitmq', 'redis', 'channels', 'render'], more: ['uvicorn', 'mysql', 'heroku', 'aws'] },
  node: { ticked: ['nodejs', 'pm2', 'postgres', 'prisma', 'bullmq', 'redis', 'socketio', 'vercel'], more: ['mongodb', 'render', 'aws'] },
  java: { ticked: ['tomcat', 'postgres', 'rabbitmq', 'redis', 'springws', 'aws'], more: ['mysql', 'kafka', 'quartz', 'azure'] },
  dotnet: { ticked: ['kestrel', 'sqlserver', 'hangfire', 'redis', 'signalr', 'azure'], more: ['postgres', 'rabbitmq', 'aws'] },
  wordpress: { ticked: ['nginx', 'phpfpm', 'mysql', 'wpcron', 'redis', 'wpengine'], more: ['apache', 'memcached', 'aws'] },
  go: { ticked: ['postgres', 'asynq', 'flyio'], more: ['mysql', 'aws'] },
  supabase: { ticked: ['edgefn', 'supadb', 'schedfn', 'suparealtime', 'vercel'], more: ['netlify'] },
  unsure: { ticked: [], more: [] },
};
export const ECO_ORDER = Object.keys(ECOS);
// What the picker shows for an ecosystem, by group: its own things, then the shared group.
export function offered(eco) {
  const e = ECOS[eco] ?? ECOS.unsure, own = [...e.ticked, ...e.more];
  return GROUPS.map(g => ({ group: g, things: g === 'shared' ? SHARED : own.filter(t => THINGS[t].group === g) })).filter(x => x.things.length);
}

// The brick each fact is about. Where the visitor has one of these, "Absolutely not" pulls the first it finds;
// otherwise the top brick.
const DB = ['postgres', 'mysql', 'sqlserver', 'mongodb', 'supadb'], HOSTS = ['heroku', 'vercel', 'render', 'forge', 'azure', 'aws', 'wpengine', 'flyio', 'netlify'];
export const PULL = {
  data: ['supabase', 'supadb', 'auth0', 'clerk'], toolchain: ['docker'], onedb: DB, idle: HOSTS, yaml: ['kubernetes'],
  hello: ['sidekiq', 'horizon', 'celery', 'bullmq', 'hangfire', 'asynq', 'wpcron', 'schedfn', 'cron'], pager: ['redis', 'memcached'],
  slow: ['cdn'], lockin: HOSTS, agent: ['ci'], backups: [],
  'b-rails': ['sidekiq'], 'b-php': ['phpfpm'], 'b-django': ['rabbitmq', 'celery'], 'b-node': ['pm2', 'nodejs'], 'b-java': ['tomcat'],
  'b-dotnet': ['sqlserver'], 'b-wordpress': ['wpcron', 'phpfpm'], 'b-go': DB, 'b-supabase': ['supadb', 'supabase'], 'b-helm': ['kubernetes'],
};
// Every step has an address: '' is the intro, then #built (what it is built with), #stack, #1 to #12 and #result.
export const STEPS = ['intro', 'built', 'stack', ...KEYS.map((_, i) => String(i + 1)), 'result'];

export const empty = () => ({ eco: null, stack: [], fresh: false, answers: {}, pulled: {} });

// Anything read back from storage is checked, so a stale or edited value cannot break the page.
export function clean(raw) {
  if (!raw || typeof raw !== 'object') return empty();
  const s = { ...empty(), eco: ECOS[raw.eco] ? raw.eco : null };
  if (Array.isArray(raw.stack)) s.stack = [...new Set(raw.stack)].filter(t => THINGS[t]);
  s.fresh = raw.fresh === true && !s.stack.length;
  for (const k of ALL_KEYS) if (raw.answers?.[k] === 'yes' || raw.answers?.[k] === 'no') s.answers[k] = raw.answers[k];
  return replay(s);
}

// What is left of the visitor's pile, bottom first.
export const pile = s => { const gone = new Set(Object.values(s.pulled)); return s.stack.filter(t => !gone.has(t)); };

// Choosing what the app is built with starts the pile at that ecosystem's typical stack. Choosing the same one again
// keeps whatever was ticked and unticked since.
export function chooseEco(s, eco) {
  if (!ECOS[eco]) return s;
  if (s.eco === eco) return s;
  return replay({ ...s, eco, stack: [...ECOS[eco].ticked], fresh: false });
}
// Tick or untick a thing. Each new brick lands on top, and the answers stand: what they pulled is worked out again.
export function toggleThing(s, thing, on) {
  if (!THINGS[thing]) return s;
  const stack = on ? [...s.stack.filter(t => t !== thing), thing] : s.stack.filter(t => t !== thing);
  return replay({ ...s, stack, fresh: false });
}
export function startFresh(s) { return replay({ ...s, stack: [], fresh: true }); }
function replay(s) {
  let out = { ...s, answers: {}, pulled: {} };
  for (const k of ALL_KEYS) if (s.answers[k]) out = answer(out, k, s.answers[k]);
  return out;
}

// Answer a statement. "Absolutely not" pulls a brick (the one the fact is about, or the top one; none if the pile is
// empty); "Absolutely" puts back whatever an earlier "Absolutely not" to the same statement had pulled. Only the
// statements this visitor gets pull bricks.
export function answer(s, key, value) {
  const answers = { ...s.answers, [key]: value }, pulled = { ...s.pulled };
  delete pulled[key];
  if (value === 'no' && keysFor(s).includes(key)) {
    const left = pile({ ...s, pulled });
    const brick = (PULL[key] ?? []).find(t => left.includes(t)) ?? left[left.length - 1];
    if (brick) pulled[key] = brick;
  }
  return { ...s, answers, pulled };
}

export const noCount = s => keysFor(s).filter(k => s.answers[k] === 'no').length;
// All twelve, 7 to 11, or 0 to 6 "Absolutely not" answers.
export function verdict(s) { const n = noCount(s); return n === 12 ? 'all' : n >= 7 ? 'most' : 'few'; }
// The result's three lists: what goes into the app, what Carloku handles and what is still yours, from everything the
// visitor picked, plus what is always true (TLS and backups on Carloku, the code repository yours).
export function split(s) {
  const out = { app: [], carloku: [], yours: [] };
  for (const t of s.stack) out[THINGS[t].to].push(t);
  for (const [to, list] of Object.entries(ALWAYS)) out[to].push(...list);
  return out;
}

export const stepOf = hash => { const h = String(hash || '').replace(/^#/, ''); return STEPS.includes(h) ? h : 'intro'; };
export const keyOf = (s, step) => keysFor(s)[Number(step) - 1];
export const next = step => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)];
export const prev = step => STEPS[Math.max(0, STEPS.indexOf(step) - 1)];
// Fills {name} placeholders in a string from the copy.
export const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
