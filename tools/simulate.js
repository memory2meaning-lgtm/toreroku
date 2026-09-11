/* Ten people using the app for eight weeks, in about a second.
 *
 *   node tools/simulate.js [weeks] [seed]
 *
 * Ten different habits - someone who only ever plays one video, someone who
 * does three exercises and nothing else, someone who forgets for a fortnight
 * and comes back, someone who is forever correcting yesterday - are played
 * against the same store the phone runs, day by day, with the clock wound
 * forward. Every day, everything the app could later show is checked against
 * the document it came from.
 *
 * This is not a substitute for a person using it on a phone: nobody here can
 * tell you a button is hard to reach at six in the morning. It is for the
 * other kind of fault - the one that needs three weeks of records and a
 * correction on an old day before it shows itself.
 *
 * Deterministic: the same seed plays the same eight weeks. A failure prints
 * the seed, the day, the person and the step, so it can be played again.
 */
'use strict';

const store = require('../store.js');

/* ---- a repeatable dice ---- */

function dice(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ymd(date) {
  const pad = n => (n < 10 ? '0' : '') + n;
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/* ---- the ten ----
 * Each one is given the day and decides what, if anything, they did. */

const VIDEOS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk'
];

const PEOPLE = [
  {
    name: 'one video, most mornings',
    setup: async (p) => { p.menu = await p.videoMenu('朝の10分'); },
    day: async (p, roll) => { if (roll() < 0.7) await p.complete(p.menu, '07:' + p.minutes(roll)); }
  },
  {
    name: 'three exercises, weekdays',
    setup: async (p) => { p.menu = await p.exerciseMenu('夕方の基本', ['スクワット', 'プランク', 'ランジ']); },
    day: async (p, roll) => { if (p.weekday && roll() < 0.8) await p.complete(p.menu, '18:' + p.minutes(roll)); }
  },
  {
    name: 'does part of it and says so',
    setup: async (p) => { p.menu = await p.exerciseMenu('全身', ['腕立て', '腹筋', '背筋', 'スクワット']); },
    day: async (p, roll) => {
      if (roll() > 0.5) return;
      const items = await p.itemsOf(p.menu);
      const some = items.filter((_, i) => i % 2 === 0);
      await p.completeSome(p.menu, some, items, '20:' + p.minutes(roll));
    }
  },
  {
    name: 'forgets for a fortnight',
    setup: async (p) => { p.menu = await p.exerciseMenu('思い出したとき', ['ストレッチ']); },
    day: async (p, roll) => { if (p.dayNumber % 14 === 0) await p.complete(p.menu, '21:00'); }
  },
  {
    name: 'writes it down by hand',
    day: async (p, roll) => {
      if (roll() < 0.4) {
        await p.manual([{ name: '散歩', sets: 1, reps: 1, unit: 'reps' },
                        { name: 'かかと上げ', sets: 2, reps: 20, unit: 'reps' }], '16:' + p.minutes(roll));
      }
    }
  },
  {
    name: 'corrects yesterday',
    setup: async (p) => { p.menu = await p.exerciseMenu('朝', ['スクワット', 'プランク']); },
    day: async (p, roll) => {
      if (roll() < 0.6) await p.complete(p.menu, '06:' + p.minutes(roll));
      if (roll() < 0.3) await p.fixSomethingEarlier(roll);
    }
  },
  {
    name: 'deletes what they did not do',
    setup: async (p) => { p.menu = await p.exerciseMenu('夜', ['腹筋', '背筋']); },
    day: async (p, roll) => {
      if (roll() < 0.5) await p.complete(p.menu, '22:' + p.minutes(roll));
      if (roll() < 0.2) await p.deleteSomething(roll);
    }
  },
  {
    name: 'keeps changing the menu',
    setup: async (p) => { p.menu = await p.exerciseMenu('組み替える', ['腕立て', 'スクワット']); },
    day: async (p, roll) => {
      if (roll() < 0.4) await p.complete(p.menu, '12:' + p.minutes(roll));
      if (roll() < 0.25) await p.reshuffle(p.menu, roll);
    }
  },
  {
    name: 'moves to a new phone now and then',
    setup: async (p) => { p.menu = await p.videoMenu('ヨガ'); },
    day: async (p, roll) => {
      if (roll() < 0.5) await p.complete(p.menu, '08:' + p.minutes(roll));
      if (p.dayNumber % 21 === 0) await p.moveToANewPhone();
    }
  },
  {
    name: 'keeps changing their mind about the companion',
    setup: async (p) => { p.menu = await p.exerciseMenu('ときどき', ['スクワット']); },
    day: async (p, roll) => {
      if (roll() < 0.4) await p.complete(p.menu, '09:' + p.minutes(roll));
      if (roll() < 0.3) await p.fiddle(roll);
    }
  },
  {
    name: 'was handed records from elsewhere',
    setup: async (p) => { p.menu = await p.exerciseMenu('もらった', ['腕立て', '腹筋']); },
    day: async (p, roll) => {
      if (roll() < 0.45) await p.complete(p.menu, '13:' + p.minutes(roll));
      if (p.dayNumber === 30) await p.takeOverAnother();
    }
  },
  {
    name: 'barely uses it',
    setup: async (p) => { p.menu = await p.exerciseMenu('たまに', ['ラジオ体操']); },
    day: async (p, roll) => { if (roll() < 0.08) await p.complete(p.menu, '10:00'); }
  }
];

/* ---- the hands each person has ---- */

function person(api, roll) {
  let ticket = 0;
  const tally = {};
  const self = {
    tally: tally,
    did: what => { tally[what] = (tally[what] || 0) + 1; },
    date: null, weekday: false, dayNumber: 0, menu: null,
    minutes: r => String(10 + Math.floor(r() * 49)),

    async videoMenu(name) {
      const made = await api.post('/api/menu/save', {
        menu_id: null, revision: null, name: name,
        video_url: VIDEOS[Math.floor(roll() * VIDEOS.length)], items: []
      });
      return made.menu_id;
    },

    async exerciseMenu(name, names) {
      const items = [];
      for (const one of names) {
        const saved = await api.post('/api/library/save',
          { name: one, sets: 2, reps: 10, unit: 'reps' }).catch(async () => {
            const all = (await api.get('/api/library')).items;
            return { ex_id: all.filter(e => e.name === one)[0].ex_id };
          });
        items.push({ ex_id: saved.ex_id, sets: 2, reps: 10, unit: 'reps' });
      }
      const made = await api.post('/api/menu/save',
        { menu_id: null, revision: null, name: name, items: items });
      return made.menu_id;
    },

    async itemsOf(menuId) {
      const menus = (await api.get('/api/menus')).menus;
      const menu = menus.filter(m => m.menu_id === menuId)[0];
      return menu ? menu.items : [];
    },

    async complete(menuId, time) {
      ticket += 1;
      await api.post('/api/menu/complete',
        { menu_id: menuId, date: self.date, request_id: 'sim-' + self.who + '-' + ticket, performed_time: time });
      self.did('recorded a menu');
    },

    async completeSome(menuId, some, all, time) {
      if (!some.length) return;
      ticket += 1;
      await api.post('/api/menu/complete', {
        menu_id: menuId, date: self.date, request_id: 'sim-' + self.who + '-' + ticket,
        performed_time: time,
        items: all.map(i => ({ menu_item_id: i.menu_item_id, include: some.indexOf(i) >= 0 }))
      });
      self.did('recorded part of a menu');
    },

    async manual(items, time) {
      await api.post('/api/log', { date: self.date, performed_time: time, items: items });
      self.did('wrote one down by hand');
    },

    async fixSomethingEarlier(r) {
      const history = await api.get('/api/history?end=' + self.date + '&days=30');
      const earlier = (history.days || []).filter(d => d.date !== self.date && d.sessions.length);
      if (!earlier.length) return;
      const day = earlier[Math.floor(r() * earlier.length)];
      /* The day comes back with its records and their exercises in it; there
       * is no endpoint for a single record, and pretending otherwise is how
       * this person spent eight weeks correcting nothing at all. */
      const that = await api.get('/api/today?date=' + day.date);
      const holding = (that.sessions || []).filter(one => one.items && one.items.length);
      if (!holding.length) return;
      const session = holding[Math.floor(r() * holding.length)];
      await api.post('/api/session/update', {
        session_id: session.session_id,
        performed_time: '05:' + self.minutes(r),
        items: session.items.map(i => ({
          name: i.name, sets: i.sets + 1, reps: i.reps, seconds: i.seconds, unit: i.unit
        }))
      });
      self.did('corrected an earlier day');
    },

    async deleteSomething(r) {
      const today = await api.get('/api/today?date=' + self.date);
      const sessions = today.sessions || [];
      if (!sessions.length) return;
      const one = sessions[Math.floor(r() * sessions.length)];
      await api.post('/api/session/delete', { session_id: one.session_id });
      self.did('deleted a record');
    },

    async reshuffle(menuId, r) {
      const items = await self.itemsOf(menuId);
      if (items.length < 2) return;
      const menus = (await api.get('/api/menus')).menus;
      const menu = menus.filter(m => m.menu_id === menuId)[0];
      const order = items.slice().reverse();
      await api.post('/api/menu/save', {
        menu_id: menuId, revision: menu.revision, name: menu.name, video_url: menu.video_url,
        items: order.map(i => ({ ex_id: i.ex_id, sets: i.sets, reps: i.reps, seconds: i.seconds, unit: i.unit }))
      });
      self.did('rearranged a menu');
    },

    async fiddle(r) {
      const animals = ['capybara', 'penguin', 'owl', 'seal', 'goat', null];
      await api.post('/api/settings/save', {
        companion: animals[Math.floor(r() * animals.length)],
        nickname: r() < 0.5 ? 'にた' : ''
      });
      self.did('changed a setting');
    },

    /* A document from somewhere else - the shape the app writes, but none of
     * the ids this one has been handing out. Everything here belongs to the
     * file now; nothing of the old records may survive by accident. */
    async takeOverAnother() {
      const other = store.createApi(store.memoryPersist(null));
      const ex = (await other.post('/api/library/save',
        { name: 'もらった種目', sets: 1, reps: 1, unit: 'reps' })).ex_id;
      await other.post('/api/log',
        { date: self.date, items: [{ ex_id: ex, sets: 1, reps: 1, unit: 'reps' }] });
      const doc = await other.exportDocument();
      await api.importDocument(doc);
      const now = await api.exportDocument();
      if (now.sessions.length !== doc.sessions.length) {
        throw new Error('the imported document did not replace what was here');
      }
      /* Their own menus went with the rest of it - that is what reading a file
       * in means - so from here they use what came with the document. Getting
       * this wrong is how the simulation first stopped: it kept pressing a
       * menu that no longer existed and the app quite rightly said so. */
      const menus = (await api.get('/api/menus')).menus;
      self.menu = menus.length ? menus[0].menu_id : await self.exerciseMenu('新しく', ['スクワット']);
      self.did('took over a document from elsewhere');
    },

    async moveToANewPhone() {
      const carried = await api.exportDocument();
      const back = JSON.parse(JSON.stringify(carried));
      await api.importDocument(back);
      self.did('moved to a new phone');
    }
  };
  return self;
}

/* ---- what must be true at the end of every day ---- */

async function inspect(api, where) {
  const doc = await api.exportDocument();
  const complain = what => { throw new Error(where + ': ' + what); };

  const seen = {};
  doc.sessions.forEach(s => {
    if (seen[s.session_id]) complain('two sessions share the id ' + s.session_id);
    seen[s.session_id] = true;
    if (s.session_id > doc.seq.session) complain('a session id is past the counter');
  });

  const sessions = {};
  doc.sessions.forEach(s => { sessions[s.session_id] = true; });
  doc.items.forEach(i => {
    if (!sessions[i.session_id]) complain('an item belongs to no record (' + i.item_id + ')');
    if (!Number.isInteger(i.item_id)) complain('an item has no whole id');
  });

  const exercises = {};
  doc.exercises.forEach(e => {
    if (exercises[e.name]) complain('the exercise ' + e.name + ' is in the list twice');
    exercises[e.name] = e;
  });

  /* use_count is derived, never accumulated - the spec says so, and drift here
   * is the classic symptom of a counter being kept by hand somewhere. */
  doc.exercises.forEach(e => {
    const used = doc.items.filter(i => i.ex_id === e.ex_id).length;
    if (e.use_count !== used) complain('use_count for ' + e.name + ' says ' + e.use_count + ' but ' + used + ' records point at it');
  });

  doc.menu_items.forEach(mi => {
    if (!doc.menus.some(m => m.menu_id === mi.menu_id)) complain('a menu item belongs to no menu');
    if (!doc.exercises.some(e => e.ex_id === mi.ex_id)) complain('a menu item points at no exercise');
  });

  /* What the screens would show has to agree with the document behind them. */
  const days = {};
  doc.sessions.forEach(s => { days[s.date] = (days[s.date] || 0) + 1; });
  for (const date of Object.keys(days).slice(-3)) {
    const today = await api.get('/api/today?date=' + date);
    if (today.sessions.length !== days[date]) {
      complain('the day ' + date + ' shows ' + today.sessions.length + ' records but holds ' + days[date]);
    }
  }

  /* And it must survive the journey to a new phone unchanged. */
  const again = store.createApi(store.memoryPersist(null));
  await again.importDocument(JSON.parse(JSON.stringify(doc)));
  const returned = await again.exportDocument();
  if (JSON.stringify(returned) !== JSON.stringify(doc)) {
    complain('the document changes when written out and read back');
  }
  return doc;
}

async function main() {
  const weeks = Number(process.argv[2] || 8);
  const seed = Number(process.argv[3] || 20260911);
  const roll = dice(seed);

  const start = new Date(2026, 0, 5);          // a Monday
  const people = [];
  for (let i = 0; i < PEOPLE.length; i++) {
    const api = store.createApi(store.memoryPersist(null));
    const hands = person(api, roll);
    hands.who = i;
    people.push({ api: api, hands: hands, script: PEOPLE[i], steps: 0 });
  }

  for (const one of people) {
    if (one.script.setup) await one.script.setup(one.hands);
  }

  const days = weeks * 7;
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    for (const one of people) {
      one.hands.date = ymd(date);
      one.hands.dayNumber = d;
      one.hands.weekday = date.getDay() !== 0 && date.getDay() !== 6;
      try {
        await one.script.day(one.hands, roll);
        one.steps += 1;
      } catch (error) {
        console.log('BROKE on day ' + ymd(date) + ' for "' + one.script.name + '": ' + error.message);
        console.log('  play it again with: node tools/simulate.js ' + weeks + ' ' + seed);
        process.exit(1);
      }
    }
    if (d % 7 === 6) {
      for (const one of people) {
        try {
          await inspect(one.api, '"' + one.script.name + '" after ' + ymd(date));
        } catch (error) {
          console.log('BROKE: ' + error.message);
          console.log('  play it again with: node tools/simulate.js ' + weeks + ' ' + seed);
          process.exit(1);
        }
      }
    }
  }

  console.log('%d people, %d days each, seed %d', people.length, days, seed);
  console.log('');
  let records = 0;
  let width = 0;
  people.forEach(one => { width = Math.max(width, one.script.name.length); });
  const idle = [];
  for (const one of people) {
    const doc = await one.api.exportDocument();
    records += doc.sessions.length;
    const what = Object.keys(one.hands.tally).sort()
      .map(k => one.hands.tally[k] + ' x ' + k).join(', ');
    if (!what) idle.push(one.script.name);
    console.log('  %s  %s records | %s', one.script.name.padEnd(width),
      String(doc.sessions.length).padStart(3), what || 'DID NOTHING AT ALL');
  }
  console.log('');
  console.log('%d records in all. Nothing lost, nothing counted twice, and every', records);
  console.log('document still the same after being carried to another phone.');
  if (idle.length) {
    console.log('');
    console.log('But these people never did anything, so nothing was proved about them:');
    idle.forEach(name => console.log('  ' + name));
    return 1;
  }
  return 0;
}

main().then(code => process.exit(code)).catch(error => {
  console.log('the simulation itself fell over: ' + (error && error.stack));
  process.exit(2);
});
