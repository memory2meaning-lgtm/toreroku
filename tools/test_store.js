/* Regression tests for the phone-side store.
 *
 *   node tools/test_store.js
 *
 * The rules being checked come from context/M2M_WORKOUT_SPEC.md sections 6 and 7,
 * which tools/workout_web.py implements on the PC side.  Both ends must agree,
 * because the same screen code drives them.
 */
'use strict';

const store = require('../store.js');

let passed = 0;
const failures = [];

async function check(what, run) {
  try {
    await run();
    passed += 1;
  } catch (error) {
    failures.push(what + ': ' + (error && error.message));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error((message || 'not equal') + ': got ' + a + ', wanted ' + b);
}

async function rejects(status, run) {
  try {
    await run();
  } catch (error) {
    if (error.status !== status) throw new Error('wanted status ' + status + ', got ' + error.status + ' (' + error.message + ')');
    return error;
  }
  throw new Error('wanted status ' + status + ', but the call succeeded');
}

function fresh() {
  return store.createApi(store.memoryPersist(null));
}

async function withMenu(api) {
  const squat = await api.post('/api/library/save', { name: 'スクワット', sets: 3, reps: 10, unit: 'reps' });
  const plank = await api.post('/api/library/save', { name: 'プランク', sets: 2, seconds: 30, unit: 'sec' });
  const menu = await api.post('/api/menu/save', {
    menu_id: null, revision: null, name: '朝の3分', video_url: 'https://www.youtube.com/watch?v=abcdefghijk',
    items: [
      { ex_id: squat.ex_id, sets: 3, reps: 10, unit: 'reps' },
      { ex_id: plank.ex_id, sets: 2, seconds: 30, unit: 'sec' }
    ]
  });
  return { squat, plank, menu };
}

async function main() {
  await check('empty app answers every read path', async () => {
    const api = fresh();
    equal((await api.get('/api/library')).items, []);
    equal((await api.get('/api/menus')).menus, []);
    const today = await api.get('/api/today?date=2026-09-10');
    equal(today.sessions, []);
    equal(today.items, []);
    equal(today.this_week, 0);
    equal((await api.get('/api/history?end=2026-09-10&days=30')).days, []);
    equal((await api.get('/api/recent')).items, []);
  });

  await check('a menu records all of its exercises in one tap', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const done = await api.post('/api/menu/complete', {
      menu_id: menu.menu_id, date: '2026-09-10', request_id: 'r1', items: null, performed_time: '07:30'
    });
    assert(done.idempotent === false, 'first send is not idempotent');
    const today = await api.get('/api/today?date=2026-09-10');
    equal(today.sessions.length, 1);
    equal(today.sessions[0].session_kind, 'menu');
    equal(today.sessions[0].menu_name, '朝の3分');
    equal(today.sessions[0].performed_time, '07:30');
    equal(today.sessions[0].items.map(i => i.name), ['スクワット', 'プランク']);
    equal(today.items, [], 'top-level items stays manual-only');
    equal(today.this_week, 1);
  });

  await check('the same request_id twice records once', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const body = { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'same', items: null };
    const first = await api.post('/api/menu/complete', body);
    const again = await api.post('/api/menu/complete', body);
    equal(again.session_id, first.session_id);
    assert(again.idempotent === true, 'the resend is marked idempotent');
    equal((await api.get('/api/today?date=2026-09-10')).sessions.length, 1);
  });

  await check('the same request_id with different content is refused', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'x', items: null });
    await rejects(409, () => api.post('/api/menu/complete',
      { menu_id: menu.menu_id, date: '2026-09-11', request_id: 'x', items: null }));
  });

  await check('a partly done menu records only what was ticked', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const rows = (await api.get('/api/menus')).menus[0].items;
    await api.post('/api/menu/complete', {
      menu_id: menu.menu_id, date: '2026-09-10', request_id: 'part',
      items: [
        { menu_item_id: rows[0].menu_item_id, include: true, sets: 2 },
        { menu_item_id: rows[1].menu_item_id, include: false }
      ]
    });
    const session = (await api.get('/api/today?date=2026-09-10')).sessions[0];
    equal(session.items.length, 1);
    equal(session.items[0].name, 'スクワット');
    equal(session.items[0].sets, 2, 'the tap-time override wins over the menu value');
    equal((await api.get('/api/menus')).menus[0].items[0].sets, 3, 'the menu itself is unchanged');
  });

  await check('ticking nothing is refused', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const rows = (await api.get('/api/menus')).menus[0].items;
    await rejects(400, () => api.post('/api/menu/complete', {
      menu_id: menu.menu_id, date: '2026-09-10', request_id: 'none',
      items: rows.map(r => ({ menu_item_id: r.menu_item_id, include: false }))
    }));
  });

  await check('a stale menu edit is refused instead of overwriting', async () => {
    const api = fresh();
    const { squat, menu } = await withMenu(api);
    const body = {
      menu_id: menu.menu_id, revision: menu.revision, name: '朝の3分',
      items: [{ ex_id: squat.ex_id, sets: 3, reps: 10, unit: 'reps' }]
    };
    const saved = await api.post('/api/menu/save', body);
    equal(saved.revision, menu.revision + 1);
    const error = await rejects(409, () => api.post('/api/menu/save', body));
    equal(error.body.conflict, 'revision');
  });

  await check('deleting a menu keeps the records it produced', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'keep', items: null });
    await api.post('/api/menu/delete', { menu_id: menu.menu_id });
    const session = (await api.get('/api/today?date=2026-09-10')).sessions[0];
    equal(session.menu_name, '朝の3分');
    equal(session.video_url, 'https://www.youtube.com/watch?v=abcdefghijk');
    equal(session.items.length, 2);
    equal((await api.get('/api/menus')).menus, []);
  });

  await check('an exercise used by a menu cannot be deleted', async () => {
    const api = fresh();
    const { squat } = await withMenu(api);
    const error = await rejects(409, () => api.post('/api/library/delete', { ex_id: squat.ex_id }));
    equal(error.body.menus, ['朝の3分']);
  });

  await check('duplicate names are refused for exercises and menus', async () => {
    const api = fresh();
    await withMenu(api);
    await rejects(409, () => api.post('/api/library/save', { name: 'スクワット', sets: 1, reps: 1, unit: 'reps' }));
    await rejects(409, () => api.post('/api/menu/save', {
      menu_id: null, revision: null, name: '朝の3分',
      items: [{ ex_id: 1, sets: 1, reps: 1, unit: 'reps' }]
    }));
  });

  await check('the manual record of a day is replaced, not stacked', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '腕立て', sets: 2, reps: 10, unit: 'reps' }] });
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '腕立て', sets: 3, reps: 10, unit: 'reps' }] });
    const today = await api.get('/api/today?date=2026-09-10');
    equal(today.sessions.length, 1);
    equal(today.items.length, 1);
    equal(today.items[0].sets, 3);
  });

  await check('a manual record and a menu record can share a day', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'both', items: null });
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    const today = await api.get('/api/today?date=2026-09-10');
    equal(today.sessions.length, 2);
    equal(today.items.length, 1, 'only the manual rows appear at the top level');
    equal(today.this_week, 1, 'two records on one day is still one day');
  });

  await check('a name typed by hand joins the library once', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '腕立て', sets: 2, reps: 10, unit: 'reps' }] });
    await api.post('/api/log', { date: '2026-09-11', items: [{ name: '腕立て', sets: 2, reps: 12, unit: 'reps' }] });
    const library = (await api.get('/api/library')).items;
    equal(library.length, 1);
    equal(library[0].use_count, 2);
    equal(library[0].last_used, '2026-09-11');
    equal(library[0].reps, 12, 'the library keeps the newest hand-typed value');
  });

  await check('correcting a past day moves it without touching the menu', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const done = await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'fix', items: null });
    await api.post('/api/session/update', {
      session_id: done.session_id, date: '2026-09-08', performed_time: '06:00',
      items: [{ name: 'スクワット', sets: 5, reps: 10, unit: 'reps' }]
    });
    equal((await api.get('/api/today?date=2026-09-10')).sessions, []);
    const moved = (await api.get('/api/today?date=2026-09-08')).sessions[0];
    equal(moved.session_kind, 'menu', 'the record keeps the kind it was recorded as');
    equal(moved.menu_name, '朝の3分');
    equal(moved.performed_time, '06:00');
    equal(moved.items.map(i => i.sets), [5]);
    equal((await api.get('/api/menus')).menus[0].items[0].sets, 3, 'the menu definition is untouched');
  });

  await check('two hand-typed records cannot land on the same day', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-09', items: [{ name: 'A', sets: 1, reps: 1, unit: 'reps' }] });
    const second = await api.post('/api/log', { date: '2026-09-10', items: [{ name: 'B', sets: 1, reps: 1, unit: 'reps' }] });
    await rejects(409, () => api.post('/api/session/update', {
      session_id: second.session_id, date: '2026-09-09',
      items: [{ name: 'B', sets: 1, reps: 1, unit: 'reps' }]
    }));
  });

  await check('deleting a record takes its usage count with it', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const done = await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'gone', items: null });
    await api.post('/api/session/delete', { session_id: done.session_id });
    equal((await api.get('/api/today?date=2026-09-10')).sessions, []);
    equal((await api.get('/api/library')).items.map(e => e.use_count), [0, 0]);
    await rejects(404, () => api.post('/api/session/delete', { session_id: done.session_id }));
  });

  await check('this week and last week are counted in distinct days', async () => {
    const api = fresh();
    for (const date of ['2026-09-08', '2026-09-09', '2026-09-02']) {
      await api.post('/api/log', { date, items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    }
    const week = await api.get('/api/week?end=2026-09-10');
    equal(week.this_week, 2);
    equal(week.prev_week, 1);
  });

  await check('history groups by day, newest first', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-08', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    const days = (await api.get('/api/history?end=2026-09-10&days=7')).days;
    equal(days.map(d => d.date), ['2026-09-10', '2026-09-08']);
    equal(days[0].sessions[0].item_count, 1);
  });

  await check('bad input is refused rather than stored', async () => {
    const api = fresh();
    await rejects(400, () => api.post('/api/library/save', { name: '  ', sets: 1, reps: 1, unit: 'reps' }));
    await rejects(400, () => api.post('/api/library/save', { name: 'x', sets: true, reps: 1, unit: 'reps' }));
    await rejects(400, () => api.post('/api/library/save', { name: 'x', sets: 1.5, reps: 1, unit: 'reps' }));
    await rejects(400, () => api.post('/api/library/save', { name: 'x', sets: 100, reps: 1, unit: 'reps' }));
    await rejects(400, () => api.post('/api/library/save', { name: 'x', sets: 1, reps: 1, seconds: 5, unit: 'reps' }));
    await rejects(400, () => api.post('/api/library/save', { name: 'x', sets: 1, reps: 1, unit: 'minutes' }));
    await rejects(400, () => api.post('/api/log', { date: '2026-02-30', items: [{ name: 'x', sets: 1, reps: 1, unit: 'reps' }] }));
    await rejects(400, () => api.post('/api/log', { date: '2026-09-10', items: [] }));
    await rejects(400, () => api.post('/api/menu/save', {
      menu_id: null, revision: null, name: 'm', video_url: 'ftp://example.com/x',
      items: [{ ex_id: 1, sets: 1, reps: 1, unit: 'reps' }]
    }));
    equal((await api.get('/api/library')).items, [], 'nothing was written');
  });

  await check('a refused write leaves the earlier record intact', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-10', items: [{ name: '腕立て', sets: 2, reps: 10, unit: 'reps' }] });
    await rejects(404, () => api.post('/api/log', {
      date: '2026-09-10',
      items: [{ name: '腕立て', sets: 3, reps: 10, unit: 'reps' }, { ex_id: 999, sets: 1, reps: 1, unit: 'reps' }]
    }));
    const today = await api.get('/api/today?date=2026-09-10');
    equal(today.items.length, 1);
    equal(today.items[0].sets, 2, 'the half-applied change was rolled back');
  });

  await check('records survive a reload of the app', async () => {
    const persist = store.memoryPersist(null);
    const first = store.createApi(persist);
    const { menu } = await withMenu(first);
    await first.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'keep', items: null });
    const second = store.createApi(persist);
    equal((await second.get('/api/today?date=2026-09-10')).sessions.length, 1);
    equal((await second.get('/api/menus')).menus.length, 1);
  });

  await check('export and import carry everything across', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    await api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'move', items: null });
    const document = await api.exportDocument();

    const other = fresh();
    const result = await other.importDocument(JSON.parse(JSON.stringify(document)));
    equal(result.sessions, 1);
    equal((await other.get('/api/today?date=2026-09-10')).sessions[0].menu_name, '朝の3分');
    equal((await other.get('/api/menus')).menus.length, 1);
    equal((await other.get('/api/library')).items.map(e => e.use_count), [1, 1]);

    await rejects(400, () => other.importDocument({ v: 99, sessions: [], seq: {} }));
    await rejects(400, () => other.importDocument('not a document'));
    equal((await other.get('/api/today?date=2026-09-10')).sessions.length, 1, 'a bad import changes nothing');
  });

  await check('taps sent at the same moment do not overwrite each other', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    await Promise.all([
      api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'a', items: null }),
      api.post('/api/menu/complete', { menu_id: menu.menu_id, date: '2026-09-10', request_id: 'b', items: null }),
      api.post('/api/log', { date: '2026-09-10', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] })
    ]);
    equal((await api.get('/api/today?date=2026-09-10')).sessions.length, 3);
  });

  await check('unknown paths answer the way the server does', async () => {
    const api = fresh();
    await rejects(404, () => api.get('/api/nope'));
    await rejects(404, () => api.post('/api/nope', {}));
  });

  await check('a companion can be chosen and forgotten again', async () => {
    const api = fresh();
    equal((await api.get('/api/settings')).settings, { companion: null, nickname: null, setup_done: null, last_export: null }, 'nobody by default');
    await api.post('/api/settings/save', { companion: 'capybara' });
    equal((await api.get('/api/settings')).settings, { companion: 'capybara', nickname: null, setup_done: null, last_export: null });
    await api.post('/api/settings/save', { companion: null });
    equal((await api.get('/api/settings')).settings, { companion: null, nickname: null, setup_done: null, last_export: null });
    await rejects(400, () => api.post('/api/settings/save', { companion: 'Capybara!' }));
    await rejects(400, () => api.post('/api/settings/save', { companion: 7 }));
  });

  await check('the choice of companion survives a reload and an export', async () => {
    const persist = store.memoryPersist(null);
    const first = store.createApi(persist);
    await first.post('/api/settings/save', { companion: 'owl' });
    equal((await store.createApi(persist).get('/api/settings')).settings.companion, 'owl');

    const other = fresh();
    await other.importDocument(await first.exportDocument());
    equal((await other.get('/api/settings')).settings.companion, 'owl');
  });

  await check('a name to be called by is kept, trimmed and droppable', async () => {
    const api = fresh();
    await api.post('/api/settings/save', { nickname: '  nita  ' });
    equal((await api.get('/api/settings')).settings.nickname, 'nita', 'trimmed');
    await api.post('/api/settings/save', { companion: 'owl' });
    equal((await api.get('/api/settings')).settings.nickname, 'nita', 'saving one key keeps the other');
    await api.post('/api/settings/save', { nickname: '   ' });
    equal((await api.get('/api/settings')).settings.nickname, null, 'blank means do not call me');
    await api.post('/api/settings/save', { nickname: 'x'.repeat(12) });
    equal((await api.get('/api/settings')).settings.nickname, 'x'.repeat(12), 'twelve fits');
    await rejects(400, () => api.post('/api/settings/save', { nickname: 'x'.repeat(13) }));
    await rejects(400, () => api.post('/api/settings/save', { nickname: 7 }));
  });

  await check('the day the first-run questions were answered is kept', async () => {
    const api = fresh();
    equal((await api.get('/api/settings')).settings.setup_done, null, 'not asked yet');
    await api.post('/api/settings/save', { setup_done: '2026-09-11' });
    equal((await api.get('/api/settings')).settings.setup_done, '2026-09-11');
    await api.post('/api/settings/save', { nickname: 'nita' });
    equal((await api.get('/api/settings')).settings.setup_done, '2026-09-11', 'saving one key keeps the other');
    await rejects(400, () => api.post('/api/settings/save', { setup_done: 'yesterday' }));
  });

  await check('a file with a table missing is refused, not half-read', async () => {
    for (const gone of ['exercises', 'menus', 'menu_items', 'items']) {
      const api = fresh();
      const doc = store.emptyState();
      delete doc[gone];
      await rejects(400, () => api.importDocument(doc), gone + ' missing');
      equal((await api.get('/api/menus')).menus, [], 'and nothing was half-written');
    }
  });

  await check('a file whose counters are missing is refused', async () => {
    const api = fresh();
    const doc = store.emptyState();
    doc.seq = {};
    await rejects(400, () => api.importDocument(doc));
    const partial = store.emptyState();
    delete partial.seq.item;
    await rejects(400, () => api.importDocument(partial));
    /* The point of refusing: ids came out as NaN, and a NaN id can never be
     * deleted, so the row was stuck in the list for good. */
    const saved = await api.post('/api/library/save', { name: '腕立て', sets: 1, reps: 1, unit: 'reps' });
    equal(Number.isInteger(saved.ex_id), true, 'ids are still whole numbers');
  });

  await check('clearing a date setting clears it rather than meaning today', async () => {
    const api = fresh();
    await api.post('/api/settings/save', { setup_done: '2020-01-01', last_export: '2020-01-01' });
    await api.post('/api/settings/save', { setup_done: '', last_export: '' });
    const now = (await api.get('/api/settings')).settings;
    equal(now.setup_done, null, 'setup_done');
    equal(now.last_export, null, 'last_export');
  });

  await check('the same tap sent twice is the same request however it is spelled', async () => {
    const api = fresh();
    const ex = (await api.post('/api/library/save',
      { name: 'スクワット', sets: 3, reps: 10, unit: 'reps' })).ex_id;
    const menu = (await api.post('/api/menu/save', { menu_id: null, revision: null, name: '朝',
      items: [{ ex_id: ex, sets: 3, reps: 10, unit: 'reps' }] })).menu_id;
    const items = (await api.get('/api/menus')).menus.find(m => m.menu_id === menu).items
      .map(i => ({ menu_item_id: i.menu_item_id, include: true }));
    const first = await api.post('/api/menu/complete',
      { menu_id: menu, date: '2026-09-11', request_id: 'retry-1', items });
    /* Same tap, retried by a client that spells the empty time out loud. */
    const again = await api.post('/api/menu/complete',
      { menu_id: menu, date: '2026-09-11', request_id: 'retry-1', performed_time: null, items });
    equal(again.idempotent, true, 'recognised as the same request');
    equal(again.session_id, first.session_id, 'and not written twice');
  });

  await check('a late retry of a record since corrected says so', async () => {
    const api = fresh();
    const ex = (await api.post('/api/library/save',
      { name: 'ランジ', sets: 2, reps: 8, unit: 'reps' })).ex_id;
    const menu = (await api.post('/api/menu/save', { menu_id: null, revision: null, name: '夕',
      items: [{ ex_id: ex, sets: 2, reps: 8, unit: 'reps' }] })).menu_id;
    const items = (await api.get('/api/menus')).menus.find(m => m.menu_id === menu).items
      .map(i => ({ menu_item_id: i.menu_item_id, include: true }));
    const done = await api.post('/api/menu/complete',
      { menu_id: menu, date: '2026-09-11', request_id: 'late-1', items });
    await api.post('/api/session/update', { session_id: done.session_id,
      items: [{ name: 'ランジ', sets: 9, reps: 8, unit: 'reps' }] });
    const late = await api.post('/api/menu/complete',
      { menu_id: menu, date: '2026-09-11', request_id: 'late-1', items });
    equal(late.idempotent, true, 'still not written twice');
    equal(late.edited, true, 'but what is there is not what was sent');
  });

  await check('a hand-edited file cannot reach the prototype', async () => {
    const api = fresh();
    const doc = store.emptyState();
    doc.exercises.push(JSON.parse('{"ex_id":1,"name":"x","__proto__":{"polluted":true}}'));
    await rejects(400, () => api.importDocument(doc), 'refused');
    equal({}.polluted, undefined, 'and nothing was changed on the way');
  });

  await check('an export made before companions existed still imports', async () => {
    const api = fresh();
    const old = store.emptyState();
    delete old.settings;                       // what the first exports looked like
    await api.importDocument(old);
    equal((await api.get('/api/settings')).settings, { companion: null, nickname: null, setup_done: null, last_export: null });
  });

  await check('the greeting is handed facts, not a sentence', async () => {
    const api = fresh();
    for (const date of ['2026-09-07', '2026-09-09']) {
      await api.post('/api/log', { date, items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    }
    const morning = await api.get('/api/greeting?date=2026-09-12&hour=7');
    equal(morning.part_of_day, 'morning');
    equal(morning.has_today, false);
    equal(morning.previous_date, '2026-09-09');
    equal(morning.days_since, 3, 'three days since the last one');
    equal(morning.days_this_week, 2, 'Monday-based week');
    equal(morning.first_ever, false);
    equal(Object.keys(morning).some(k => /score|streak|rank/.test(k)), false, 'no score anywhere');

    equal((await api.get('/api/greeting?date=2026-09-12&hour=13')).part_of_day, 'afternoon');
    equal((await api.get('/api/greeting?date=2026-09-12&hour=19')).part_of_day, 'night');
    equal((await api.get('/api/greeting?date=2026-09-12&hour=3')).part_of_day, 'night');
  });

  await check('the first ever day says so instead of inventing a gap', async () => {
    const api = fresh();
    const facts = await api.get('/api/greeting?date=2026-09-12&hour=9');
    equal(facts.first_ever, true);
    equal(facts.previous_date, null);
    equal(facts.days_since, null);
    equal(facts.days_this_week, 0);
  });

  await check('today counts once it is recorded', async () => {
    const api = fresh();
    await api.post('/api/log', { date: '2026-09-12', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    const facts = await api.get('/api/greeting?date=2026-09-12&hour=20');
    equal(facts.has_today, true);
    equal(facts.days_this_week, 1);
    equal(facts.previous_date, null, 'today is not its own previous day');
  });

  await check('a second copy of the app cannot silently overwrite the first', async () => {
    const persist = store.memoryPersist(null);
    const one = store.createApi(persist);
    const two = store.createApi(persist);          // another tab, same storage

    const ex = await one.post('/api/library/save', { name: 'スクワット', sets: 3, reps: 10, unit: 'reps' });
    const menu = await one.post('/api/menu/save', {
      menu_id: null, revision: null, name: '朝', items: [{ ex_id: ex.ex_id, sets: 3, reps: 10, unit: 'reps' }]
    });

    const asSeenByTwo = (await two.get('/api/menus')).menus[0];
    await one.post('/api/menu/save', {
      menu_id: menu.menu_id, revision: menu.revision, name: '朝（片方が先に直した）',
      items: [{ ex_id: ex.ex_id, sets: 3, reps: 10, unit: 'reps' }]
    });

    await rejects(409, () => two.post('/api/menu/save', {
      menu_id: asSeenByTwo.menu_id, revision: asSeenByTwo.revision, name: '朝（あとから上書き）',
      items: [{ ex_id: ex.ex_id, sets: 3, reps: 10, unit: 'reps' }]
    }));
    equal((await two.get('/api/menus')).menus[0].name, '朝（片方が先に直した）', 'the first edit survives');
  });

  await check('a record made in one copy is seen by the other', async () => {
    const persist = store.memoryPersist(null);
    const one = store.createApi(persist);
    const two = store.createApi(persist);
    await one.post('/api/log', { date: '2026-09-12', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    await two.post('/api/log', { date: '2026-09-13', items: [{ name: '散歩', sets: 1, reps: 1, unit: 'reps' }] });
    equal((await one.get('/api/today?date=2026-09-13')).sessions.length, 1, 'the other day was not lost');
    equal((await two.get('/api/today?date=2026-09-12')).sessions.length, 1);
  });

  await check('a menu can be just a video, with no exercises', async () => {
    const api = fresh();
    const menu = await api.post('/api/menu/save', {
      menu_id: null, revision: null, name: '朝のヨガ（動画）',
      video_url: 'https://www.youtube.com/watch?v=abcdefghijk', items: []
    });
    equal((await api.get('/api/menus')).menus[0].items, [], 'saved with no exercises');

    await api.post('/api/menu/complete', {
      menu_id: menu.menu_id, date: '2026-09-12', request_id: 'video-only', items: null
    });
    const today = await api.get('/api/today?date=2026-09-12');
    equal(today.sessions.length, 1, 'doing it counts as a record');
    equal(today.sessions[0].items, [], 'and carries no exercise lines');
    equal(today.sessions[0].menu_name, '朝のヨガ（動画）');
    equal(today.sessions[0].video_url, 'https://www.youtube.com/watch?v=abcdefghijk');
    equal(today.this_week, 1, 'and counts as a day');
  });

  await check('a menu that does have exercises still needs one chosen', async () => {
    const api = fresh();
    const { menu } = await withMenu(api);
    const rows = (await api.get('/api/menus')).menus[0].items;
    await rejects(400, () => api.post('/api/menu/complete', {
      menu_id: menu.menu_id, date: '2026-09-12', request_id: 'none-chosen',
      items: rows.map(r => ({ menu_item_id: r.menu_item_id, include: false }))
    }));
  });

  await check('a menu still cannot hold more than a hundred exercises', async () => {
    const api = fresh();
    const ex = await api.post('/api/library/save', { name: 'スクワット', sets: 1, reps: 1, unit: 'reps' });
    const many = [];
    for (let i = 0; i < 101; i++) many.push({ ex_id: ex.ex_id, sets: 1, reps: 1, unit: 'reps' });
    await rejects(400, () => api.post('/api/menu/save', {
      menu_id: null, revision: null, name: '多すぎ', items: many
    }));
  });

  console.log(passed + ' passed, ' + failures.length + ' failed');
  failures.forEach(line => console.log('  FAIL ' + line));
  process.exit(failures.length ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
