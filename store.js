/* The whole back end of the app, running inside the phone.
 *
 * The published app has no server: this file answers the same paths that
 * tools/workout_web.py answers on the PC (see context/M2M_WORKOUT_SPEC.md 6),
 * so the screen code is unchanged apart from which object it calls.
 *
 * Everything lives in one document that is written back whole on each change,
 * which is what gives us the "no partial save" rule the spec asks for: a write
 * either lands completely or not at all.  It is also what makes the export a
 * plain JSON file the owner can keep.
 */
(function (global) {
  'use strict';

  var SCHEMA = 1;
  var DB_NAME = 'ouchitore';
  /* トレ録 is read ouchi-tore. The first version of this file called it
   * otetore, which is not a reading of anything; a phone that used the app
   * before this was fixed has its records in a database under that name, so
   * they are carried over the first time it opens afterwards. */
  var OLD_DB_NAME = 'otetore';
  var STORE_NAME = 'state';
  var DOC_KEY = 'workout';

  function ApiError(status, note, details) {
    var error = new Error(note);
    error.name = 'ApiError';
    error.status = status;
    error.note = note;
    error.body = Object.assign({ ok: false, note: note }, details || {});
    return error;
  }

  /* ---- validation (mirrors the helpers at the top of workout_web.py) ---- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function localDate(when) {
    var d = when || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function nowIso() {
    var d = new Date();
    var offset = -d.getTimezoneOffset();
    var sign = offset >= 0 ? '+' : '-';
    var abs = Math.abs(offset);
    return localDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
  }

  function strictInt(value, field, low, high, optional) {
    if (value === null || value === undefined) {
      if (optional) return null;
      throw ApiError(400, field + 'は整数で指定してください');
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw ApiError(400, field + 'は整数で指定してください');
    }
    if ((low !== null && low !== undefined && value < low) || (high !== null && high !== undefined && value > high)) {
      throw ApiError(400, field + 'の値が範囲外です');
    }
    return value;
  }

  function anId(value, field) { return strictInt(value, field, 1, null, false); }

  /* aDate reads an empty date as "today", which is right for a query with no
   * date in it and wrong for a setting being cleared. */
  function blank(value) {
    return value === null || value === undefined || value === '';
  }

  function aDate(value) {
    if (value === null || value === undefined || value === '') return localDate();
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw ApiError(400, '日付の形式が正しくありません');
    }
    var parts = value.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) {
      throw ApiError(400, '日付の形式が正しくありません');
    }
    return value;
  }

  function aName(value) {
    if (typeof value !== 'string') throw ApiError(400, '名前を入力してください');
    var name = value.trim();
    if (name.length < 1 || name.length > 100) throw ApiError(400, '名前は1〜100文字で入力してください');
    return name;
  }

  function aPerformedTime(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      throw ApiError(400, '実施時刻はHH:MMで指定してください');
    }
    return value;
  }

  function aText(value, field, maximum) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') throw ApiError(400, field + 'の形式が正しくありません');
    var text = value.trim();
    if (text.length > maximum) throw ApiError(400, field + 'が長すぎます');
    return text || null;
  }

  function aUrl(value) {
    var text = aText(value, '動画URL', 2048);
    if (text === null) return null;
    if (!/^https?:\/\/[^\s/]+/i.test(text)) throw ApiError(400, '動画URLはhttpまたはhttpsで指定してください');
    return text;
  }

  function pick(payload, fallback, key) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined) return payload[key];
    return fallback ? fallback[key] : undefined;
  }

  /* Returns [sets, reps, seconds, unit] the way _values() does. */
  function values(payload, fallback) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw ApiError(400, '明細の形式が正しくありません');
    }
    var unit = pick(payload, fallback, 'unit');
    if (unit !== 'reps' && unit !== 'sec') throw ApiError(400, 'unitはrepsまたはsecで指定してください');
    var sets = strictInt(pick(payload, fallback, 'sets'), 'sets', 1, 99, false);
    if (unit === 'reps') {
      if (payload.seconds !== null && payload.seconds !== undefined) {
        throw ApiError(400, '回数式の種目にsecondsは指定できません');
      }
      return [sets, strictInt(pick(payload, fallback, 'reps'), 'reps', 1, 999, false), null, unit];
    }
    if (payload.reps !== null && payload.reps !== undefined) {
      throw ApiError(400, '秒数式の種目にrepsは指定できません');
    }
    return [sets, null, strictInt(pick(payload, fallback, 'seconds'), 'seconds', 1, 3600, false), unit];
  }

  /* ---- the document ---- */

  function emptyState() {
    return {
      v: SCHEMA,
      seq: { ex: 0, menu: 0, menu_item: 0, session: 0, item: 0 },
      exercises: [],   // ex_id name sets reps seconds unit use_count last_used created
      menus: [],       // menu_id name video_url note tag ord revision created updated
      menu_items: [],  // menu_item_id menu_id ex_id sets reps seconds unit ord
      sessions: [],    // session_id date ts note session_kind menu_id menu_name video_url request_id request_hash performed_time
      items: [],       // item_id session_id ex_id name sets reps seconds unit ord
      settings: { companion: null, nickname: null, setup_done: null }   // companion: a slug like "capybara"; nickname: what to call the person
    };
  }

  /* What a whole document holds. Import checks for all of it. */
  var TABLES = ['exercises', 'menus', 'menu_items', 'sessions', 'items'];
  var COUNTERS = ['ex', 'menu', 'menu_item', 'session', 'item'];

  function clone(state) { return JSON.parse(JSON.stringify(state)); }

  /* The same ceiling the import enforces, so a document the store wrote is
   * always one it will read back (Codex review, third pass). */
  var ID_CEILING = Number.MAX_SAFE_INTEGER - 1000000;
  function nextId(state, key) {
    if (state.seq[key] >= ID_CEILING) throw ApiError(500, 'これ以上は作れません（番号が上限に達しました）');
    state.seq[key] += 1;
    return state.seq[key];
  }

  function byId(rows, key, id) {
    for (var i = 0; i < rows.length; i++) if (rows[i][key] === id) return rows[i];
    return null;
  }

  /* use_count and last_used are derived, never accumulated (spec 7.1). */
  function recalculateUsage(state) {
    state.exercises.forEach(function (ex) {
      var used = state.items.filter(function (it) { return it.ex_id === ex.ex_id; });
      var days = used.map(function (it) {
        var session = byId(state.sessions, 'session_id', it.session_id);
        return session ? session.date : null;
      }).filter(Boolean).sort();
      ex.use_count = used.length;
      ex.last_used = days.length ? days[days.length - 1] : null;
    });
  }

  async function sha256(text) {
    var bytes = new TextEncoder().encode(text);
    var digest = await global.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* JSON with sorted keys and no spaces, so a request hash made here matches
   * one made by json.dumps(sort_keys=True, separators=(',', ':')). */
  function canonicalJson(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (k) {
      return JSON.stringify(k) + ':' + canonicalJson(value[k]);
    }).join(',') + '}';
  }

  /* ---- reads ---- */

  function libraryList(state) {
    var items = state.exercises.slice().sort(function (a, b) {
      return (b.use_count - a.use_count) || a.name.localeCompare(b.name);
    });
    return { ok: true, items: items.map(function (e) { return Object.assign({}, e); }) };
  }

  function menuItemRows(state, menuId) {
    return state.menu_items.filter(function (mi) { return mi.menu_id === menuId; })
      .sort(function (a, b) { return (a.ord - b.ord) || (a.menu_item_id - b.menu_item_id); })
      .map(function (mi) {
        var ex = byId(state.exercises, 'ex_id', mi.ex_id);
        return {
          menu_item_id: mi.menu_item_id, ex_id: mi.ex_id, name: ex ? ex.name : '',
          sets: mi.sets, reps: mi.reps, seconds: mi.seconds, unit: mi.unit, ord: mi.ord,
          skip: mi.skip === true, auto: mi.auto === true
        };
      });
  }

  /* In the order the owner gave them (ord), and by name among those that
   * were never dragged - a document from before ord existed keeps its old
   * alphabetical order until the owner moves something. */
  function menusList(state) {
    var menus = state.menus.slice().sort(function (a, b) {
      return ((a.ord || 0) - (b.ord || 0)) || a.name.localeCompare(b.name);
    }).map(function (m) {
      return Object.assign({ tag: null, ord: 0 }, m, { items: menuItemRows(state, m.menu_id) });
    });
    return { ok: true, menus: menus };
  }

  /* The whole order at once, from the screen that was dragged on. Every
   * menu has to be named, so a stale screen cannot silently drop one. */
  function menuReorder(state, payload) {
    var ids = payload && payload.menu_ids;
    if (!Array.isArray(ids)) throw ApiError(400, 'menu_idsを配列で指定してください');
    var seen = {};
    ids.forEach(function (raw) {
      var id = anId(raw, 'menu_id');
      if (seen[id]) throw ApiError(400, '同じmenu_idが2回あります');
      seen[id] = true;
      if (!byId(state.menus, 'menu_id', id)) throw ApiError(404, 'トレーニングメニューが見つかりません', { menu_id: id });
    });
    if (ids.length !== state.menus.length) {
      throw ApiError(409, 'トレーニングメニューが他で変更されています。再読込してください', { conflict: 'count' });
    }
    /* The screen says what order it believed it was rearranging; if the
     * store has moved on since, the drag is refused rather than dropped
     * silently over someone else's (Codex review 2026-09-12). */
    if (Array.isArray(payload.expected_menu_ids)) {
      var current = menusList(state).menus.map(function (m) { return m.menu_id; });
      var expected = payload.expected_menu_ids.map(function (raw) { return anId(raw, 'menu_id'); });
      if (current.join(',') !== expected.join(',')) {
        throw ApiError(409, 'トレーニングメニューの並びが他で変更されています。再読込してください', { conflict: 'order' });
      }
    }
    var now = nowIso();
    ids.forEach(function (raw, position) {
      var menu = byId(state.menus, 'menu_id', anId(raw, 'menu_id'));
      menu.ord = position + 1;
      menu.updated = now;
    });
    return { ok: true, count: ids.length };
  }

  function sessionRows(state, date) {
    return state.sessions.filter(function (s) { return s.date === date; })
      .sort(function (a, b) { return (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0) || (a.session_id - b.session_id); })
      .map(function (s) {
        return {
          session_id: s.session_id, session_kind: s.session_kind, menu_id: s.menu_id,
          menu_name: s.menu_name, video_url: s.video_url, ts: s.ts, note: s.note,
          performed_time: s.performed_time,
          items: state.items.filter(function (i) { return i.session_id === s.session_id; })
            .sort(function (a, b) { return (a.ord - b.ord) || (a.item_id - b.item_id); })
            .map(function (i) { return Object.assign({}, i); })
        };
      });
  }

  function shiftDays(date, delta) {
    var parts = date.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2] + delta);
    return localDate(d);
  }

  function distinctDays(state, start, end) {
    var days = {};
    state.sessions.forEach(function (s) { if (s.date >= start && s.date <= end) days[s.date] = true; });
    return Object.keys(days).length;
  }

  function weekCounts(state, endDate, days) {
    var span = days || 7;
    var end = aDate(endDate);
    return {
      ok: true,
      this_week: distinctDays(state, shiftDays(end, -(span - 1)), end),
      prev_week: distinctDays(state, shiftDays(end, -(2 * span - 1)), shiftDays(end, -span))
    };
  }

  function todayItems(state, date) {
    var day = aDate(date);
    var sessions = sessionRows(state, day);
    var manual = [];
    sessions.forEach(function (s) {
      if (s.session_kind === 'manual') manual = manual.concat(s.items);
    });
    var parts = day.split('-').map(Number);
    var asDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var monday = shiftDays(day, -((asDate.getDay() + 6) % 7));
    return Object.assign({ ok: true, date: day, items: manual, sessions: sessions }, weekCounts(state, day), {
      calendar_this_week: distinctDays(state, monday, shiftDays(monday, 6)),
      calendar_prev_week: distinctDays(state, shiftDays(monday, -7), shiftDays(monday, -1))
    });
  }

  function history(state, endDate, days) {
    var end = aDate(endDate);
    var span = strictInt(days, 'days', 1, 366, false);
    var start = shiftDays(end, -(span - 1));
    var rows = state.sessions.filter(function (s) { return s.date >= start && s.date <= end; })
      .map(function (s) {
        return {
          session_id: s.session_id, date: s.date, session_kind: s.session_kind,
          menu_name: s.menu_name, video_url: s.video_url, ts: s.ts, note: s.note,
          performed_time: s.performed_time,
          item_count: state.items.filter(function (i) { return i.session_id === s.session_id; }).length
        };
      })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        if (a.ts !== b.ts) return a.ts < b.ts ? 1 : -1;
        return b.session_id - a.session_id;
      });
    var grouped = [];
    rows.forEach(function (row) {
      var bucket = grouped[grouped.length - 1];
      if (!bucket || bucket.date !== row.date) grouped.push({ date: row.date, sessions: [row] });
      else bucket.sessions.push(row);
    });
    return { ok: true, start: start, end: end, days: grouped };
  }

  function recentNames(state, limit) {
    var span = strictInt(limit === undefined ? 12 : limit, 'limit', 1, 100, false);
    var seen = {};
    state.items.forEach(function (i) {
      var row = seen[i.name] || (seen[i.name] = { name: i.name, c: 0, sets: null, reps: null, seconds: null });
      row.c += 1;
      ['sets', 'reps', 'seconds'].forEach(function (key) {
        if (i[key] !== null && i[key] !== undefined && (row[key] === null || i[key] > row[key])) row[key] = i[key];
      });
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .sort(function (a, b) { return (b.c - a.c) || a.name.localeCompare(b.name); })
      .slice(0, span);
  }

  /* Older exports predate settings, so read through a default rather than
   * refusing them. */
  function settingsOf(state) {
    var held = state.settings && typeof state.settings === 'object' ? state.settings : {};
    return {
      companion: typeof held.companion === 'string' ? held.companion : null,
      nickname: typeof held.nickname === 'string' ? held.nickname : null,
      setup_done: typeof held.setup_done === 'string' ? held.setup_done : null,
      last_export: typeof held.last_export === 'string' ? held.last_export : null
    };
  }

  /* Only the keys given are changed, so saving one does not clear the other. */
  function settingsSave(state, payload) {
    var now = settingsOf(state);
    if ('companion' in payload) {
      var wanted = payload.companion;
      if (wanted !== null && wanted !== undefined && wanted !== '') {
        if (typeof wanted !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(wanted)) {
          throw ApiError(400, '相棒の指定が正しくありません');
        }
      } else {
        wanted = null;
      }
      now.companion = wanted;
    }
    /* A name to be called by, not an account: it stays on this device, it can
     * be cleared, and nothing else is keyed on it. */
    if ('nickname' in payload) {
      var called = payload.nickname;
      if (called === null || called === undefined) {
        called = null;
      } else {
        if (typeof called !== 'string') throw ApiError(400, '名前の指定が正しくありません');
        called = called.replace(/[ -]/g, '').trim();
        if (!called) called = null;
        else if (Array.from(called).length > 12) throw ApiError(400, '名前は12文字までです');
      }
      now.nickname = called;
    }
    /* The day the first-run questions were answered - or waved past, which
     * counts just as much.  It is a date rather than a flag so that a document
     * imported onto a new phone says when, not just whether. */
    if ('setup_done' in payload) {
      now.setup_done = blank(payload.setup_done) ? null : aDate(payload.setup_done);
    }
    if ('last_export' in payload) {
      now.last_export = blank(payload.last_export) ? null : aDate(payload.last_export);
    }
    state.settings = now;
    return Object.assign({ ok: true }, now);
  }

  /* The facts a greeting may draw on - never the sentence itself, which is the
   * screen's to write.  Nothing here counts streaks or scores: it is the time
   * of day, how long since the last time, and how many days this week.
   */
  function greetingFacts(state, date, hour) {
    var day = aDate(date);
    var atHour = hour === null || hour === undefined ? new Date().getHours() : strictInt(hour, 'hour', 0, 23, false);
    var partOfDay = atHour < 5 ? 'night' : atHour < 11 ? 'morning' : atHour < 18 ? 'afternoon' : 'night';

    var days = {};
    state.sessions.forEach(function (s) { days[s.date] = true; });
    var earlier = Object.keys(days).filter(function (d) { return d < day; }).sort();
    var previous = earlier.length ? earlier[earlier.length - 1] : null;

    var parts = day.split('-').map(Number);
    var asDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var monday = shiftDays(day, -((asDate.getDay() + 6) % 7));

    return {
      ok: true,
      date: day,
      part_of_day: partOfDay,
      has_today: !!days[day],
      previous_date: previous,
      days_since: previous === null ? null :
        Math.round((asDate - new Date(Number(previous.slice(0, 4)), Number(previous.slice(5, 7)) - 1, Number(previous.slice(8, 10)))) / 86400000),
      days_this_week: distinctDays(state, monday, day),
      first_ever: earlier.length === 0 && !days[day],
      /* The last time of day on the previous day, for a line such as
       * 「前回も朝でしたね」 (Claude Design 相棒の一言 v1, 2026-09-17). */
      previous_time: previous === null ? null : state.sessions
        .filter(function (s) { return s.date === previous; })
        .map(function (s) { return s.performed_time || String(s.ts || '').slice(11, 16); })
        .filter(function (t) { return /^\d\d:\d\d$/.test(t); })
        .sort().pop() || null
    };
  }

  /* ---- writes ---- */

  function librarySave(state, payload) {
    var name = aName(payload.name);
    var v = values(payload, null);
    var exId = payload.ex_id === null || payload.ex_id === undefined ? null : anId(payload.ex_id, 'ex_id');
    var clash = state.exercises.filter(function (e) { return e.name === name && e.ex_id !== exId; });
    if (clash.length) throw ApiError(409, '同じ名前の種目があります');
    if (exId === null) {
      exId = nextId(state, 'ex');
      state.exercises.push({
        ex_id: exId, name: name, sets: v[0], reps: v[1], seconds: v[2], unit: v[3],
        use_count: 0, last_used: null, created: nowIso()
      });
    } else {
      var row = byId(state.exercises, 'ex_id', exId);
      if (!row) throw ApiError(404, '種目が見つかりません');
      Object.assign(row, { name: name, sets: v[0], reps: v[1], seconds: v[2], unit: v[3] });
    }
    return { ok: true, ex_id: exId };
  }

  function libraryDelete(state, rawId) {
    var exId = anId(rawId, 'ex_id');
    if (!byId(state.exercises, 'ex_id', exId)) throw ApiError(404, '種目が見つかりません');
    var used = state.menu_items.filter(function (mi) { return mi.ex_id === exId; })
      .map(function (mi) {
        var menu = byId(state.menus, 'menu_id', mi.menu_id);
        return menu ? menu.name : null;
      }).filter(Boolean);
    var menus = used.filter(function (n, i) { return used.indexOf(n) === i; }).sort();
    if (menus.length) throw ApiError(409, 'メニューで使用中のため削除できません', { menus: menus });
    state.exercises = state.exercises.filter(function (e) { return e.ex_id !== exId; });
    return { ok: true, ex_id: exId };
  }

  /* A menu may hold no exercises at all.  Plenty of people treat one video as
   * one piece of training and never break it down; requiring a breakdown would
   * stop them registering the thing they actually do.  Recording such a menu
   * stores the menu and its video, with no exercise lines. */
  function checkedMenuItems(state, items) {
    if (items === null || items === undefined) items = [];
    if (!Array.isArray(items) || items.length > 100) {
      throw ApiError(400, 'メニューの種目は100件までです');
    }
    return items.map(function (item) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw ApiError(400, 'メニュー明細の形式が正しくありません');
      }
      var exId = anId(item.ex_id, 'ex_id');
      if (!byId(state.exercises, 'ex_id', exId)) throw ApiError(404, '種目が見つかりません', { ex_id: exId });
      /* skip: an exercise the owner usually leaves out (a bad knee, say).
       * It stays in the menu, is left unticked by default on the partial
       * screen, and the one-tap record does not claim it was done. */
      if (item.skip !== undefined && item.skip !== null && typeof item.skip !== 'boolean') {
        throw ApiError(400, 'skipはtrueまたはfalseで指定してください');
      }
      if (item.auto !== undefined && item.auto !== null && typeof item.auto !== 'boolean') {
        throw ApiError(400, 'autoはtrueまたはfalseで指定してください');
      }
      /* auto: it came in from the video (chapters or the AI reading), not
       * from the owner's own hand - the screens only offer "usually left
       * out" on those. */
      return [exId].concat(values(item, null)).concat([item.skip === true, item.auto === true]);
    });
  }

  function menuSave(state, payload) {
    var name = aName(payload.name);
    var videoUrl = aUrl(payload.video_url);
    var note = aText(payload.note, 'メモ', 5000);
    var tag = aText(payload.tag, '分類', 30);
    var menuId = payload.menu_id === null || payload.menu_id === undefined ? null : payload.menu_id;
    var revision = payload.revision === null || payload.revision === undefined ? null : payload.revision;
    if (menuId === null) {
      if (revision !== null) throw ApiError(400, '新規メニューのrevisionはnullにしてください');
    } else {
      menuId = anId(menuId, 'menu_id');
      revision = strictInt(revision, 'revision', 1, null, false);
    }
    var items = checkedMenuItems(state, payload.items);
    var clash = state.menus.filter(function (m) { return m.name === name && m.menu_id !== menuId; });
    if (clash.length) throw ApiError(409, '同じ名前のメニューがあります');
    var now = nowIso();
    var nextRevision;
    if (menuId === null) {
      menuId = nextId(state, 'menu');
      nextRevision = 1;
      var last = state.menus.reduce(function (n, m) { return Math.max(n, m.ord || 0); }, 0);
      state.menus.push({
        menu_id: menuId, name: name, video_url: videoUrl, note: note, tag: tag, ord: last + 1,
        revision: 1, created: now, updated: now
      });
    } else {
      var menu = byId(state.menus, 'menu_id', menuId);
      if (!menu) throw ApiError(404, 'メニューが見つかりません');
      if (menu.revision !== revision) {
        throw ApiError(409, 'メニューが他で変更されています。再読込してください', { conflict: 'revision' });
      }
      nextRevision = revision + 1;
      Object.assign(menu, { name: name, video_url: videoUrl, note: note, tag: tag, revision: nextRevision, updated: now });
      state.menu_items = state.menu_items.filter(function (mi) { return mi.menu_id !== menuId; });
    }
    items.forEach(function (row, order) {
      state.menu_items.push({
        menu_item_id: nextId(state, 'menu_item'), menu_id: menuId, ex_id: row[0],
        sets: row[1], reps: row[2], seconds: row[3], unit: row[4], ord: order, skip: row[5], auto: row[6]
      });
    });
    return { ok: true, menu_id: menuId, revision: nextRevision };
  }

  /* Past records keep their menu snapshot, so deleting the menu leaves them alone. */
  function menuDelete(state, rawId) {
    var menuId = anId(rawId, 'menu_id');
    if (!byId(state.menus, 'menu_id', menuId)) throw ApiError(404, 'メニューが見つかりません');
    state.menus = state.menus.filter(function (m) { return m.menu_id !== menuId; });
    state.menu_items = state.menu_items.filter(function (mi) { return mi.menu_id !== menuId; });
    state.sessions.forEach(function (s) { if (s.menu_id === menuId) s.menu_id = null; });
    return { ok: true, menu_id: menuId };
  }

  async function completionRequest(payload) {
    var menuId = anId(payload.menu_id, 'menu_id');
    var date = aDate(payload.date);
    var requestId = payload.request_id;
    if (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 100) {
      throw ApiError(400, 'request_idは1〜100文字で指定してください');
    }
    var raw = payload.items;
    var normalized = null;
    if (raw !== null && raw !== undefined) {
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) {
        throw ApiError(400, '記録する明細の形式が正しくありません');
      }
      var allowed = ['menu_item_id', 'include', 'sets', 'reps', 'seconds'];
      var seen = {};
      normalized = raw.map(function (entry) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)
          || Object.keys(entry).some(function (k) { return allowed.indexOf(k) === -1; })) {
          throw ApiError(400, '明細にはmenu_item_id、include、sets、reps、secondsだけ指定できます');
        }
        var itemId = anId(entry.menu_item_id, 'menu_item_id');
        if (seen[itemId]) throw ApiError(400, '同じmenu_item_idが重複しています');
        seen[itemId] = true;
        if (typeof entry.include !== 'boolean') throw ApiError(400, 'includeはtrueまたはfalseで指定してください');
        var item = { menu_item_id: itemId, include: entry.include };
        ['sets', 'reps', 'seconds'].forEach(function (key) {
          if (key in entry && entry[key] !== null && entry[key] !== undefined) {
            item[key] = strictInt(entry[key], key, 1, 3600, false);
          }
        });
        return item;
      });
      if (!normalized.some(function (item) { return item.include; })) {
        throw ApiError(400, '1件以上の種目を選んでください');
      }
    }
    /* Hashed in one fixed shape - every field present, missing ones as null -
     * so that a retry that spells the same thing differently still counts as
     * the same request rather than as a clash. */
    var hashItems = normalized === null ? null : normalized.filter(function (i) { return i.include; })
      .slice().sort(function (a, b) { return a.menu_item_id - b.menu_item_id; })
      .map(function (i) {
        return {
          menu_item_id: i.menu_item_id, include: i.include,
          sets: 'sets' in i ? i.sets : null,
          reps: 'reps' in i ? i.reps : null,
          seconds: 'seconds' in i ? i.seconds : null
        };
      });
    /* The shape is always the same, so that leaving a field out and sending it
     * as null hash alike: a retry of the same tap is the same request however
     * the caller spelled it, which is the whole point of the request id. */
    var canonical = {
      menu_id: menuId, date: date, items: hashItems,
      performed_time: 'performed_time' in payload ? aPerformedTime(payload.performed_time) : null
    };
    return {
      menuId: menuId, date: date, requestId: requestId, requested: normalized,
      hash: await sha256(canonicalJson(canonical))
    };
  }

  function menuCompleteWith(state, payload, request) {
    var existing = state.sessions.filter(function (s) { return s.request_id === request.requestId; })[0];
    if (existing) {
      if (existing.request_hash !== request.hash) {
        throw ApiError(409, '同じrequest_idが異なる内容で使われています');
      }
      return { ok: true, session_id: existing.session_id, date: request.date, idempotent: true,
        edited: !!existing.request_edited };
    }
    var menu = byId(state.menus, 'menu_id', request.menuId);
    if (!menu) throw ApiError(404, 'メニューが見つかりません');
    var rows = menuItemRows(state, request.menuId);
    var selected = [];
    if (request.requested === null) {
      /* The one tap records what is usually done - not the exercises the
       * owner has marked as usually left out. */
      selected = rows.filter(function (row) { return !row.skip; }).map(function (row) { return [row, {}]; });
    } else {
      request.requested.forEach(function (raw) {
        var row = rows.filter(function (r) { return r.menu_item_id === raw.menu_item_id; })[0];
        if (!row) throw ApiError(400, '対象メニューに属さないmenu_item_idがあります');
        if (raw.include) selected.push([row, raw]);
      });
    }
    var final = selected.map(function (pair) {
      var row = pair[0], override = pair[1];
      var supplied = { unit: row.unit };
      ['sets', 'reps', 'seconds'].forEach(function (key) {
        if (key in override) supplied[key] = override[key];
      });
      return [row].concat(values(supplied, row));
    });
    /* Nothing selected is only wrong when there was something to select: a menu
     * that is just a video records the fact it was done, with no lines. */
    if (!final.length && rows.length) throw ApiError(400, '1件以上の種目を選んでください');
    var sid = nextId(state, 'session');
    state.sessions.push({
      session_id: sid, date: request.date, ts: nowIso(), note: null, session_kind: 'menu',
      menu_id: request.menuId, menu_name: menu.name, video_url: menu.video_url,
      request_id: request.requestId, request_hash: request.hash,
      performed_time: aPerformedTime(payload.performed_time)
    });
    final.forEach(function (row, order) {
      state.items.push({
        item_id: nextId(state, 'item'), session_id: sid, ex_id: row[0].ex_id, name: row[0].name,
        sets: row[1], reps: row[2], seconds: row[3], unit: row[4], ord: order
      });
    });
    recalculateUsage(state);
    return { ok: true, session_id: sid, date: request.date, idempotent: false };
  }

  /* Manual rows may name an exercise that is not in the library yet; that is the
   * one path allowed to create a master row as a side effect (spec 7.1). */
  function manualItems(state, items) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
      throw ApiError(400, '1〜100件の種目を指定してください');
    }
    return items.map(function (raw) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw ApiError(400, '明細の形式が正しくありません');
      }
      var master = null;
      var name;
      if (raw.ex_id !== null && raw.ex_id !== undefined) {
        var exId = anId(raw.ex_id, 'ex_id');
        master = byId(state.exercises, 'ex_id', exId);
        if (!master) throw ApiError(404, '種目が見つかりません', { ex_id: exId });
        name = master.name;
      } else {
        name = aName(raw.name);
        master = state.exercises.filter(function (e) { return e.name === name; })[0] || null;
      }
      var v = values(raw, master);
      if (!master) {
        master = {
          ex_id: nextId(state, 'ex'), name: name, sets: v[0], reps: v[1], seconds: v[2], unit: v[3],
          use_count: 0, last_used: null, created: nowIso()
        };
        state.exercises.push(master);
      } else if (raw.ex_id === null || raw.ex_id === undefined) {
        Object.assign(master, { sets: v[0], reps: v[1], seconds: v[2], unit: v[3] });
      }
      return { ex_id: master.ex_id, name: name, sets: v[0], reps: v[1], seconds: v[2], unit: v[3] };
    });
  }

  function replaceItems(state, sessionId, rows) {
    state.items = state.items.filter(function (i) { return i.session_id !== sessionId; });
    rows.forEach(function (row, order) {
      state.items.push(Object.assign({ item_id: nextId(state, 'item'), session_id: sessionId, ord: order }, row));
    });
  }

  function logWorkout(state, payload) {
    var date = aDate(payload.date);
    var note = aText(payload.note, 'メモ', 5000);
    var hasTime = 'performed_time' in payload;
    var performed = hasTime ? aPerformedTime(payload.performed_time) : null;
    var rows = manualItems(state, payload.items);
    var old = state.sessions.filter(function (s) { return s.date === date && s.session_kind === 'manual'; })[0];
    var sid;
    if (old) {
      sid = old.session_id;
      /* The note stays unless one was sent: the second by-hand record of a
       * day joins the first, it does not wipe what was written on it
       * (Codex review, second pass). */
      Object.assign(old, {
        ts: nowIso(), menu_id: null, menu_name: null, video_url: null,
        request_id: null, request_hash: null
      });
      if ('note' in payload) old.note = note;
      if (hasTime) old.performed_time = performed;
    } else {
      sid = nextId(state, 'session');
      state.sessions.push({
        session_id: sid, date: date, ts: nowIso(), note: note, session_kind: 'manual',
        menu_id: null, menu_name: null, video_url: null, request_id: null, request_hash: null,
        performed_time: hasTime ? performed : null
      });
    }
    replaceItems(state, sid, rows);
    recalculateUsage(state);
    return { ok: true, session_id: sid, date: date };
  }

  function sessionDelete(state, rawId) {
    var sessionId = anId(rawId, 'session_id');
    if (!byId(state.sessions, 'session_id', sessionId)) throw ApiError(404, '実績が見つかりません');
    state.items = state.items.filter(function (i) { return i.session_id !== sessionId; });
    state.sessions = state.sessions.filter(function (s) { return s.session_id !== sessionId; });
    recalculateUsage(state);
    return { ok: true, session_id: sessionId };
  }

  /* Correcting a past day never touches the menu definition it came from. */
  function sessionUpdate(state, payload) {
    var sessionId = anId(payload.session_id, 'session_id');
    var newDate = payload.date === null || payload.date === undefined ? null : aDate(payload.date);
    var hasNote = 'note' in payload;
    var note = hasNote ? aText(payload.note, 'メモ', 5000) : null;
    var hasTime = 'performed_time' in payload;
    var performed = hasTime ? aPerformedTime(payload.performed_time) : null;
    var row = byId(state.sessions, 'session_id', sessionId);
    if (!row) throw ApiError(404, '実績が見つかりません');
    var date = newDate || row.date;
    if (row.session_kind === 'manual' && date !== row.date) {
      var clash = state.sessions.filter(function (s) {
        return s.date === date && s.session_kind === 'manual' && s.session_id !== sessionId;
      })[0];
      if (clash) throw ApiError(409, 'その日には手入力の記録が既にあります');
    }
    /* A menu that is only a video was recorded with no lines; correcting
     * its time must not demand lines it never had (Codex review). */
    var bare = row.session_kind === 'menu'
      && !state.items.some(function (i) { return i.session_id === sessionId; })
      && (payload.items === undefined || payload.items === null
        || (Array.isArray(payload.items) && payload.items.length === 0));
    var rows = bare ? [] : manualItems(state, payload.items);
    replaceItems(state, sessionId, rows);
    row.date = date;
    if (hasNote) row.note = note;
    if (hasTime) row.performed_time = performed;
    /* The request id stays, so a tap that is still being retried somewhere
     * cannot write this record a second time. But what is here is no longer
     * what that tap asked for, and saying "already done" without saying that
     * would be a lie. */
    if (row.request_id) row.request_edited = true;
    recalculateUsage(state);
    return { ok: true, session_id: sessionId, date: date };
  }

  /* ---- storage back ends ---- */

  function memoryPersist(initial) {
    var held = initial ? clone(initial) : null;
    return {
      load: async function () { return held ? clone(held) : null; },
      save: async function (state) { held = clone(state); },
      /* The same read-change-write in one go that the database offers, so the
       * tests exercise the path the phone actually takes. */
      update: async function (apply) {
        var draft = clone(held || emptyState());
        var result = apply(draft);
        held = clone(draft);
        return result;
      }
    };
  }

  function indexedDbPersist(dbName) {
    var name = dbName || DB_NAME;
    function open() {
      return new Promise(function (resolve, reject) {
        var request = global.indexedDB.open(name, 1);
        request.onupgradeneeded = function () {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error); };
      });
    }
    function run(mode, work) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, mode);
          var out;
          work(tx.objectStore(STORE_NAME), function (value) { out = value; });
          tx.oncomplete = function () { db.close(); resolve(out); };
          tx.onerror = function () { db.close(); reject(tx.error); };
          tx.onabort = function () { db.close(); reject(tx.error); };
        });
      });
    }
    /* Whatever was left in the database under the old name. Nothing is created
     * if it is not there, and nothing is deleted if it is: the old copy stays
     * where it is until the person clears their browser. */
    function rescue() {
      return new Promise(function (resolve) {
        var request = global.indexedDB.open(OLD_DB_NAME, 1);
        var made = false;
        request.onupgradeneeded = function () { made = true; };
        request.onerror = function () { resolve(null); };
        request.onsuccess = function () {
          var db = request.result;
          if (made || !db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            if (made) { try { global.indexedDB.deleteDatabase(OLD_DB_NAME); } catch (e) { } }
            resolve(null);
            return;
          }
          var tx = db.transaction(STORE_NAME, 'readonly');
          var got = tx.objectStore(STORE_NAME).get(DOC_KEY);
          tx.oncomplete = function () { db.close(); resolve(got.result || null); };
          tx.onerror = function () { db.close(); resolve(null); };
          tx.onabort = function () { db.close(); resolve(null); };
        };
      });
    }

    return {
      load: function () {
        return run('readonly', function (store, done) {
          var request = store.get(DOC_KEY);
          request.onsuccess = function () { done(request.result || null); };
        }).then(function (held) {
          if (held || name !== DB_NAME) return held;
          return rescue().then(function (older) {
            if (!older) return null;
            return run('readwrite', function (store) { store.put(older, DOC_KEY); })
              .then(function () { return older; });
          });
        });
      },
      save: function (state) {
        return run('readwrite', function (store) { store.put(state, DOC_KEY); });
      },

      /* Read the document, change it, and write it back without ever leaving
       * the transaction.
       *
       * This is what keeps two tabs from writing over each other. A lock can
       * do it too, but only where the browser has one - and where it does not,
       * the old fault came straight back: both tabs read the same document,
       * both saved, and one person's record went out with the other's. The
       * database has always been able to do this properly; it was being asked
       * for a read and then, separately, for a write.
       *
       * The change has to be made without waiting for anything: a transaction
       * closes the moment it is left idle. Everything slow - hashing a request
       * id, asking YouTube for a title - is already done before this is called.
       */
      update: function (apply) {
        return run('readwrite', function (store, done) {
          var reading = store.get(DOC_KEY);
          reading.onsuccess = function () {
            var draft = reading.result || emptyState();
            var result = apply(draft);
            store.put(draft, DOC_KEY);
            done(result);
          };
        });
      }
    };
  }

  /* ---- the object the screen talks to ---- */

  function createApi(persist) {
    var state = null;
    var queue = Promise.resolve();

    /* Always from storage, never from the copy last left in memory: the app can
     * be open in two tabs, and a screen showing records that another tab has
     * already changed is worse than one read more. */
    async function ready() {
      state = (await persist.load()) || state || emptyState();
      return state;
    }

    /* Serialised so two taps cannot interleave a read-modify-write. */
    function serial(work) {
      var next = queue.then(work, work);
      queue = next.then(function () { }, function () { });
      return next;
    }

    function read(work) {
      return serial(async function () { return work(await ready()); });
    }

    /* Reads the stored document again before every change, rather than trusting
     * the copy in memory.  Two tabs of the app share one IndexedDB but not one
     * copy, so without this the second one to save silently overwrites the
     * first - and the menu revision check, whose whole job is to catch exactly
     * that, would never fire.
     *
     * Re-reading is not enough on its own, though: it only narrows the gap
     * between the read and the save, and two tabs can still both read the old
     * document and both save over each other - which loses a record, and can
     * bring a deleted one back. So the whole read-change-save is held under a
     * lock the browser keeps across every tab of this app. Only the menus had
     * a revision to catch this; records, exercises and settings had nothing.
     *
     * Where there is no such lock (an older browser, a worker without it),
     * this falls back to what it did before - one tab is still correct, and
     * the app is one person's record book, usually in one tab. */
    function guarded(work) {
      var locks = global.navigator && global.navigator.locks;
      if (!locks || typeof locks.request !== 'function') return work();
      return locks.request('ouchitore-write', work);
    }

    function write(work) {
      return serial(async function () {
        if (typeof persist.update === 'function') {
          var held = null;
          var answer = await persist.update(function (draft) {
            var out = work(draft);
            held = draft;
            return out;
          });
          state = held;
          return answer;
        }
        /* A store that cannot do it in one go: hold the lock instead, and
         * where there is no lock either, this is what it always was. */
        return guarded(async function () {
          var stored = await persist.load();
          var draft = clone(stored || state || emptyState());
          var result = await work(draft);
          await persist.save(draft);
          state = draft;
          return result;
        });
      });
    }

    function parse(path) {
      var at = path.indexOf('?');
      var query = {};
      if (at >= 0) {
        new URLSearchParams(path.slice(at + 1)).forEach(function (value, key) { query[key] = value; });
        path = path.slice(0, at);
      }
      return { path: path, query: query };
    }

    return {
      get: function (rawPath) {
        var parsed = parse(rawPath);
        return read(function (s) {
          switch (parsed.path) {
            case '/api/today': return todayItems(s, parsed.query.date || localDate());
            case '/api/history': return history(s, parsed.query.end || localDate(),
              /^\d+$/.test(parsed.query.days || '') ? Number(parsed.query.days) : 30);
            case '/api/week': return weekCounts(s, parsed.query.end || localDate());
            case '/api/recent': return { ok: true, items: recentNames(s) };
            case '/api/settings': return { ok: true, settings: settingsOf(s) };
            case '/api/greeting': return greetingFacts(s, parsed.query.date || localDate(),
              /^\d+$/.test(parsed.query.hour || '') ? Number(parsed.query.hour) : null);
            case '/api/library': return libraryList(s);
            case '/api/menus': return menusList(s);
            default: throw ApiError(404, '見つかりません');
          }
        });
      },

      post: async function (path, body) {
        var payload = body || {};
        if (typeof payload !== 'object' || Array.isArray(payload)) throw ApiError(400, '送信内容の形式が正しくありません');
        if (path === '/api/menu/complete') {
          var request = await completionRequest(payload);   // hashing is async, so it happens first
          return write(function (s) { return menuCompleteWith(s, payload, request); });
        }
        return write(function (s) {
          switch (path) {
            case '/api/log': return logWorkout(s, payload);
            case '/api/library/save': return librarySave(s, payload);
            case '/api/library/delete': return libraryDelete(s, payload.ex_id);
            case '/api/menu/save': return menuSave(s, payload);
            case '/api/menu/delete': return menuDelete(s, payload.menu_id);
            case '/api/menu/reorder': return menuReorder(s, payload);
            case '/api/session/delete': return sessionDelete(s, payload.session_id);
            case '/api/session/update': return sessionUpdate(s, payload);
            case '/api/settings/save': return settingsSave(s, payload);
            default: throw ApiError(404, '見つかりません');
          }
        });
      },

      /* Export and import are the only way records leave the phone. */
      exportDocument: function () {
        return read(function (s) { return clone(s); });
      },

      importDocument: function (document) {
        /* A file from a version that does not exist yet is a different
         * problem from a file that is simply wrong, and the person holding it
         * can act on the difference: one means update the app, the other
         * means this is not one of ours. */
        if (document && typeof document === 'object'
          && typeof document.v === 'number' && document.v > SCHEMA) {
          throw ApiError(400, 'このファイルは新しい版のトレ録で書き出されています。'
            + 'アプリを新しくしてから読み込んでください。');
        }
        if (!document || typeof document !== 'object' || document.v !== SCHEMA
          || !Array.isArray(document.sessions) || !document.seq) {
          throw ApiError(400, 'この書き出しファイルは読み込めません');
        }
        /* Every table, and every counter, or not at all.  A file missing one
         * of these used to be accepted and then the app fell over somewhere
         * else entirely - opening the menu list, or handing out ids that came
         * out as NaN, which could then never be deleted.  A file is either
         * whole or it is refused here, where the message can say so. */
        TABLES.forEach(function (name) {
          if (!Array.isArray(document[name])) {
            throw ApiError(400, 'この書き出しファイルは読み込めません');
          }
        });
        if (typeof document.seq !== 'object' || Array.isArray(document.seq)) {
          throw ApiError(400, 'この書き出しファイルは読み込めません');
        }
        /* A document is a file someone can edit by hand, and Object.assign
         * would walk a __proto__ key straight onto every object in the page.
         * Nothing legitimate carries these names. */
        var dangerous = ['__proto__', 'constructor', 'prototype'];
        var seek = function (value, depth) {
          if (!value || typeof value !== 'object' || depth > 6) return false;
          if (Array.isArray(value)) return value.some(function (one) { return seek(one, depth + 1); });
          return Object.keys(value).some(function (key) {
            return dangerous.indexOf(key) >= 0 || seek(value[key], depth + 1);
          });
        };
        if (seek(document, 0) || Object.prototype.hasOwnProperty.call(document, '__proto__')) {
          throw ApiError(400, 'この書き出しファイルは読み込めません');
        }
        COUNTERS.forEach(function (name) {
          var held = document.seq[name];
          if (typeof held !== 'number' || !Number.isInteger(held) || held < 0) {
            throw ApiError(400, 'この書き出しファイルは読み込めません');
          }
        });
        /* A counter that has fallen behind the rows it counts is worse than a
         * missing one: the next thing saved is handed an id that is already
         * taken, and from then on two different exercises answer to the same
         * number - editing changes one of them, deleting takes both.
         * Demonstrated, so it is checked. */
        var behind = [
          ['ex', 'exercises', 'ex_id'], ['menu', 'menus', 'menu_id'],
          ['menu_item', 'menu_items', 'menu_item_id'], ['session', 'sessions', 'session_id'],
          ['item', 'items', 'item_id']
        ];
        behind.forEach(function (one) {
          var highest = 0;
          var seenIds = Object.create(null);
          document[one[1]].forEach(function (row) {
            var id = row && row[one[2]];
            if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
              throw ApiError(400, 'この書き出しファイルは読み込めません');
            }
            /* Two rows with one id: whichever is edited, the other changes
             * too, and a delete takes both. Refused at the door (Codex
             * review 2026-09-12). */
            if (seenIds[id]) throw ApiError(400, 'この書き出しファイルは読み込めません');
            seenIds[id] = true;
            if (id > highest) highest = id;
          });
          if (!Number.isSafeInteger(document.seq[one[0]]) || document.seq[one[0]] < highest
            || document.seq[one[0]] > Number.MAX_SAFE_INTEGER - 1000000) {
            throw ApiError(400, 'この書き出しファイルは読み込めません');
          }
        });
        /* And every row has to belong to something that is here. An exercise
         * hanging off a record that is gone can never be seen or removed, and
         * when its id comes round again it is thrown away by whatever writes
         * next - quietly, years later. */
        var present = function (rows, key) {
          var held = {};
          rows.forEach(function (row) { held[row[key]] = true; });
          return held;
        };
        var sessions = present(document.sessions, 'session_id');
        var exercises = present(document.exercises, 'ex_id');
        var menus = present(document.menus, 'menu_id');
        /* And the numbers in each row. Everything written through the app goes
         * past strictInt on the way in; a file does not, so a hand-edited one
         * could carry sets: -5 or reps: "not-a-number" into the screens, which
         * count on them being numbers. Names and units likewise.
         *
         * The bounds are the same ones the app enforces, so a file it wrote is
         * always acceptable and a file it could not have written is not. */
        var whole = function (value, low, high) {
          if (value === null || value === undefined) return true;
          return typeof value === 'number' && Number.isInteger(value)
            && value >= low && value <= high;
        };
        var named = function (value, limit) {
          return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
        };
        /* The same shape the app writes: a unit, and the count that goes
         * with it. A row with unit null, or sets null, is not one the app
         * could have written. */
        var counted = function (row) {
          if (!whole(row.sets, 1, 99) || row.sets === null || row.sets === undefined) return false;
          if (row.unit === 'reps') return whole(row.reps, 1, 999) && row.reps !== null && row.reps !== undefined
            && (row.seconds === null || row.seconds === undefined);
          if (row.unit === 'sec') return whole(row.seconds, 1, 3600) && row.seconds !== null && row.seconds !== undefined
            && (row.reps === null || row.reps === undefined);
          return false;
        };
        var flag = function (value) { return value === undefined || value === null || typeof value === 'boolean'; };
        var textOrNone = function (value, limit) {
          return value === undefined || value === null || (typeof value === 'string' && value.length <= limit);
        };
        var urlOrNone = function (value) {
          return value === undefined || value === null
            || (typeof value === 'string' && value.length <= 2048 && /^https?:\/\/[^\s/]+/i.test(value));
        };
        var realDate = function (value) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          var parts = value.split('-').map(Number);
          var d = new Date(parts[0], parts[1] - 1, parts[2]);
          return d.getFullYear() === parts[0] && d.getMonth() === parts[1] - 1 && d.getDate() === parts[2];
        };
        var timeOrNone = function (value) {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
          var hm = value.split(':').map(Number);
          return hm[0] <= 23 && hm[1] <= 59;
        };
        var seenRequests = Object.create(null);
        var manualDays = Object.create(null);
        var wrong =
          document.exercises.some(function (e) { return !named(e.name, 100) || !counted(e); })
          || document.menus.some(function (m) {
            return !named(m.name, 100) || !textOrNone(m.tag, 30) || !urlOrNone(m.video_url)
              || !textOrNone(m.note, 5000) || !(m.ord === undefined || m.ord === null || whole(m.ord, 0, 1000000))
              || !(m.revision === undefined || (m.revision !== null && whole(m.revision, 1, 1000000000)));
          })
          || document.menu_items.some(function (mi) { return !counted(mi) || !flag(mi.skip) || !flag(mi.auto); })
          || document.items.some(function (i) { return !named(i.name, 100) || !counted(i); })
          || document.sessions.some(function (ss) {
            if (!realDate(ss.date) || !timeOrNone(ss.performed_time) || !textOrNone(ss.note, 5000)
              || !urlOrNone(ss.video_url) || !(ss.session_kind === 'manual' || ss.session_kind === 'menu')) return true;
            /* One by-hand record a day is what the store enforces on the way
             * in; a file saying otherwise did not come from it. */
            if (ss.session_kind === 'manual') {
              if (manualDays[ss.date]) return true;
              manualDays[ss.date] = true;
            }
            if (ss.request_id !== null && ss.request_id !== undefined) {
              if (typeof ss.request_id !== 'string' || ss.request_id.length > 200 || seenRequests[ss.request_id]) return true;
              seenRequests[ss.request_id] = true;
            }
            return false;
          });
        if (wrong) throw ApiError(400, 'この書き出しファイルは読み込めません');
        /* The settings block, when there is one, holds three small values. */
        if (document.settings !== undefined && document.settings !== null) {
          var st = document.settings;
          var okSettings = st && typeof st === 'object' && !Array.isArray(st)
            && (st.companion === undefined || st.companion === null
              || (typeof st.companion === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(st.companion)))
            && (st.nickname === undefined || st.nickname === null
              || (typeof st.nickname === 'string' && st.nickname.length <= 40))
            && (st.setup_done === undefined || st.setup_done === null || typeof st.setup_done === 'boolean'
              || (typeof st.setup_done === 'string' && st.setup_done.length <= 40));
          if (!okSettings) throw ApiError(400, 'この書き出しファイルは読み込めません');
        }

        var dangling =
          document.items.some(function (i) { return !sessions[i.session_id]; })
          || document.menu_items.some(function (mi) { return !menus[mi.menu_id] || !exercises[mi.ex_id]; });
        if (dangling) throw ApiError(400, 'この書き出しファイルは読み込めません');
        return write(function (draft) {
          Object.keys(draft).forEach(function (key) { delete draft[key]; });
          Object.assign(draft, clone(document));
          recalculateUsage(draft);
          return { ok: true, sessions: draft.sessions.length };
        });
      }
    };
  }

  var api = {
    SCHEMA: SCHEMA, ApiError: ApiError, emptyState: emptyState,
    createApi: createApi, memoryPersist: memoryPersist, indexedDbPersist: indexedDbPersist
  };
  global.workoutStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
