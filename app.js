/* The screens, driven by store.js.
 *
 * Every style string here is lifted from design/screens/*.html, which are cut
 * straight out of the Claude Design canvas.  Nothing about the look is decided
 * in this file: it fills the design's markup with the phone's own records.
 * When the design changes, re-run tools/workout_pwa_extract.py and follow the
 * diff.
 */
(function () {
  'use strict';

  var api = workoutStore.createApi(workoutStore.indexedDbPersist());
  var root = document.getElementById('app');

  /* ---- tiny helpers ---- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'style' || key === 'class') el.setAttribute(key, value);
      else if (key.slice(0, 2) === 'on') el.addEventListener(key.slice(2), value);
      else if (key === 'text') el.textContent = value;
      else el.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  /* An SVG drawn from markup. Design hands these over as paths; the app
   * never draws a picture out of CSS boxes again (the owner's phone showed
   * what that looks like). */
  function svg(markup) {
    var box = document.createElement('template');
    box.innerHTML = markup.trim();
    return box.content.firstChild;
  }
  var ICON = {
    bin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.2 7l.9 12.1A2 2 0 0 0 9.1 21h5.8a2 2 0 0 0 2-1.9L17.8 7"/><path d="M10.4 11v6"/><path d="M13.6 11v6"/></svg>',
    tick: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.6 9.6 17 19 7.4"/></svg>',
    other: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 11.1V12a8.4 8.4 0 1 1-4.98-7.68"/><path d="M8.4 11.4 12 15l9-9.6"/></svg>',
    chevron: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5.5 16 12l-7 6.5"/></svg>',
    plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    home: ['<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M2.8 11.1 12 3.3l9.2 7.8v8.1a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6z"/></svg>',
           '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2.8 11.1 12 3.3l9.2 7.8v8.1a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6z"/></svg>'],
    menus: ['<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M4.4 4.9h15.2a1.8 1.8 0 0 1 1.8 1.8v10.6a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V6.7a1.8 1.8 0 0 1 1.8-1.8z"/><path d="M10.1 8.7 15.9 12 10.1 15.3z"/></svg>',
            '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M4.4 4.9h15.2a1.8 1.8 0 0 1 1.8 1.8v10.6a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V6.7a1.8 1.8 0 0 1 1.8-1.8zM10.1 8.7 15.9 12 10.1 15.3z"/></svg>'],
    settings: ['<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 2.02H14.12L14.29 4.96L15.36 5.41L17.56 3.45L20.55 6.44L18.59 8.64L19.04 9.71L21.98 9.88V14.12L19.04 14.29L18.59 15.36L20.55 17.56L17.56 20.55L15.36 18.59L14.29 19.04L14.12 21.98H9.88L9.71 19.04L8.64 18.59L6.44 20.55L3.45 17.56L5.41 15.36L4.96 14.29L2.02 14.12V9.88L4.96 9.71L5.41 8.64L3.45 6.44L6.44 3.45L8.64 5.41L9.71 4.96Z"/><circle cx="12" cy="12" r="3.1"/></svg>',
               '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M9.88 2.02H14.12L14.29 4.96L15.36 5.41L17.56 3.45L20.55 6.44L18.59 8.64L19.04 9.71L21.98 9.88V14.12L19.04 14.29L18.59 15.36L20.55 17.56L17.56 20.55L15.36 18.59L14.29 19.04L14.12 21.98H9.88L9.71 19.04L8.64 18.59L6.44 20.55L3.45 17.56L5.41 15.36L4.96 14.29L2.02 14.12V9.88L4.96 9.71L5.41 8.64L3.45 6.44L6.44 3.45L8.64 5.41L9.71 4.96ZM15.1 12A3.1 3.1 0 1 1 8.9 12A3.1 3.1 0 1 1 15.1 12Z"/></svg>']
  };

  function videoId(url) {
    var m = /(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(url || '');
    return m ? m[1] : null;
  }

  /* The app never stores a thumbnail: the viewer's browser reads it from
   * YouTube, the same way an embed would (see the publishing note, 3.3). */
  function thumbUrl(url) {
    var id = videoId(url);
    return id ? 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg' : null;
  }

  var WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  /* "9月13日（日）" - the home header's date, as Claude Design settled it. */
  function jaDateLabel(date) {
    var d = parseYmd(date);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEKDAYS[(d.getDay() + 6) % 7] + '）';
  }

  function longLabel(date) {
    var d = parseYmd(date);
    return date + ' ' + WEEKDAYS[(d.getDay() + 6) % 7];
  }
  /* Four steps of lightness by how many records the day holds - no hue, no
   * score. The colours are the theme's (themes.css --lv1..--lv4): each
   * theme keeps the hue fixed and moves only the lightness, so the order
   * survives with the hue taken out, which is the point for a colour-blind
   * reader. */
  var WEEK_FILLS = ['var(--lv1)', 'var(--lv2)', 'var(--lv3)', 'var(--lv4)'];

  /* ---- the look ----
   *
   * Three colour sets (2026-09-14, owner's call): the published look until
   * now, the owner's local app (default), and a third one still to come from
   * Claude Design. Kept on this phone only; index.html reads the same key
   * before the first paint. */
  var THEME_KEY = 'toreroku.theme';
  /* id, name, sub-text, and the three sample colours (ground / card / primary)
   * from design/THEMES_20260914.md. */
  var THEMES = [
    ['classic', 'いまのトレ録', '青みの灰色の地・白いカード', ['#eef1f6', '#fff', '#1d5f9f']],
    ['paper', '紙', '生成りの地・クリーム色のカード', ['#efe9df', '#fffdf8', '#1f6fb2']],
    ['night', '夜', '暗い地・明るい文字', ['#14181d', '#1e242b', '#f2a33c']]
  ];
  function currentTheme() {
    var t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) { t = null; }
    return THEMES.some(function (one) { return one[0] === t; }) ? t : 'paper';
  }
  var THEME_COLOR = { paper: '#efe9df', classic: '#eef1f6', night: '#14181d' };
  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[name] || THEME_COLOR.paper);
    try { localStorage.setItem(THEME_KEY, name); } catch (e) { /* private window */ }
  }

  /* ---- the line above the card ----
   *
   * Design settled what the companion may say, after the owner corrected me:
   * it is not mute, it simply never pushes. Their rule, in their words - the
   * companion "sees what happened and says that, and does not touch how you
   * feel or what you should do next"; and because saying nothing at all turns
   * watching into surveillance, opening the app always leaves one line there.
   *
   * What it may say: the time of day, the first day ever, that today is still
   * blank, how long since the last time, how many records today, how many days
   * this week. One of them, never two.
   *
   * What it may not: anything right after a record is written (that would be
   * praise - the circle and the figures move, the line stays where it was),
   * anything counting down to a round number, anything claiming to know how
   * you feel, and anything anywhere but the home screen.
   *
   * Chosen once a day and then fixed, so it does not change under you as you
   * use the app; and the same sentence is not repeated within three days.
   * That memory lives on this device only - it says nothing about the records
   * and has no business travelling with them.
   */
  var nameSpent = false;
  var LINE_KEY = 'ouchitore-line';
  var SAID_KEY = 'ouchitore-said';

  function remembered(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }

  function remember(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private window */ }
  }

  function daysBetween(from, to) {
    if (!from || !to) return 999;
    return Math.round((parseYmd(to) - parseYmd(from)) / 86400000);
  }

  var FIRST_LINE = 'はじめまして。記録すると、上の「今週の実績」にその日の回数が、下の「今日の記録」に何をいつやったかが残ります。';

  function greetingLine(facts, nickname, todayCount) {
    var hello = facts.part_of_day === 'morning' ? 'おはようございます'
      : facts.part_of_day === 'afternoon' ? 'こんにちは' : 'こんばんは';
    if (nickname && !nameSpent) {
      nameSpent = true;
      hello += '、' + nickname + 'さん。';
    } else {
      hello += '。';
    }

    /* Already decided today: the same line all day, whatever happens in
     * between. Writing a record must not change what is said about it. */
    var held = remembered(LINE_KEY);
    if (held.date === facts.date) {
      /* Holding the line steady after a record is Design's rule, so that
       * writing something down is never answered with praise. But a line that
       * has become untrue is worse than one that flatters: きょうはまだ書いて
       * いません, said to someone who has just written something, is simply
       * wrong. When that happens the fact is dropped and the greeting stands
       * alone - still saying nothing about what was done. */
      if (held.kind === 'blank' && facts.has_today) {
        remember(LINE_KEY, { date: facts.date, kind: 'none', text: '' });
        return hello;
      }
      /* The wording of the first-day line is the app's, not the day's:
       * if it has been rewritten since this morning, the new words win. */
      if (held.kind === 'first') return hello + FIRST_LINE;
      if (held.text) return hello + held.text;
      if (held.kind) return hello;
    }

    var said = remembered(SAID_KEY);
    var free = function (kind) { return daysBetween(said[kind], facts.date) >= 3; };

    /* In Design's order, and only one of them. */
    var candidates = [];
    if (facts.first_ever) candidates.push(['first', FIRST_LINE]);
    if (facts.days_since !== null && facts.days_since >= 3) {
      candidates.push(['gap', '前に書いたのは' + facts.days_since + '日前です。']);
    }
    if (!facts.has_today) candidates.push(['blank', 'きょうはまだ書いていません。']);
    if (facts.has_today && todayCount > 0) {
      candidates.push(['today', 'きょうは' + todayCount + '件あります。']);
    }
    if (facts.days_this_week >= 2) {
      candidates.push(['week', '今週は' + facts.days_this_week + '日目です。']);
    }

    var pick = candidates.filter(function (one) { return free(one[0]); })[0] || null;
    if (!pick) {
      remember(LINE_KEY, { date: facts.date, kind: 'none', text: '' });
      return hello;
    }
    said[pick[0]] = facts.date;
    remember(SAID_KEY, said);
    remember(LINE_KEY, { date: facts.date, kind: pick[0], text: pick[1] });
    return hello + pick[1];
  }

  /* ---- home ---- */
  function weekStrip(today, history, thisWeek, prevWeek, onPick, noRecordsYet) {
    var counts = {};
    (history.days || []).forEach(function (day) { counts[day.date] = day.sessions.length; });
    var todayDate = parseYmd(today);
    var monday = new Date(todayDate);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    /* One cell per day, as the owner's local app draws it (2026-09-14):
     * the weekday label and a 26px square stacked in a column. Past days and
     * today are white cells with a hairline; today's cell wears the theme's
     * frame and a bold label; a day still to come has no cell at all and
     * cannot be pressed. The square is filled by count (four steps of
     * lightness) or, for a day with nothing, drawn as a dashed outline. */
    var cells = [];
    for (var i = 0; i < 7; i++) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + i);
      var date = ymd(day);
      var future = date > today;
      var isToday = date === today;
      var count = counts[date] || 0;
      var fill = count > 0 ? WEEK_FILLS[Math.min(count, WEEK_FILLS.length) - 1] : null;
      var cell = 'display:flex;flex-direction:column;align-items:center;gap:6px;min-height:62px;'
        + 'padding:6px 0 7px;border-radius:9px;font-family:inherit;'
        + (future ? 'background:transparent;border:0;cursor:default;'
                  : 'background:var(--cell-bg);cursor:pointer;'
                    + (isToday ? 'border:2px solid var(--today-ring);' : 'border:1px solid var(--cell-line);'));
      var label = 'font-size:11px;' + (isToday ? 'font-weight:800;color:var(--ink)'
        : 'font-weight:700;color:var(--' + (future ? 'faint' : 'sub') + ')');
      var mark = 'width:26px;height:26px;border-radius:7px;'
        + (fill ? 'background:' + fill + ';'
                : 'border:1.5px dashed var(--cell-dash' + (future ? '-future' : '') + ');');
      cells.push(h('button', {
        style: cell,
        'aria-disabled': future ? 'true' : null,
        'aria-label': (day.getMonth() + 1) + '月' + day.getDate() + '日'
          + (count ? 'の記録を見る（' + count + '件）' : '（記録なし）'),
        onclick: future ? null : onPick.bind(null, date)
      }, [
        h('span', { style: label, text: WEEKDAYS[i] }),
        h('span', { style: mark })
      ]));
    }

    /* Claude Design (2026-09-13): the block is one unit, and the caption
     * that explains the squares stays under them only while nothing has
     * ever been recorded. The 24px that follows (to the companion's line)
     * is what shows where the block ends; no rule is drawn. */
    return h('div', { style: 'padding:16px 18px 0;display:flex;flex-direction:column' }, [
      h('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px' }, cells),
      /* "今週の実績 1 日" with the figure heavier than its words, and last
       * week's count on the right (design/THEMES_20260914.md). */
      h('div', { style: 'display:flex;align-items:baseline;gap:6px;margin-top:10px;font-size:13px;font-weight:700;color:var(--body)' }, [
        '今週の実績',
        h('span', { style: 'font-size:17px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums', text: String(thisWeek) }),
        '日',
        h('span', { style: 'flex:1' }),
        h('span', { style: 'font-size:12px;font-weight:700;color:var(--sub)', text: '先週 ' + prevWeek + ' 日' })
      ]),
      noRecordsYet ? h('div', { style: 'margin-top:14px;font-size:13px;font-weight:400;color:var(--sub);line-height:1.7;max-width:31em',
        text: '濃いほど記録が多い日です。押すとその日を開きます。' }) : null
    ]);
  }

  /* No frame around the companion, and no space held for one that is not
   * there.  Not choosing a companion is the default, so an empty box in that
   * spot is what most people would see - it returns nothing and takes room
   * from the figures.  A picture that fails to load removes itself the same
   * way. */
  /* The companion breathes rather than performs.  Three drawings - standing,
   * eyes closed, and one small movement - are swapped every few seconds, at
   * intervals that are never quite the same, so the corner of the screen is
   * alive without anything happening in it.  A blink is over in a moment; the
   * small movement is held for a couple of seconds and then it stands still
   * again, which is most of the time.
   *
   * Someone who has asked their phone to stop animating things gets the
   * standing drawing and nothing else. */
  var COMPANION_FRAME = { a: '-a', blink: '-blink', shift: '-shift' };

  function stillPlease() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function companionBox(slug, size) {
    if (!slug) return null;
    var px = size || 84;
    var frame = function (which) { return 'companions/frames/' + slug + COMPANION_FRAME[which] + '.png'; };
    var picture = h('img', {
      src: frame('a'), alt: '',
      width: String(px), height: String(px),
      style: 'width:' + px + 'px;height:' + px + 'px;flex:none;object-fit:contain',
      onerror: function () { this.remove(); }
    });
    if (stillPlease()) return picture;

    /* Held so the swap does not show a gap on a slow connection, and so a
     * companion drawn without extra poses simply never moves. */
    var ready = {};
    ['blink', 'shift'].forEach(function (which) {
      var probe = new Image();
      probe.onload = function () { ready[which] = true; };
      probe.src = frame(which);
    });

    var timer = null;
    var rest = function () {
      timer = setTimeout(function () {
        if (!picture.isConnected) return;
        var move = ready.shift && Math.random() < 0.35 ? 'shift' : (ready.blink ? 'blink' : null);
        if (!move) { rest(); return; }
        picture.src = frame(move);
        timer = setTimeout(function () {
          if (!picture.isConnected) return;
          picture.src = frame('a');
          rest();
        }, move === 'blink' ? 160 : 2200);
      }, 3500 + Math.random() * 5000);
    };
    rest();
    return picture;
  }

  /* Two lines and then an ellipsis. YouTube titles are long, and a list is a
   * list: the whole of it is in the editing screen. Design settled this for
   * the menu list, the home rows and the history alike. */
  var TWO_LINES = 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;'
    + 'overflow:hidden;word-break:break-word';

  function amountCard(today, facts, settings, onOpen) {
    var companion = settings.companion;
    var sessions = today.sessions || [];
    var items = sessions.reduce(function (n, s) { return n + s.items.length; }, 0);
    var seconds = sessions.reduce(function (n, s) {
      return n + s.items.reduce(function (m, i) { return m + (i.unit === 'sec' ? i.sets * i.seconds : 0); }, 0);
    }, 0);
    var minutes = Math.round(seconds / 60);
    var times = sessions.map(function (s) { return s.performed_time; }).filter(Boolean).sort();
    var span = times.length > 1 ? times[0] + ' – ' + times[times.length - 1] : (times[0] || '');
    var has = sessions.length > 0;

    /* "N 種目 ｜ M 分", as the owner's local app shows it (2026-09-14): the
     * number big and heavy, its name small beside it, a hairline between
     * the two. Minutes come only from timed exercises, so they are left
     * out when there are none rather than shown as 0. */
    var figure = function (count, name, size) {
      return h('span', { style: 'display:inline-flex;align-items:baseline;gap:4px' }, [
        h('span', { style: 'font-size:' + size + 'px;font-weight:800;color:var(--ink);line-height:1;'
          + 'letter-spacing:-.01em;font-variant-numeric:tabular-nums', text: String(count) }),
        h('span', { style: 'font-size:13px;font-weight:700;color:var(--sub)', text: name })
      ]);
    };
    var figures = [figure(items, '種目', 44)];
    if (minutes > 0) {
      figures.push(h('span', { style: 'width:1px;height:30px;background:var(--line);margin:0 12px;align-self:center' }));
      figures.push(figure(minutes, '分', 44));
    }

    return h('div', { style: 'display:flex;flex-direction:column' }, [
      /* Claude Design (2026-09-13): 24px above and below, 15px, 1.8 - the
       * same distance from the block above and the card below. */
      h('div', { style: 'padding:24px 18px 14px;font-size:15px;font-weight:400;color:var(--body);line-height:1.8',
        text: greetingLine(facts, settings.nickname, sessions.length) }),
      /* One card: the companion on the left, the day's amount on the right.
       * With records it opens the day; with none it says so and cannot be
       * pressed - still drawn, so an empty day is not mistaken for a page
       * that failed to load. */
      h(has ? 'button' : 'div', {
        style: 'margin:0 18px;background:var(--card);border:1px solid var(--line);'
          + 'border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:16px 18px;'
          + 'display:flex;align-items:center;gap:14px;width:auto;'
          + 'font-family:inherit;text-align:left;color:var(--ink);' + (has ? 'cursor:pointer' : ''),
        'aria-label': has ? '今日の記録を見る' : null,
        'aria-disabled': has ? null : 'true',
        onclick: has ? onOpen : null
      }, [
        companionBox(companion, 60),
        h('span', { style: 'flex:1;min-width:0;display:flex;flex-direction:column' }, [
          h('span', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.14em', text: 'きょう動いた分' }),
          has ? h('span', { style: 'display:flex;align-items:baseline;flex-wrap:wrap;margin-top:6px' }, figures) : null,
          h('span', { style: 'font-size:12px;font-weight:700;color:var(--sub);margin-top:7px',
            text: has ? sessions.length + '件' + (span ? ' ／ ' + span : '') : 'きょうはまだ記録がありません。' })
        ])
      ])
    ]);
  }

  function thumb(videoUrl, width, height) {
    var url = thumbUrl(videoUrl);
    var inner = [];
    if (url) {
      inner.push(h('img', { src: url, alt: '', style: 'width:100%;height:100%;object-fit:cover',
        onerror: function () {
          this.style.display = 'none';
          if (this.nextSibling) this.nextSibling.style.display = 'block';
        } }));
    }
    inner.push(h('div', { style: 'display:' + (url ? 'none' : 'block') + ';font-size:9px;color:var(--faint)', text: '動画なし' }));
    if (url) {
      inner.push(h('div', {
        style: 'position:absolute;right:4px;bottom:4px;width:19px;height:19px;border-radius:10px;'
          + 'background:rgba(20,28,40,.34);display:flex;align-items:center;justify-content:center'
      }, [h('div', { style: 'width:0;height:0;border-left:6px solid rgba(255,255,255,.88);'
          + 'border-top:4px solid transparent;border-bottom:4px solid transparent;margin-left:2px' })]));
    }
    var box = 'width:' + (width || 120) + 'px;height:' + (height || 68) + 'px;border-radius:8px;'
      + 'background:var(--line2);border:1px solid var(--line);'
      + 'overflow:hidden;flex:none;position:relative;display:flex;align-items:center;justify-content:center;';
    if (!url) return h('div', { style: box }, inner);
    /* The thumbnail itself is the way to the video - there is no full-width
       row for it (settled decision, spec 17.15). */
    if (!/^https?:\/\//i.test(videoUrl || '')) return h('div', { style: box }, inner);
    return h('a', { href: videoUrl, target: '_blank', rel: 'noopener noreferrer',
      style: box + 'cursor:pointer', title: 'YouTubeで動画をひらく' }, inner);
  }

  /* ---- menus ---- */

  function menuThumb(videoUrl) {
    var url = thumbUrl(videoUrl);
    var inner = [];
    if (url) {
      inner.push(h('img', { src: url, alt: '', style: 'width:100%;height:100%;object-fit:cover',
        onerror: function () {
          this.style.display = 'none';
          if (this.nextSibling) this.nextSibling.style.display = 'block';
        } }));
    }
    inner.push(h('div', { style: 'display:' + (url ? 'none' : 'block') + ';font-size:9px;color:var(--faint)', text: '動画なし' }));
    if (url) {
      inner.push(h('div', {
        style: 'position:absolute;right:3px;bottom:3px;width:16px;height:16px;border-radius:8px;'
          + 'background:rgba(29,39,52,.78);color:#fff;font-size:8px;display:flex;align-items:center;'
          + 'justify-content:center;padding-left:1px', text: '▶'
      }));
    }
    var box = 'width:104px;height:59px;border-radius:8px;background:#e9eef5;border:1px solid var(--line);'
      + 'overflow:hidden;flex:none;position:relative;display:flex;align-items:center;justify-content:center;';
    if (!url) return h('div', { style: box }, inner);
    if (!/^https?:\/\//i.test(videoUrl || '')) return h('div', { style: box }, inner);
    return h('a', { href: videoUrl, target: '_blank', rel: 'noopener noreferrer',
      style: box + 'cursor:pointer', title: 'YouTubeで動画をひらく' }, inner);
  }

  function menuShape(menu) {
    var usual = menu.items.filter(function (i) { return !i.skip; });
    var first = usual[0] || menu.items[0];
    if (!first) return '種目なし';
    var amount = first.sets + 'セット×' + (first.unit === 'sec' ? first.seconds + '秒' : first.reps + '回');
    var count = usual.length === menu.items.length
      ? menu.items.length + '種目'
      : menu.items.length + '種目のうち' + usual.length + '種目';
    return count + ' ・ ' + amount + (menu.items.length > 1 ? ' ほか' : '');
  }

  /* Flip "usually left out" on some of a menu's exercises and save the menu
   * as it stands. Used by the badge on the partial screen and by the offer
   * on the record screen. */
  async function setSkip(menu, ids, flag) {
    problem = null;
    try {
      await api.post('/api/menu/save', {
        menu_id: menu.menu_id, revision: menu.revision,
        name: menu.name, video_url: menu.video_url || null, note: menu.note || null, tag: menu.tag || null,
        items: menu.items.map(function (i) {
          var skip = ids.indexOf(i.menu_item_id) >= 0 ? flag : i.skip === true;
          return i.unit === 'sec'
            ? { ex_id: i.ex_id, sets: i.sets, seconds: i.seconds, unit: 'sec', skip: skip, auto: i.auto === true }
            : { ex_id: i.ex_id, sets: i.sets, reps: i.reps, unit: 'reps', skip: skip, auto: i.auto === true };
        })
      });
      return true;
    } catch (error) {
      problem = error && error.note ? error.note : '保存できませんでした。';
      return false;
    }
  }

  /* The offer to keep leaving something out (Design 2026-09-12, after
   * Hevy's one-time question): only after the same exercises were left out
   * twice running, and then only once. Counted in localStorage. */
  var SKIP_OFFER_KEY = 'ouchitore_skip_offers';
  function noteExclusion(menu, draft) {
    var left = draft.items.filter(function (i) {
      var source = menu.items.filter(function (m) { return m.menu_item_id === i.menu_item_id; })[0];
      return !i.include && source && !source.skip;
    }).map(function (i) { return i.menu_item_id; }).sort();
    var all = remembered(SKIP_OFFER_KEY);
    var mine = all[String(menu.menu_id)] || { last: '', runs: 0, done: {} };
    var key = left.join(',');
    if (!left.length) { mine.last = ''; mine.runs = 0; }
    else {
      mine.runs = mine.last === key ? mine.runs + 1 : 1;
      mine.last = key;
      if (mine.runs >= 2 && !mine.done[key]) {
        mine.done[key] = true;
        state.skipOffer = { menuId: menu.menu_id, ids: left };
      }
    }
    all[String(menu.menu_id)] = mine;
    remember(SKIP_OFFER_KEY, all);
  }

  /* One tap records the whole menu.  The id is kept until the send succeeds, so
   * a double tap - or a tap, a reload, a tap - still leaves one record
   * (spec 6.3). */
  function requestId(menu, date) {
    var key = 'complete:' + menu.menu_id + ':' + date;
    var held = null;
    try { held = sessionStorage.getItem(key); } catch (e) { /* private window */ }
    if (!held) {
      held = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      try { sessionStorage.setItem(key, held); } catch (e) { /* nothing to do */ }
    }
    return { id: held, clear: function () { try { sessionStorage.removeItem(key); } catch (e) { } } };
  }

  /* One place to press, at the end of the row.
   *
   * This was a filled button the width of the card, repeated once per menu.
   * Both Apple and Google say in as many words that the strongly emphasised
   * button is for one action per view - "keep the number of prominent buttons
   * to one or two per view", "ideally for only one action on a page" - and of
   * nine apps looked at (LINE, Gmail, メルカリ, クックパッド, Zaim, マネー
   * フォワード ME, Reminders, Todoist, Things 3) not one puts a filled button
   * inside a list row. Design settled on the circle.
   *
   * Not yet done: white, a thin outline, no word under it (Design 2026-09-12).
   * Done: filled, a white tick, and the time underneath. Three things carry
   * it - the fill, the tick, and the time - so none of it rests on hue.
   */
  /* A phone with no menus yet, from artboard 5a.
   *
   * The owner asked for a way in from the empty screen and offered two: a
   * tutorial, or a few menus shipped with the app. Design took neither door
   * exactly - no samples, because that means handing out somebody else's
   * video links and links die - and put the field itself here rather than a
   * way to the screen that has the field. Paste a URL and the title arrives;
   * a menu needs no exercises; so this alone finishes the first one.
   *
   * No companion in this box: not choosing one is the default, and an empty
   * frame for a picture nobody picked is worse than nothing.
   */
  function firstMenuBox(onPasted) {
    var field = h('input', {
      type: 'url', placeholder: 'https://www.youtube.com/watch?v=…',
      style: 'border:1.5px solid var(--ink);border-radius:12px;padding:12px;min-height:50px;'
        + 'background:var(--card);font-size:12px;color:var(--ink);width:100%',
      'data-field': 'first-url'
    });
    var numbered = function (n, text) {
      return h('div', { style: 'display:flex;gap:9px;align-items:flex-start' }, [
        h('div', { style: 'width:19px;height:19px;border:1.5px solid var(--sub);border-radius:5px;flex:none;'
          + 'display:flex;align-items:center;justify-content:center;font-size:11px;'
          + 'font-weight:700;color:var(--sub);margin-top:1px', text: String(n) }),
        h('div', { style: 'font-size:12px;color:var(--body);line-height:1.6;flex:1', text: text })
      ]);
    };
    return h('div', { style: 'border:1px dashed var(--faint);border-radius:16px;padding:16px;'
      + 'display:flex;flex-direction:column;gap:12px' }, [
      h('div', { style: 'display:flex;flex-direction:column;gap:5px' }, [
        h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink)', text: 'まだトレーニングメニューがありません' }),
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.65',
          text: 'ふだん見ている YouTube の運動動画の URL を貼ると、そのままトレーニングメニューになります。'
            + '題名は動画から入ります。種目は無くてもかまいません。' })
      ]),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
        field,
        h('button', { style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;font-size:15px;'
          + 'font-weight:800;border-radius:14px;min-height:50px;box-shadow:var(--shadow-action);cursor:pointer',
          onclick: function () { onPasted(field.value, false); } }, ['URL から題名を取って作る'])
      ]),
      h('div', { style: 'display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line2);'
        + 'padding-top:12px' }, [
        numbered(1, 'YouTube で動画を開き、共有から URL を写す'),
        numbered(2, '上の欄に貼る。題名が入るので、長ければ短くする'),
        numbered(3, 'やった日は、行末の丸を押す')
      ]),
      /* Said before the URL goes in, not after: without a key the title
       * arrives alone and the exercises have to wait for a detour through
       * 設定 (the owner hit exactly that, 2026-09-12). */
      aiKey() ? null : h('div', { style: 'display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line2);'
        + 'padding-top:12px' }, [
        h('div', { style: 'font-size:12px;color:var(--body);line-height:1.6',
          text: 'Gemini のキーを作成して、このアプリに登録しておくと、URL を貼ったあと自動で種目も入ります。無料枠の範囲なら費用はかかりません。' }),
        h('button', { style: 'align-self:flex-start;border:1px solid var(--sub);background:var(--card);color:var(--ink);'
          + 'font-family:inherit;font-size:13px;font-weight:700;border-radius:12px;min-height:44px;padding:0 14px;cursor:pointer',
          onclick: function () { problem = null; state.aikeyFrom = 'record'; state.screen = { name: 'aikey' }; draw(); } },
          ['先に動画を読むキーを入れる'])
      ]),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line2);'
        + 'padding-top:12px' }, [
        h('button', { style: 'align-self:flex-start;border:0;background:none;padding:0;font-size:12px;'
          + 'font-weight:700;color:var(--color-action);text-decoration:underline;font-family:inherit;cursor:pointer;'
          + 'min-height:44px;display:flex;align-items:center;margin:-11px 0',
          onclick: function () { onPasted('', true); } }, ['動画を使わずに作る']),
        h('div', { style: 'display:flex;gap:8px;align-items:flex-start' }, [
          h('div', { style: 'width:19px;height:19px;border:1px solid var(--line);border-radius:6px;flex:none;'
            + 'display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--sub)',
            text: '↑', 'aria-hidden': 'true' }),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6;flex:1',
            text: 'Android では、YouTube の共有先に「トレ録」が出ます。そこから渡しても作れます。' })
        ])
      ])
    ]);
  }

  function menuRow(menu, first, date, doneAt, onDone, onOpen) {
    var done = !!doneAt;
    /* Design (2026-09-12), after looking at Things, Streaks, Habitify,
     * Strong: the circle is 28px and the finger gets 44 of clear space; an
     * empty circle means not yet, a filled one with a white tick means
     * done. No faint tick, no word under it - the time goes on the meta
     * line where those apps put it. */
    var mark = h('span', {
      style: 'width:28px;height:28px;border-radius:50%;display:flex;align-items:center;'
        + 'justify-content:center;box-sizing:border-box;'
        + (done ? 'background:var(--ink);border:1.5px solid var(--ink);'
                : 'background:var(--card);border:1.5px solid var(--sub);')
    }, [done ? svg(ICON.tick) : null]);

    return h('div', {
      style: 'display:flex;gap:10px;align-items:center;padding:12px 0;'
        + (first ? '' : 'border-top:1px solid var(--line2);')
    }, [
      h('button', {
        style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;align-items:flex-start;'
          + 'border:0;background:none;padding:0;font-family:inherit;text-align:left;cursor:pointer',
        'aria-label': menu.name + ' を開く',
        onclick: onOpen
      }, [
        h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink);line-height:1.35;' + TWO_LINES,
          text: menu.name }),
        h('div', { style: 'font-size:12px;color:var(--sub)',
          text: (done ? doneAt + ' ・ ' : '') + menuShape(menu) })
      ]),
      menuThumb(menu.video_url),
      h('button', {
        style: 'width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;'
          + 'border:0;background:none;padding:0;cursor:pointer',
        'aria-label': done ? menu.name + ' は ' + doneAt + ' に記録しました' : menu.name + ' をやったことを記録する',
        'aria-pressed': done ? 'true' : 'false',
        /* aria-disabled rather than disabled: the native attribute takes the
         * button out of the focus order on some platforms, and then someone
         * listening to the screen can never reach the very sentence that says
         * it is done. It stays reachable and does nothing when pressed. */
        'aria-disabled': done ? 'true' : null,
        onclick: done ? null : onDone
      }, [mark])
    ]);
  }

  /* The row at the foot of a list that opens the exercise picker: for a day
   * when what was done is not on any menu. */
  function otherRow(onTap) {
    return h('button', {
      style: 'display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 16px;'
        + 'background:var(--card);border:0;border-top:1px solid var(--line);font-family:inherit;'
        + 'font-size:15px;color:var(--ink);text-align:left;cursor:pointer',
      onclick: onTap
    }, [svg(ICON.other), 'トレーニングメニュー以外をやった']);
  }

  /* Design (2026-09-12, revised): adding a menu is not a daily act, so
   * this row stands 12px below the list, in the smaller quieter type, so
   * the record rows read as the one everyday path. */
  function addMenuRow(onTap) {
    return h('button', {
      style: 'margin-top:12px;display:flex;align-items:center;gap:10px;width:100%;min-height:44px;'
        + 'padding:0 16px;background:none;border:0;'
        + 'font-family:inherit;font-size:14px;color:var(--sub);text-align:left;cursor:pointer',
      onclick: onTap
    }, [
      h('span', { style: 'flex:none;width:24px;height:24px;display:flex;align-items:center;'
        + 'justify-content:center;border:1px solid var(--sub);border-radius:50%;color:var(--sub)',
        'aria-hidden': 'true' }, [svg(ICON.plus)]),
      'トレーニングメニューを追加する'
    ]);
  }

  /* ---- 1e: recording only part of a menu ---- */

  function amountLabel(unit, sets, reps, seconds) {
    return sets + '×' + (unit === 'sec' ? seconds + '秒' : reps + '回');
  }

  function partialScreen(draft, menu, onBack) {
    var chosen = draft.items.filter(function (i) { return i.include; });

    var rows = draft.items.map(function (item) {
      var source = menu.items.filter(function (m) { return m.menu_item_id === item.menu_item_id; })[0];
      var changed = item.sets !== source.sets;
      var left = [
        h('div', { style: 'font-size:14px;font-weight:' + (item.include ? '800' : '700')
          + ';color:var(--' + (item.include ? 'ink' : 'sub') + ')'
          + (item.include ? '' : ';text-decoration:line-through'), text: source.name })
      ];
      if (item.include && changed) {
        left.push(h('div', {
          style: 'font-size:10px;color:var(--faint);margin-top:2px',
          text: '定義 ' + amountLabel(source.unit, source.sets, source.reps, source.seconds)
            + ' → ' + amountLabel(source.unit, item.sets, source.reps, source.seconds)
        }));
      }

      var right;
      if (item.include) {
        right = h('div', { style: 'display:flex;align-items:center;gap:6px;flex:none' }, [
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:var(--card);'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを減らす',
            onclick: function () { if (item.sets > 1) { item.sets -= 1; draw(); } } }, ['−']),
          h('div', { style: 'font-size:13px;font-weight:700;color:var(--ink);'
            + 'min-width:56px;text-align:center',
            text: amountLabel(source.unit, item.sets, source.reps, source.seconds) }),
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:var(--card);'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを増やす',
            onclick: function () { if (item.sets < 99) { item.sets += 1; draw(); } } }, ['＋'])
        ]);
      } else {
        right = h('div', { style: 'font-size:12px;color:var(--faint);flex:none',
          text: amountLabel(source.unit, source.sets, source.reps, source.seconds) });
      }

      var usuallyOut = source.skip && !(draft.brought && draft.brought[item.menu_item_id]);
      return h('div', {
        'data-skip': usuallyOut ? '1' : null,
        style: 'display:flex;gap:12px;align-items:center;border-radius:14px;padding:11px 12px;'
          + (item.include ? 'border:1.5px solid var(--ink);background:var(--card)'
                          : 'border:1px solid var(--line);background:' + (usuallyOut ? 'var(--line2)' : 'var(--card)'))
      }, [
        h('button', {
          style: 'width:24px;height:24px;border-radius:7px;flex:none;padding:0;cursor:pointer;'
            + 'display:flex;align-items:center;justify-content:center;font-size:13px;'
            + (item.include ? 'background:var(--ink);color:var(--card);border:0'
                            : 'border:1.5px solid var(--faint);background:var(--card)'),
          'aria-label': source.name + (item.include ? ' を外す' : ' を選ぶ'),
          onclick: function () { item.include = !item.include; draw(); }
        }, [item.include ? '✓' : '']),
        h('div', { style: 'flex:1;min-width:0' }, left),
        /* The badge is the way back: press it and the exercise is usual
         * again. The row stays down here until the screen is next opened,
         * so nothing jumps under the finger. */
        usuallyOut ? skipBadge(async function () {
          if (!(await setSkip(menu, [item.menu_item_id], false))) { draw(); return; }
          draft.brought = draft.brought || {};
          draft.brought[item.menu_item_id] = true;
          state.notice = '毎回やる種目に戻しました。次に開いたときは、上の並びに戻ります。';
          draw();
          setTimeout(function () { state.notice = null; draw(); }, 5000);
        }) : null,
        right
      ]);
    });
    /* Design (2026-09-12): the ones usually left out sit below a line with
     * their own heading, on a fainter ground, in the ordinary text colour. */
    var usual = rows.filter(function (r) { return !r.getAttribute('data-skip'); });
    var out = rows.filter(function (r) { return r.getAttribute('data-skip'); });
    var laidOut = usual.slice();
    if (out.length) {
      laidOut.push(h('div', { style: 'border-top:1px solid var(--line);margin-top:6px;padding-top:10px;'
        + 'font-size:13px;color:var(--sub)', text: 'ふだんは外している種目' }));
      out.forEach(function (r) { laidOut.push(r); });
    }

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: menu.name }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:12px 16px;border-bottom:1px solid var(--line2);background:#fafbfd' }, [
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.55',
          text: 'やった種目だけ選びます。トレーニングメニューそのものは変わりません。' })
      ]),
      h('div', { style: 'flex:1;display:flex;flex-direction:column;padding-bottom:16px' }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px' }, [
          h('div', { style: 'font-size:12px;color:var(--sub)',
            text: chosen.length + ' / ' + draft.items.length + ' 選択' }),
          h('div', { style: 'display:flex;gap:8px' }, [
            h('button', { style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
              + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:44px;'
              + 'padding:0 10px;cursor:pointer',
              onclick: function () { draft.items.forEach(function (i) { i.include = true; }); draw(); } }, ['すべて']),
            h('button', { style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
              + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:44px;'
              + 'padding:0 10px;cursor:pointer',
              onclick: function () { draft.items.forEach(function (i) { i.include = false; }); draw(); } }, ['すべて外す'])
          ])
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px;padding:0 16px' }, laidOut)
      ]),
      state.notice ? h('div', { style: 'font-size:14px;color:var(--body);padding:0 16px 10px;line-height:1.6',
        text: state.notice }) : null,
      problem ? warnBar(problem, null, null) : null,
      h('div', {
        style: 'border-top:1px solid var(--line);padding:12px 16px 22px;display:flex;'
          + 'flex-direction:column;gap:10px;background:var(--card)'
      }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
          h('div', { style: 'font-size:12px;color:var(--sub)', text: '実施時刻' }),
          h('label', { style: 'display:flex;align-items:center;gap:8px;border:1px solid var(--line);'
            + 'border-radius:10px;padding:8px 12px;min-height:40px;cursor:pointer' }, [
            h('input', { type: 'time', value: draft.time,
              style: 'font-size:14px;font-weight:700;color:var(--ink);'
                + 'border:0;background:none;padding:0',
              onchange: function () { draft.time = this.value; } })
          ])
        ]),
        h('button', {
          style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);'
            + 'cursor:pointer;opacity:' + (chosen.length ? '1' : '.45'),
          'aria-disabled': chosen.length === 0 ? 'true' : null,
          onclick: function () { if (chosen.length === 0) return; savePartial(draft, menu); }
        }, ['選んだ' + chosen.length + '種目を記録する'])
      ])
    ]);
  }

  async function savePartial(draft, menu) {
    var token = requestId(menu, draft.date);
    problem = null;
    try {
      await api.post('/api/menu/complete', {
        menu_id: menu.menu_id, date: draft.date, request_id: token.id,
        performed_time: draft.time || null,
        items: draft.items.map(function (i) {
          return { menu_item_id: i.menu_item_id, include: i.include, sets: i.sets };
        })
      });
      token.clear();
      noteExclusion(menu, draft);
      state.screen = { name: 'home' };
    } catch (error) {
      problem = error && error.note ? error.note : '記録できませんでした。';
    }
    draw();
  }

  /* ---- 2b: history ---- */

  function shortLabel(date) {
    var d = parseYmd(date);
    return { md: date.slice(5), wd: WEEKDAYS[(d.getDay() + 6) % 7] };
  }

  function historyScreen(history, days, onBack, onMore, onPick) {
    var groups = [];
    (history.days || []).forEach(function (day) {
      var label = shortLabel(day.date);
      var items = day.sessions.reduce(function (n, s) { return n + s.item_count; }, 0);
      groups.push(h('div', {
        style: 'display:flex;align-items:baseline;justify-content:space-between;padding:14px 0 6px'
      }, [
        h('div', { style: 'font-size:13px;font-weight:800;color:var(--ink)' }, [
          h('span', { style: 'font-family:var(--mono)', text: label.md }), ' ' + label.wd
        ]),
        h('div', { style: 'font-size:11px;color:var(--faint)',
          text: day.sessions.length + '件 ・ ' + items + '種目' })
      ]));
      day.sessions.forEach(function (session) {
        groups.push(h('button', {
          style: 'padding:11px 0;border-top:1px solid var(--line2);display:flex;gap:12px;'
            + 'align-items:flex-start;width:100%;background:none;border-left:0;border-right:0;'
            + 'border-bottom:0;text-align:left;font-family:inherit;cursor:pointer',
          onclick: onPick.bind(null, session.session_id, day.date)
        }, [
          h('div', { style: 'font-size:14px;font-weight:700;color:var(--ink);'
            + 'flex:none;width:44px;padding-top:1px', text: session.performed_time || '' }),
          h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, [
            h('div', { style: 'font-size:14px;font-weight:800;color:var(--ink);line-height:1.25;' + TWO_LINES,
              text: session.menu_name || '種目 ' + session.item_count + '件' }),
            h('div', { style: 'font-size:11px;color:var(--sub)',
              text: session.session_kind === 'manual' ? '手で選んだ記録'
                : session.item_count ? session.item_count + '種目'
                : session.video_url ? '種目情報なし' : '記録のみ' })
          ])
        ]));
      });
    });
    if (!groups.length) {
      groups.push(h('div', { style: 'padding:24px 0;font-size:13px;color:var(--sub);line-height:1.6',
        text: 'この範囲に記録はありません。' }));
    }

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '履歴' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;padding:11px 18px;'
          + 'border-bottom:1px solid var(--line2);background:#fafbfd'
      }, [
        h('div', { style: 'font-size:12px;color:var(--body)',
          text: history.start + ' → ' + history.end }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:12px;font-weight:700;'
          + 'color:var(--color-action);text-decoration:underline;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
          onclick: onMore }, [days + '日前へ'])
      ]),
      h('div', { style: 'padding:0 18px 18px;display:flex;flex-direction:column' }, groups)
    ]);
  }

  /* ---- 2b-2: correcting one record ---- */

  function binIcon() {
    var icon = svg(ICON.bin);
    icon.setAttribute('width', '16'); icon.setAttribute('height', '16');
    return icon;
  }

  /* The 44-square delete at the end of a row: outline, a 24px drawing, no
   * word under it (the picture says it; aria-label says it aloud). */
  function deleteButton(label, onTap) {
    return h('button', {
      style: 'width:44px;height:44px;flex:none;border:1px solid var(--sub);border-radius:8px;'
        + 'display:flex;align-items:center;justify-content:center;background:var(--card);cursor:pointer;'
        + 'padding:0;color:var(--ink)',
      'aria-label': label, onclick: onTap
    }, [svg(ICON.bin)]);
  }

  /* A box for a count, with its unit outside where two digits cannot push
   * it out. Digits only: type=number put a spinner in the box on Android
   * Chrome and "10" read as ":" (owner's phone, 2026-09-12). */
  function numberBox(value, unitLabel, onChange) {
    return h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
      h('input', {
        type: 'text', value: String(value), inputmode: 'numeric', pattern: '[0-9]*', maxlength: '4',
        'aria-label': unitLabel,
        style: 'width:64px;height:44px;box-sizing:border-box;border:1px solid var(--sub);border-radius:6px;'
          + 'background:var(--card);padding:0 8px;text-align:center;font-size:17px;'
          + 'font-weight:700;color:var(--ink);-webkit-appearance:none;appearance:none',
        onchange: function () {
          if (!/^\d{1,4}$/.test(this.value.trim())) { this.value = String(value); return; }
          var n = parseInt(this.value, 10);
          if (!(n >= 1)) { this.value = String(value); return; }
          onChange(n);
        }
      }),
      h('span', { style: 'font-size:14px;color:var(--body)', text: unitLabel })
    ]);
  }

  /* One exercise in a list being edited. Two tiers (Design 2026-09-12):
   * the name and the delete on top, the numbers underneath, indented past
   * the handle so they line up with the name. */
  /* "Usually left out" - the words on a small framed badge (Design
   * 2026-09-12). A frame and a word, never a colour alone. */
  function skipBadge(onTap) {
    var style = 'font-size:11px;line-height:1;padding:4px 6px;border:1px solid var(--sub);border-radius:4px;'
      + 'color:var(--ink);background:var(--card);flex:none;font-family:inherit';
    if (!onTap) return h('span', { style: style, text: 'ふだんは外す' });
    return h('button', { style: style + ';min-height:44px;cursor:pointer', 'aria-label': 'ふだんは外すのをやめる',
      onclick: onTap }, ['ふだんは外す']);
  }

  function exerciseRow(handle, item, deleteLabel, onDelete, extraStyle, withSkip) {
    var counts = h('div', { style: 'display:flex;align-items:center;margin-top:4px;'
      + 'margin-left:' + (handle ? '44px' : '0') }, [
      numberBox(item.sets, 'セット', function (v) { item.sets = v; }),
      h('span', { style: 'font-size:14px;color:var(--sub);padding:0 12px', 'aria-hidden': 'true', text: '×' }),
      item.unit === 'sec'
        ? numberBox(item.seconds, '秒', function (v) { item.seconds = v; })
        : numberBox(item.reps, '回', function (v) { item.reps = v; })
    ]);
    return h('div', { style: 'display:flex;flex-direction:column;padding:6px 0;border-top:1px solid var(--line2);'
      + (extraStyle || '') }, [
      h('div', { style: 'display:flex;align-items:center;min-height:44px' }, [
        handle,
        h('div', { style: 'flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--ink);'
          + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px', text: item.name }),
        withSkip && item.skip ? skipBadge(null) : null,
        withSkip && item.skip ? h('span', { style: 'width:8px;flex:none' }) : null,
        deleteButton(deleteLabel, onDelete)
      ]),
      counts,
      /* Third tier (Design 2026-09-12): the exercise stays in the menu but
       * the one-tap record leaves it out, for a knee that does not do
       * squats. Ticked again, it comes back. */
      /* Only for what came in on its own (the owner: "it all got pulled in,
       * but I don't do this one"). A row the owner typed is the owner's
       * choice already; nothing to leave out. */
      withSkip && (item.auto || item.skip) ? h('label', { style: 'display:flex;align-items:center;gap:8px;min-height:44px;'
        + 'margin-left:' + (handle ? '44px' : '0') + ';font-size:13px;color:var(--ink);cursor:pointer;'
        + (item.skip ? 'font-weight:700' : '') }, [
        h('input', { type: 'checkbox', checked: item.skip ? 'checked' : null,
          style: 'width:20px;height:20px;margin:0;accent-color:var(--ink)',
          onchange: function () { item.skip = this.checked; draw(); } }),
        'ふだんは外す'
      ]) : null
    ]);
  }

  function fieldRow(label, valueText, warn, onOpen, hint) {
    return h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
      h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: label }),
      h('label', {
        style: 'display:flex;align-items:center;justify-content:space-between;border-radius:12px;'
          + 'padding:11px 12px;min-height:46px;background:var(--card);cursor:pointer;'
          + (warn ? 'border:1.5px solid var(--warnInk)' : 'border:1px solid var(--line)')
      }, [onOpen, h('span', { style: 'font-size:12px;color:var(--sub)', text: '変更' })]),
      hint ? h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6', text: hint }) : null
    ]);
  }

  function editScreen(edit, onCancel) {
    var rows = edit.items.map(function (item, index) {
      return exerciseRow(null, item, item.name + ' をこの記録から外す', function () {
        if (edit.items.length === 1) {
          problem = '1件以上の種目を指定してください';
        } else {
          edit.items.splice(index, 1);
        }
        draw();
      }, index === edit.items.length - 1 ? 'border-bottom:1px solid var(--line2);' : '');
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      /* Stays at the top while the form scrolls: the owner lost 保存 after
       * adding exercises far down the page (2026-09-12). */
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line);'
        + 'position:sticky;top:0;background:var(--card);z-index:3' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '記録を修正' }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--color-action);'
          + 'font-weight:800;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
          onclick: function () { saveEdit(edit); } }, ['保存'])
      ]),
      problem ? h('div', {
        style: 'display:flex;align-items:flex-start;gap:10px;padding:11px 14px;'
          + 'border-bottom:1px solid #f0e2bf;background:var(--warnSoft)'
      }, [
        h('div', { style: 'width:20px;height:20px;border:1.5px solid var(--warnInk);border-radius:5px;'
          + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;'
          + 'color:var(--warnInk);flex:none', text: '!', 'aria-hidden': 'true' }),
        h('div', { style: 'flex:1;font-size:12px;color:#7a5b12;line-height:1.5', text: problem })
      ]) : null,
      h('div', { style: 'padding:16px 18px;display:flex;flex-direction:column;gap:16px' }, [
        fieldRow('日付', edit.date, !!problem,
          h('input', { type: 'date', value: edit.date,
            style: 'font-size:15px;font-weight:700;color:var(--ink);'
              + 'border:0;background:none;padding:0',
            onchange: function () { edit.date = this.value; } }),
          '別の日へ移せます。手で選んだ記録は1日に1つまでです。'),
        fieldRow('実施時刻', edit.time, false,
          h('input', { type: 'time', value: edit.time || '',
            style: 'font-size:15px;font-weight:700;color:var(--ink);'
              + 'border:0;background:none;padding:0',
            onchange: function () { edit.time = this.value; } }), null),
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em;'
            + 'padding-bottom:6px', text: '種目' })
        ].concat(rows).concat([
          h('button', {
            style: 'margin-top:10px;border:1px dashed var(--faint);background:transparent;'
              + 'color:var(--body);font-family:inherit;font-size:13px;font-weight:700;'
              + 'border-radius:13px;min-height:46px;cursor:pointer',
            onclick: function () { edit.adding = !edit.adding; draw(); }
          }, [edit.adding ? 'とじる' : '種目を追加'])
        ]).concat(edit.adding ? [
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;padding-top:10px' },
            libraryNow.filter(function (e) {
              return !edit.items.some(function (i) { return i.name === e.name; });
            }).map(function (e) {
              return h('button', {
                style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
                  + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:11px;'
                  + 'min-height:44px;padding:0 12px;cursor:pointer',
                onclick: function () {
                  edit.items.push({ ex_id: e.ex_id, name: e.name, sets: e.sets, reps: e.reps,
                    seconds: e.seconds, unit: e.unit });
                  edit.adding = false;
                  draw();
                }
              }, [e.name]);
            }))
        ] : [])),
        h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: 'メモ' }),
          h('textarea', {
            style: 'border:1px solid var(--line);border-radius:12px;padding:11px 12px;min-height:60px;'
              + 'background:var(--card);font-size:13px;color:var(--body);line-height:1.6;font-family:inherit;'
              + 'width:100%;resize:vertical',
            onchange: function () { edit.note = this.value; }
          }, [edit.note || ''])
        ]),
        offerOpen(edit) ? h('div', { style: 'border-top:1px solid var(--line);padding-top:14px;display:flex;'
          + 'flex-direction:column;gap:12px' }, [
          h('div', { style: 'font-size:14px;color:var(--body);line-height:1.6',
            text: 'これを次もやるなら、トレーニングメニューに入れておけます。' }),
          h('button', {
            style: 'border:1px solid var(--sub);background:var(--card);color:var(--ink);font-family:inherit;'
              + 'font-size:15px;font-weight:700;border-radius:12px;min-height:44px;cursor:pointer;'
              + 'align-self:flex-start;padding:0 16px',
            onclick: function () { menuFromRecord(edit); }
          }, ['トレーニングメニューに入れる'])
        ]) : null,
        h('div', { style: 'border-top:1px solid var(--line);padding-top:14px;display:flex;'
          + 'flex-direction:column;gap:8px' }, [
          h('button', {
            style: 'border:1px solid var(--line);background:var(--card);color:var(--body);font-family:inherit;'
              + 'font-size:14px;font-weight:700;border-radius:13px;min-height:46px;cursor:pointer;'
              + 'display:flex;align-items:center;justify-content:center;gap:8px',
            onclick: function () { removeRecord(edit); }
          }, [binIcon(), 'この記録を削除']),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: '削除は確認ダイアログを出してから実行します。' })
        ])
      ])
    ]);
  }

  /* The history list carries no exercises, so the day is read again to get
   * them - and that read is what the editor is filled from, not the list. */
  /* Design (2026-09-12), after Strong and Hevy: a one-off record can be
   * turned into a menu, but nobody is asked. The offer sits on the record's
   * own screen, and after being shown three times for the same set of
   * exercises without being taken, it stops appearing for that set. Kept in
   * localStorage; not part of the records, not exported. */
  var OFFER_KEY = 'ouchitore_menu_offers';
  function offerId(edit) {
    return edit.items.map(function (i) { return i.ex_id; }).sort().join(',');
  }
  function offerSeen(edit) {
    if (!edit.items.length) return;
    var all = remembered(OFFER_KEY);
    var one = all[offerId(edit)] || { shown: 0, taken: false };
    one.shown += 1;
    all[offerId(edit)] = one;
    remember(OFFER_KEY, all);
  }
  function offerOpen(edit) {
    if (edit.kind !== 'manual' || !edit.items.length) return false;
    var one = remembered(OFFER_KEY)[offerId(edit)] || { shown: 0, taken: false };
    return !one.taken && one.shown <= 3;
  }
  function offerTaken(edit) {
    var all = remembered(OFFER_KEY);
    all[offerId(edit)] = { shown: 99, taken: true };
    remember(OFFER_KEY, all);
  }
  function menuFromRecord(edit) {
    offerTaken(edit);
    problem = null;
    state.menuEdit = {
      menu_id: null, revision: null, video_url: '', note: '', tag: '', fromRecord: true,
      name: edit.items.map(function (i) { return i.name; }).join('・').slice(0, 100),
      items: edit.items.map(function (i) {
        return { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps, seconds: i.seconds, unit: i.unit };
      })
    };
    state.screen = { name: 'menuEdit' };
    draw();
  }

  async function openEdit(sessionId, date) {
    problem = null;
    try {
      var day = await api.get('/api/today?date=' + date);
      var session = day.sessions.filter(function (s) { return s.session_id === sessionId; })[0];
      if (!session) { problem = 'この記録は見つかりませんでした。'; draw(); return; }
      state.edit = {
        session_id: session.session_id,
        kind: session.session_kind,
        date: date,
        time: session.performed_time || '',
        note: session.note || '',
        items: session.items.map(function (i) {
          return { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps,
            seconds: i.seconds, unit: i.unit };
        })
      };
      state.screen = { name: 'edit' };
      if (session.session_kind === 'manual') offerSeen(state.edit);
    } catch (error) {
      problem = error && error.note ? error.note : 'この記録を開けませんでした。';
    }
    draw();
  }

  async function saveEdit(edit) {
    problem = null;
    try {
      await api.post('/api/session/update', {
        session_id: edit.session_id, date: edit.date,
        performed_time: edit.time || null, note: edit.note || null,
        items: edit.items.map(function (i) {
          return i.unit === 'sec'
            ? { ex_id: i.ex_id, name: i.name, sets: i.sets, seconds: i.seconds, unit: 'sec' }
            : { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps, unit: 'reps' };
        })
      });
      state.screen = { name: 'history' };
    } catch (error) {
      problem = error && error.note ? error.note : '保存できませんでした。';
    }
    draw();
  }

  async function removeRecord(edit) {
    if (!window.confirm('この記録を削除します。元に戻せません。')) return;
    problem = null;
    try {
      await api.post('/api/session/delete', { session_id: edit.session_id });
      state.screen = { name: 'history' };
    } catch (error) {
      problem = error && error.note ? error.note : '削除できませんでした。';
    }
    draw();
  }

  /* ---- 0: the first run ----
   * Three questions, each of which may be waved past, and then the app. It is
   * built from the pieces the design already settled - the sheet header from
   * the add-to-home screen, the field from the menu editor, the chooser from
   * the settings screen - so the first thing a new person sees is the app they
   * are about to use, not a separate welcome world.
   *
   * Everything asked here can be changed later in 設定; nothing here is a
   * gate. Waving past all of it is a perfectly ordinary way to start.
   */
  var SETUP_STEPS = 3;

  function setupScreen(draft, onChoose, onName, onNext, onSkip) {
    var head = function (title, note) {
      return h('div', { style: 'padding:22px 20px 0' }, [
        h('div', { style: 'font-size:12px;color:var(--faint);padding-bottom:10px',
          text: (draft.step + 1) + ' / ' + SETUP_STEPS }),
        h('div', { style: 'font-size:20px;font-weight:800;color:var(--ink);line-height:1.35', text: title }),
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.75;padding-top:10px', text: note })
      ]);
    };

    var body;
    if (draft.step === 0) {
      var line = function (text) {
        return h('div', { style: 'display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);'
          + 'border-radius:12px;padding:12px;background:var(--card)' }, [
          h('div', { style: 'width:6px;height:6px;border-radius:3px;background:var(--ink);margin-top:7px;flex:none' }),
          h('div', { style: 'flex:1;font-size:13px;color:var(--body);line-height:1.6', text: text })
        ]);
      };
      body = [
        head('トレ録へようこそ', '家でやったトレーニングを、その場で残しておくための記録帳です。'),
        h('div', { style: 'padding:16px 20px 0;display:flex;flex-direction:column;gap:8px' }, [
          /* The owner's own words. The first two used to state a fact and stop
           * there - "記録はこの端末の中だけにあります", "点数をつけません" -
           * without saying what follows from it, which is the part someone
           * opening this for the first time actually wants. */
          line('記録は、あなたのスマホの中に保存されます。外に保存されたり、外に出たりすることはありません。'),
          line('続けることを強いたり、評価をつけたりはしません。思い立ったときに記録してください。'
            + 'ひとつひとつ記録を重ねることが大事だと考えています。'),
          line('はじめに三つだけうかがいます。どれも飛ばせますし、あとから設定で変えられます。')
        ])
      ];
    } else if (draft.step === 1) {
      var counter = h('div', { style: 'font-size:11px;color:var(--faint)',
        text: Array.from(draft.nickname).length + ' / 12' });
      var sample = h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.65' }, [
        'アプリを開いたときの挨拶に、一度だけ使います。',
        h('span', { style: 'font-family:var(--mono)',
          text: 'おはようございます、' + (draft.nickname || 'たなか') + 'さん。' })
      ]);
      body = [
        head('何とお呼びすればいいでしょうか', ''),
        h('div', { style: 'padding:8px 20px 0' }, [
          h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
            h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between' }, [
              h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: 'ニックネーム（任意）' }),
              counter
            ]),
            h('input', { type: 'text', value: draft.nickname, maxlength: '12',
              style: FIELD + ';border:1.5px solid var(--ink);min-height:50px;font-size:15px',
              placeholder: 'たなか', autocomplete: 'nickname',
              oninput: function () {
                onName(this.value);
                counter.textContent = Array.from(this.value).length + ' / 12';
                sample.lastChild.textContent = 'おはようございます、'
                  + (this.value || 'たなか') + 'さん。';
              } }),
            sample,
            h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
              text: '書かなくてもかまいません。あとで設定から変えられます。' })
          ])
        ])
      ];
    } else {
      body = [
        head('相棒をひとつ', COMPANION_NOTE),
        h('div', { style: 'padding:16px 20px 0;display:flex;flex-direction:column;gap:12px' },
          companionChoices(draft.companion, onChoose).slice(1))
      ];
    }

    var last = draft.step === SETUP_STEPS - 1;
    var foot = [];
    if (!last) {
      foot.push(h('button', { class: 'primary', style: 'font-family:inherit;'
        + 'font-size:15px;font-weight:800;border-radius:16px;min-height:50px;'
        + 'box-shadow:var(--shadow-action);cursor:pointer', onclick: onNext }, ['つづける']));
    }
    foot.push(h('button', { style: 'border:1px solid var(--line);background:var(--card);color:var(--sub);'
      + 'font-family:inherit;font-size:14px;font-weight:700;border-radius:16px;min-height:48px;cursor:pointer',
      onclick: onSkip }, [last ? '相棒は選ばない' : 'あとで']));

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;background:var(--card)' },
      body.concat([
        h('div', { style: 'flex:1;min-height:18px' }),
        h('div', { style: 'padding:12px 20px 26px;display:flex;flex-direction:column;gap:8px;background:var(--card)' }, foot)
      ]));
  }

  /* ---- 1f: choosing a companion ---- */

  var COMPANIONS = [
    ['capybara', 'カピバラ'], ['penguin', 'ペンギン'], ['sloth', 'ナマケモノ'],
    ['tortoise', 'リクガメ'], ['owl', 'フクロウ'], ['seal', 'アザラシ'],
    ['goat', 'ヤギ'], ['tanuki', 'タヌキ'], ['otter', 'カワウソ'], ['alpaca', 'アルパカ']
  ];

  var COMPANION_NOTE = 'ホームの「きょうの合計」のところに小さく出ます。トレーニングをそっと見守ります。'
    + '励ましたり煽ったりはしません。既定は「選ばない」です。';

  /* The pictures and the "選ばない" row, without a screen around them: the
   * settings screen and the first run both put these in front of you. */
  function companionChoices(chosen, onChoose) {
    return [
        h('button', {
          style: 'display:flex;align-items:center;gap:12px;border-radius:14px;padding:12px;'
            + 'background:#fafbfd;width:100%;font-family:inherit;text-align:left;cursor:pointer;'
            + (chosen ? 'border:1px solid var(--line);' : 'border:1.5px solid var(--ink);'),
          'aria-label': chosen ? '相棒を選ばない' : '相棒を選んでいません',
          onclick: onChoose.bind(null, null)
        }, [
          h('div', { style: 'width:44px;height:44px;border:1.5px dashed var(--faint);border-radius:11px;flex:none' }),
          h('div', { style: 'flex:1' }, [
            h('div', { style: 'font-size:14px;font-weight:800;color:var(--ink)', text: '選ばない' }),
            h('div', { style: 'font-size:10px;color:var(--faint);margin-top:2px', text: '既定' })
          ]),
          h('div', { style: 'width:22px;height:22px;border-radius:11px;flex:none;display:flex;'
            + 'align-items:center;justify-content:center;font-size:12px;'
            + (chosen ? 'border:1.5px solid var(--faint);' : 'background:var(--ink);color:var(--card);') },
            [chosen ? '' : '✓'])
        ]),
        h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' },
          COMPANIONS.map(function (c) {
            var on = chosen === c[0];
            return h('button', {
              style: 'border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;'
                + 'align-items:center;background:var(--card);font-family:inherit;cursor:pointer;'
                + (on ? 'border:1.5px solid var(--ink);' : 'border:1px solid var(--line);'),
              'aria-label': c[1] + (on ? ' を選んでいます' : ' を選ぶ'),
              onclick: onChoose.bind(null, c[0])
            }, [
              h('div', {
                style: 'width:100%;aspect-ratio:1;border-radius:10px;background:#fafbfd;'
                  + 'border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;overflow:hidden'
              }, [
                h('img', { src: 'companions/frames/' + c[0] + '-a.png', alt: c[1],
                  style: 'width:100%;height:100%;object-fit:contain',
                  onerror: function () {
                    this.style.display = 'none';
                    if (this.nextSibling) this.nextSibling.style.display = 'block';
                  } }),
                h('div', { style: 'display:none;font-size:10px;color:var(--faint)', text: '絵なし' })
              ]),
            ]);
          }))
    ];
  }

  function companionScreen(chosen, onBack, onChoose) {
    var name = (COMPANIONS.filter(function (c) { return c[0] === chosen; })[0] || [null, null])[1];
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '相棒' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:14px 16px;border-bottom:1px solid var(--line2)' }, [
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.6', text: COMPANION_NOTE })
      ]),
      h('div', { style: 'flex:1;padding:14px 16px 18px;display:flex;flex-direction:column;gap:12px' },
        companionChoices(chosen, onChoose)),
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;background:var(--card);'
        + 'display:flex;flex-direction:column;gap:8px' }, [
        h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
          h('div', { style: 'width:22px;height:22px;border-radius:6px;flex:none;display:flex;'
            + 'align-items:center;justify-content:center;font-size:12px;'
            + (name ? 'background:var(--ink);color:var(--card);' : 'border:1.5px solid var(--faint);') },
            [name ? '✓' : '']),
          h('div', { style: 'font-size:13px;color:var(--body);flex:1',
            text: name ? '選んでいます' : '選んでいません' }),
          name ? h('button', { style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
            + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:38px;'
            + 'padding:0 12px;cursor:pointer', onclick: onChoose.bind(null, null) }, ['やめる']) : null
        ]),
        h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.5',
          text: '選択中は太い枠と ✓ で示します。' })
      ])
    ]);
  }

  /* ---- 2e: what to be called ----
   * Built from the parts the design already settled - the same header, the
   * same field, the same footer button as the menu editor - so nothing new is
   * invented here. */
  function nicknameScreen(current, onBack, onSave) {
    var draft = { value: current || '' };
    var counter = h('div', { style: 'font-size:11px;color:var(--faint)',
      text: Array.from(draft.value).length + ' / 12' });
    var field = h('input', {
      type: 'text', value: draft.value, maxlength: '12', style: FIELD,
      placeholder: '呼ばれたい名前', autocomplete: 'nickname',
      oninput: function () {
        draft.value = this.value;
        counter.textContent = Array.from(draft.value).length + ' / 12';
      }
    });
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '名前' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:14px 16px;border-bottom:1px solid var(--line2)' }, [
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.6',
          text: 'アプリを開いたときのあいさつで一度だけ呼びます。そのあとは呼びません。'
            + 'この端末の中だけに残ります。空にすれば呼びません。' })
      ]),
      h('div', { style: 'padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px' }, [
        h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
          h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between' }, [
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: 'ニックネーム（任意）' }),
            counter
          ]),
          field
        ])
      ]),
      h('div', { style: 'flex:1' }),
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;background:var(--card);'
        + 'display:flex;gap:10px' }, [
        h('button', { style: 'flex:1;border:1px solid var(--line);background:var(--card);color:var(--body);'
          + 'font-family:inherit;font-size:14px;font-weight:700;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(''); } }, ['呼ばない']),
        h('button', { style: 'flex:2;border:0;background:var(--ink);color:var(--card);font-family:inherit;'
          + 'font-size:14px;font-weight:800;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(draft.value); } }, ['この名前にする'])
      ])
    ]);
  }

  /* The owner's own Gemini key (measured 2026-09-11: the REST endpoint
   * answers a browser directly, CORS allowed, and reads a YouTube URL as
   * the video). Kept in localStorage on this phone only - never in the
   * export, never in the records. */
  /* The owner said they added the app to the home screen; believed, and
   * not asked again. display-mode alone cannot tell, because an "add to
   * home screen" that Chrome treated as a shortcut still opens as a tab. */
  var A2HS_KEY = 'ouchitore_a2hs';
  var AI_KEY = 'ouchitore_gemini_key';
  function aiKey() {
    var held = remembered(AI_KEY);
    return typeof held.key === 'string' ? held.key.trim() : '';
  }

  function aiKeyScreen(onBack, onSave) {
    var draft = { value: aiKey() };
    var field = h('input', {
      type: 'password', value: draft.value, style: FIELD + '',
      placeholder: 'AIza… で始まる文字列', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      oninput: function () { draft.value = this.value; }
    });
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '動画を読むキー' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:14px 16px;border-bottom:1px solid var(--line2);display:flex;flex-direction:column;gap:10px' }, [
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.7',
          text: 'Google の Gemini に動画を読ませて、種目・回数・秒数を取り出します。そのために、あなた自身の Gemini の API キーが要ります。' }),
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.7',
          text: 'キーは Google AI Studio で無料で作れます（無料枠あり・Google アカウントが要ります）。作ったキーをここに貼ってください。' }),
        h('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener noreferrer',
          style: 'font-size:14px;font-weight:700;color:var(--color-action);text-decoration:underline;min-height:44px;display:inline-flex;align-items:center' },
          ['Google AI Studio でキーを作る']),
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.7',
          text: 'キーはこの端末の中だけに残り、書き出しファイルには入りません。動画を読ませるときに Google へ送るのは、動画の URL と読み取りの指示だけです。あなたの記録は送りません。' })
      ]),
      h('div', { style: 'padding:16px 18px 22px;display:flex;flex-direction:column;gap:6px' }, [
        h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: 'API キー' }),
        field
      ]),
      h('div', { style: 'flex:1' }),
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;background:var(--card);display:flex;gap:10px' }, [
        h('button', { style: 'flex:1;border:1px solid var(--line);background:var(--card);color:var(--body);'
          + 'font-family:inherit;font-size:14px;font-weight:700;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(''); } }, ['キーを消す']),
        h('button', { style: 'flex:2;border:0;background:var(--ink);color:var(--card);font-family:inherit;'
          + 'font-size:14px;font-weight:800;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(draft.value); } }, ['このキーにする'])
      ])
    ]);
  }

  /* ---- 1g: keeping the records ---- */

  function exportScreen(settings, sessionCount, onBack, onA2hs) {
    var fileRow = function (label, value) {
      return h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
        h('div', { style: 'font-size:12px;color:var(--sub)', text: label }),
        h('div', { style: 'font-size:12px;font-weight:700;color:var(--ink)', text: value })
      ]);
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '記録を残す' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:16px 16px 22px;display:flex;flex-direction:column;gap:18px' }, [
        h('div', {
          style: 'border:1.5px solid var(--warnInk);border-radius:14px;padding:12px;background:var(--warnSoft);'
            + 'display:flex;flex-direction:column;gap:10px'
        }, [
          h('div', { style: 'font-size:13px;font-weight:800;color:var(--warnInk)', text: 'ホーム画面に追加' }),
          h('div', { style: 'font-size:12px;color:#7a5b12;line-height:1.6',
            text: whichPhone() === 'ios'
              ? 'Safari は7日間使わないと記録を消します。ホーム画面に追加したものは消えません。'
              : 'ホーム画面に追加すると、次からすぐ開けます。控えはこの下の書き出しで残せます。' }),
          h('button', { style: 'border:1px solid var(--warnInk);background:var(--card);color:var(--warnInk);'
            + 'font-family:inherit;font-size:13px;font-weight:800;border-radius:12px;min-height:44px;cursor:pointer',
            onclick: onA2hs }, ['手順を見る'])
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '書き出す' }),
          h('div', { style: 'border:1px solid var(--line);border-radius:16px;padding:14px;'
            + 'display:flex;flex-direction:column;gap:10px' }, [
            h('div', { style: 'font-size:12px;color:var(--body);line-height:1.6',
              text: 'トレーニングメニューと記録をまとめて1つの JSON ファイルにします。機種変更のときは、このファイルを新しい端末で読み込みます。' }),
            h('div', { style: 'border-top:1px solid var(--line2);padding-top:10px' },
              [fileRow('前回の書き出し', settings.last_export || 'まだありません')]),
            fileRow('記録の件数', sessionCount + '件'),
            h('button', { style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;'
              + 'font-size:15px;font-weight:800;border-radius:14px;min-height:48px;'
              + 'box-shadow:var(--shadow-action);cursor:pointer', onclick: exportFile }, ['ファイルに書き出す'])
          ])
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '読み込む' }),
          h('div', { style: 'border:1px solid var(--line);border-radius:16px;padding:14px;'
            + 'display:flex;flex-direction:column;gap:10px' }, [
            h('div', { style: 'display:flex;align-items:flex-start;gap:10px;border:1.5px solid var(--ink);'
              + 'border-radius:12px;padding:11px 12px;background:#fafbfd' }, [
              h('div', { style: 'width:18px;height:18px;border:1.5px solid var(--ink);border-radius:5px;'
                + 'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;'
                + 'color:var(--ink);flex:none', text: '!' }),
              h('div', { style: 'font-size:12px;color:var(--ink);line-height:1.55;font-weight:700',
                text: 'いまの記録は消えます。取り違えると戻せません。'
                  + '読み込む前に、いまの分を書き出しておいてください。' })
            ]),
            h('label', { style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
              + 'font-family:inherit;font-size:14px;font-weight:800;border-radius:14px;min-height:48px;'
              + 'cursor:pointer;display:flex;align-items:center;justify-content:center' }, [
              'ファイルを選ぶ',
              h('input', { type: 'file', accept: 'application/json,.json',
                style: 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none',
                onchange: function () { importFile(this.files && this.files[0]); } })
            ])
          ])
        ]),
        problem ? h('div', { style: 'font-size:12px;color:#7a5b12;line-height:1.6;'
          + 'background:var(--warnSoft);border:1px solid #f0e2bf;border-radius:12px;padding:11px 12px',
          text: problem }) : null
      ])
    ]);
  }

  /* "前回の書き出し" is the one line that tells the owner whether a copy of
   * the records exists off this phone, so it is only written when a file
   * really was.  Where the browser can tell us (showSaveFilePicker resolves
   * only after the file is written) we wait for that; where it cannot, the
   * plain download is used and the date is recorded on that, which is the
   * best the browser offers. */
  async function exportFile() {
    problem = null;
    try {
      var document_ = await api.exportDocument();
      var today = (await api.get('/api/today')).date;
      var name = 'ouchi-tore-' + today + '.json';
      var text = JSON.stringify(document_, null, 2);
      var written = false;

      if (window.showSaveFilePicker) {
        try {
          var handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [{ description: 'トレ録の記録', accept: { 'application/json': ['.json'] } }]
          });
          var stream = await handle.createWritable();
          await stream.write(text);
          await stream.close();
          written = true;
        } catch (cancelled) {
          if (cancelled && cancelled.name === 'AbortError') { draw(); return; }   // the owner backed out
          written = false;                                                        // fall through to the link
        }
      }

      if (!written) {
        var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      }
      await api.post('/api/settings/save', { last_export: today });
    } catch (error) {
      problem = error && error.note ? error.note : '書き出せませんでした。';
    }
    draw();
  }

  async function importFile(file) {
    if (!file) return;
    if (!window.confirm('いまの記録は消えます。取り違えると戻せません。'
      + '読み込む前に、いまの分を書き出しておいてください。続けますか。')) return;
    problem = null;
    try {
      var text = await file.text();
      await api.importDocument(JSON.parse(text));
      /* The line above the card was chosen for a phone that had different
       * records in it. Whatever it says about today, it was said about
       * somebody else's day. */
      try { localStorage.removeItem(LINE_KEY); localStorage.removeItem(SAID_KEY); }
      catch (e) { /* private window */ }
      /* A document written before the first-run questions existed carries no
       * mark; the records in it say plainly that this is not a first run. */
      var after = await api.get('/api/settings');
      if (!after.settings.setup_done) {
        await api.post('/api/settings/save', { setup_done: ymd(new Date()) });
      }
      state.screen = { name: 'home' };
    } catch (error) {
      problem = error && error.note ? error.note : 'このファイルは読み込めませんでした。';
    }
    draw();
  }

  /* ---- 2d: settings ---- */

  /* "このアプリについて": the notes and the disclaimer, the same three
   * sentences as the README. Plain text, same frame as the other settings
   * pages (2026-09-13). */
  function aboutScreen(onBack) {
    var para = function (text) {
      return h('div', { style: 'font-size:13px;color:var(--body);line-height:1.7', text: text });
    };
    var heading = function (text) {
      return h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: text });
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: 'このアプリについて' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:16px 18px 22px;display:flex;flex-direction:column;gap:14px' }, [
        heading('注意'),
        para('トレ録は、やったトレーニングを残しておくための記録帳です。運動のやり方や量を勧めるものではありません。体調に合わせて、痛みや不調があれば無理をしないでください。'),
        heading('記録について'),
        para('記録は、あなたのスマホの中に保存されます。外に保存されたり、外に出たりすることはありません。ただし、ブラウザの保存領域は端末やブラウザの都合で消えることがあり、消えた記録はもとに戻せません。控えは「設定 → 記録を残す」の書き出しでファイルにしておいてください。'),
        heading('免責'),
        para('このアプリは、無料で、現状のまま提供しています。動作や記録の保持は保証できません。アプリの利用や利用できなかったことによって生じた損害について、作者は責任を負いません。'),
        heading('通信の範囲'),
        para('アプリが外と通信するのは三つだけです。動画のサムネイルを表示するとき（YouTube）、URL から題名を取るとき（YouTube）、そして自分でキーを入れて動画を AI に読ませるとき（Google）。あなたの記録は送りません。'),
        heading('ライセンス'),
        para('MIT ライセンスで公開しています。中身は GitHub の memory2meaning-lgtm/toreroku にあります。'),
        h('a', { href: 'https://github.com/memory2meaning-lgtm/toreroku', target: '_blank', rel: 'noopener noreferrer',
          style: 'font-size:14px;font-weight:700;color:var(--color-action);text-decoration:underline;min-height:44px;display:inline-flex;align-items:center' },
          ['GitHub で中身を見る'])
      ]),
      h('div', { style: 'flex:1' }),
      navBar('settings')
    ]);
  }

  /* "見た目": three colour sets, one chosen. Radio-style rows with a visible
   * check and a border, never hue alone; 44px targets; applies at once. */
  function themeScreen(onBack) {
    var chosen = currentTheme();
    var list = h('div', { style: 'display:flex;flex-direction:column;gap:10px', role: 'radiogroup',
      'aria-label': '見た目' });
    var swatch = function (colour) {
      return h('span', { style: 'width:16px;height:26px;border-radius:4px;border:1px solid var(--line-strong);'
        + 'background:' + colour });
    };
    var paint = function () {
      list.replaceChildren();
      THEMES.forEach(function (one) {
        var on = one[0] === chosen;
        /* Selected shows three ways at once - the frame, the filled circle
         * with its check, and the "選択中" tag - none of them a hue. */
        list.appendChild(h('button', {
          style: 'display:flex;align-items:center;gap:14px;min-height:72px;padding:14px 16px;width:100%;'
            + 'border-radius:14px;background:var(--card);font-family:inherit;text-align:left;cursor:pointer;'
            + 'color:var(--ink);' + (on ? 'border:2px solid var(--ink);' : 'border:1px solid var(--line-strong);'),
          role: 'radio', 'aria-checked': on ? 'true' : 'false',
          onclick: function () { chosen = one[0]; applyTheme(chosen); paint(); }
        }, [
          h('span', { style: 'flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;'
            + 'justify-content:center;' + (on ? 'background:var(--color-action);border:0' : 'border:2px solid var(--sub)') },
            on ? [svg('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--on-action)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.6 9.6 17 19 7.4"/></svg>')] : []),
          h('span', { style: 'flex:none;display:flex;gap:3px' }, one[3].map(swatch)),
          h('span', { style: 'flex:1;min-width:0' }, [
            h('span', { style: 'display:block;font-size:16px;font-weight:' + (on ? 800 : 700) + ';color:var(--ink)', text: one[1] }),
            h('span', { style: 'display:block;font-size:12px;font-weight:400;color:var(--sub);margin-top:3px;line-height:1.5', text: one[2] })
          ]),
          on ? h('span', { style: 'flex:none;font-size:11px;font-weight:800;color:var(--ink);border:1px solid var(--ink);'
            + 'border-radius:5px;padding:5px 6px', text: '選択中' }) : null
        ]));
      });
    };
    paint();
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '設定' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:16px;display:flex;flex-direction:column;gap:14px' }, [
        h('div', { style: 'font-size:20px;font-weight:800;color:var(--ink)', text: '見た目' }),
        h('div', { style: 'font-size:14px;font-weight:400;color:var(--body);line-height:1.7',
          text: 'アプリ全体の色が変わります。文字の大きさや並び方は変わりません。' }),
        list
      ]),
      h('div', { style: 'flex:1' }),
      navBar('settings')
    ]);
  }

  function settingsScreen(onBack, go) {
    var row = function (label, hint, target) {
      return h('button', {
        style: 'display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:14px;'
          + 'padding:14px;background:var(--card);width:100%;font-family:inherit;text-align:left;cursor:pointer',
        onclick: go.bind(null, target)
      }, [
        h('div', { style: 'flex:1;min-width:0' }, [
          h('div', { style: 'font-size:14px;font-weight:800;color:var(--ink)', text: label }),
          h('div', { style: 'font-size:11px;color:var(--sub);margin-top:3px;line-height:1.5', text: hint })
        ]),
        h('div', { style: 'font-size:16px;color:var(--faint);flex:none', text: '›' })
      ]);
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '設定' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:16px;display:flex;flex-direction:column;gap:10px' }, [
        row('名前', 'ホームのあいさつで一度だけ呼びます。空でも使えます。', 'nickname'),
        row('相棒', 'ホームに小さく出ます。既定は選ばない。', 'companion'),
        row('見た目', 'アプリ全体の色を3つから選びます。', 'theme'),
        row('記録を残す', '書き出し／読み込み。機種変更のときはここから。', 'export'),
        row('ホーム画面に追加', '記録が消えないための手順をもう一度見ます。', 'a2hs'),
        row('種目の一覧', '名前や標準のセット数を直す。使っていない種目を消す。', 'library'),
        row('動画を読むキー', 'Google の Gemini のキーを入れると、動画の URL だけで種目を取れます。', 'aikey'),
        row('このアプリについて', '注意と免責、通信の範囲、ライセンス。', 'about')
      ]),
      h('div', { style: 'flex:1' }),
      navBar('settings')
    ]);
  }

  /* ---- 2c: picking exercises by hand ---- */

  function manualScreen(pick, library, onCancel) {
    var chosenRows = pick.items.map(function (item, index) {
      return h('div', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;'
        + 'border-top:1px solid var(--line2)' }, [
        h('div', { style: 'flex:1;min-width:0;font-size:14px;font-weight:700;color:var(--ink)', text: item.name }),
        h('div', { style: 'display:flex;align-items:center;gap:6px;flex:none' }, [
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:var(--card);'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを減らす',
            onclick: function () { if (item.sets > 1) { item.sets -= 1; draw(); } } }, ['−']),
          h('div', { style: 'font-size:13px;font-weight:700;color:var(--ink);'
            + 'min-width:56px;text-align:center',
            text: amountLabel(item.unit, item.sets, item.reps, item.seconds) }),
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:var(--card);'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを増やす',
            onclick: function () { if (item.sets < 99) { item.sets += 1; draw(); } } }, ['＋'])
        ]),
        deleteButton(item.name + ' を外す', function () { pick.items.splice(index, 1); draw(); })
      ]);
    });

    var often = library.filter(function (e) {
      return !pick.items.some(function (i) { return i.name === e.name; });
    }).slice(0, pick.showAll ? library.length : 4);

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      /* Stays at the top while the form scrolls: the owner lost 保存 after
       * adding exercises far down the page (2026-09-12). */
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line);'
        + 'position:sticky;top:0;background:var(--card);z-index:3' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)',
          text: 'トレーニングメニュー以外をやった' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:11px 18px;border-bottom:1px solid var(--line2);background:#fafbfd' }, [
        h('div', { style: 'font-size:12px;color:var(--body)', text: longLabel(pick.date) })
      ]),
      h('div', { style: 'flex:1;padding:14px 16px 18px;display:flex;flex-direction:column;gap:18px' }, [
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em;'
            + 'padding-bottom:6px', text: '選んだ種目' })
        ].concat(chosenRows.length ? chosenRows : [
          h('div', { style: 'padding:10px 0;font-size:12px;color:var(--sub);border-top:1px solid var(--line2)',
            text: 'まだ選んでいません。' })
        ])),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '種目を足す' }),
          /* Deliberately not a <form>: a submit reloads the page and loses the
             half-built record, which is exactly what happened the first time. */
          h('div', { style: 'display:flex;gap:8px' }, [
            h('input', { type: 'text', placeholder: '種目名を書く', value: pick.typed,
              style: 'flex:1;min-width:0;border:1px solid var(--line);border-radius:12px;padding:11px 12px;'
                + 'min-height:46px;font-family:inherit;font-size:14px;color:var(--ink);background:var(--card)',
              oninput: function () { pick.typed = this.value; },
              onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addTyped(pick); } } }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);background:var(--card);color:var(--body);font-family:inherit;'
                + 'font-size:13px;font-weight:700;border-radius:12px;min-height:46px;padding:0 14px;cursor:pointer',
              onclick: function () { addTyped(pick); }
            }, ['足す'])
          ]),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: '一覧に無い名前を書くと、そのまま一覧に加わります。' }),
          h('div', { style: 'display:flex;flex-direction:column;gap:2px;margin-top:4px' }, [
            h('div', { style: 'font-size:11px;font-weight:800;color:var(--sub);padding-bottom:4px',
              text: 'よく記録している種目' })
          ].concat(often.map(function (e) {
            return h('div', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;'
              + 'border-top:1px solid var(--line2)' }, [
              h('div', { style: 'flex:1;min-width:0' }, [
                h('div', { style: 'font-size:14px;font-weight:700;color:var(--ink)', text: e.name }),
                h('div', { style: 'font-size:10px;color:var(--faint);margin-top:2px',
                  text: '標準 ' + amountLabel(e.unit, e.sets, e.reps, e.seconds) + ' ・ 記録 ' + e.use_count + '件' })
              ]),
              h('button', { style: 'border:1px solid var(--line);background:var(--card);color:var(--body);'
                + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:36px;'
                + 'padding:0 12px;cursor:pointer;flex:none',
                onclick: function () {
                  pick.items.push({ ex_id: e.ex_id, name: e.name, sets: e.sets, reps: e.reps,
                    seconds: e.seconds, unit: e.unit });
                  draw();
                } }, ['足す'])
            ]);
          })).concat(library.length > 4 && !pick.showAll ? [
            h('button', { style: 'border:0;background:none;padding:10px 0 0;text-align:left;'
              + 'font-size:12px;font-weight:700;color:var(--color-action);text-decoration:underline;'
              + 'font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
              onclick: function () { pick.showAll = true; draw(); } }, ['一覧をすべて見る'])
          ] : []))
        ])
      ]),
      problem ? warnBar(problem, null, null) : null,
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;display:flex;'
        + 'flex-direction:column;gap:10px;background:var(--card)' }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
          h('div', { style: 'font-size:12px;color:var(--sub)', text: '実施時刻' }),
          h('label', { style: 'display:flex;align-items:center;gap:8px;border:1px solid var(--line);'
            + 'border-radius:10px;padding:8px 12px;min-height:40px;cursor:pointer' }, [
            h('input', { type: 'time', value: pick.time,
              style: 'font-size:14px;font-weight:700;color:var(--ink);'
                + 'border:0;background:none;padding:0',
              onchange: function () { pick.time = this.value; } })
          ])
        ]),
        h('button', {
          style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);'
            + 'cursor:pointer;opacity:' + (pick.items.length ? '1' : '.45'),
          'aria-disabled': pick.items.length === 0 ? 'true' : null,
          onclick: function () { if (pick.items.length === 0) return; saveManual(pick); }
        }, [pick.items.length ? '選んだ' + pick.items.length + '種目を記録' : '種目を選んでください'])
      ])
    ]);
  }

  function addTyped(pick) {
    var name = (pick.typed || '').trim();
    if (!name) return;
    var known = libraryNow.filter(function (e) { return e.name === name; })[0];
    pick.items.push(known
      ? { ex_id: known.ex_id, name: known.name, sets: known.sets, reps: known.reps,
          seconds: known.seconds, unit: known.unit }
      : { ex_id: null, name: name, sets: 1, reps: 10, seconds: null, unit: 'reps' });
    pick.typed = '';
    draw();
  }

  /* One by-hand record per day is the store's rule; so the second time
   * that day, the screen opens with the morning's exercises already in it
   * and the new ones join them - nothing is overwritten (Codex review
   * 2026-09-12: the first record used to vanish). */
  function openManual(date, existing) {
    problem = null;
    state.pick = {
      date: date,
      time: (existing && existing.performed_time) || (pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())),
      /* By name, not by id: an exercise removed from the library since the
       * morning still has its name on the record, and by name it comes
       * back rather than failing with 404 (Codex review, second pass). */
      items: existing ? existing.items.map(function (i) {
        return { name: i.name, sets: i.sets, reps: i.reps, seconds: i.seconds, unit: i.unit };
      }) : [],
      typed: '', showAll: false, joining: !!existing
    };
    state.screen = { name: 'manual' };
    draw();
  }

  async function saveManual(pick) {
    problem = null;
    try {
      await api.post('/api/log', {
        date: pick.date, performed_time: pick.time || null,
        items: pick.items.map(function (i) {
          return i.unit === 'sec'
            ? { ex_id: i.ex_id, name: i.name, sets: i.sets, seconds: i.seconds, unit: 'sec' }
            : { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps, unit: 'reps' };
        })
      });
      /* A record made by hand has no row on the record page to show it
       * landed; home does (今日の記録), so that is where this returns
       * (the owner, 2026-09-12). */
      state.screen = { name: 'home' };
    } catch (error) {
      problem = error && error.note ? error.note : '記録できませんでした。';
    }
    draw();
  }

  /* ---- 1c: the add-to-home sheet ---- */

  /* Which phone this is, because the steps are not the same on both and the
   * reason for taking them is not either. iPad reports itself as a Mac, so it
   * is recognised by having a touchscreen rather than by its name. */
  function whichPhone() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPod/.test(ua)) return 'ios';
    if (/iPad/.test(ua)) return 'ios';
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'other';
  }

  /* Chrome offers to install the app itself, and will hand us the offer to
   * make at a moment of our choosing. Caught here so the button can be a real
   * one rather than a set of directions. */
  var installOffer = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installOffer = event;
  });

  function a2hsScreen(onClose) {
    var phone = whichPhone();
    var step = function (n, text, mark) {
      return h('div', { style: 'display:flex;align-items:center;gap:12px;border:1px solid var(--line);'
        + 'border-radius:12px;padding:12px;background:var(--card)' }, [
        h('div', { style: 'width:22px;height:22px;border-radius:6px;background:var(--ink);color:var(--card);'
          + 'font-size:12px;font-weight:700;display:flex;align-items:center;'
          + 'justify-content:center;flex:none', text: String(n) }),
        h('div', { style: 'flex:1;font-size:13px;color:var(--body);line-height:1.5', text: text }),
        h('div', { style: 'width:30px;height:30px;border:1px solid var(--line);border-radius:8px;'
          + 'display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sub);'
          + 'flex:none', text: mark })
      ]);
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;background:var(--card)' }, [
      h('div', { style: 'padding:22px 20px 8px' }, [
        h('div', { style: 'width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 18px' }),
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.3',
          text: 'ホーム画面に追加してください' })
      ]),
      h('div', { style: 'padding:10px 20px 0' }, [
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.75',
          text: phone === 'ios'
            ? 'iPhone の Safari は、7日間使わないとブラウザに保存した記録を消します。ホーム画面に追加したものは消えません。記録はこの端末の中だけにあります。'
            : phone === 'android'
              ? 'ホーム画面に追加すると、アプリのように開けます。ブラウザの保存領域は端末の空きが足りないときに整理されることがありますが、追加したものは残ります。記録はこの端末の中だけにあります。'
              : 'ブラウザから入れておくと、アプリのように開けます。記録はこの端末の中だけにあります。' })
      ]),
      h('div', { style: 'padding:16px 20px;display:flex;flex-direction:column;gap:8px' },
        phone === 'ios'
          ? [
            step(1, '画面下の 共有 ボタンを押す', '↑'),
            step(2, 'ホーム画面に追加 を選ぶ', '＋'),
            step(3, '右上の 追加 を押す', '')
          ]
          : phone === 'android'
            ? [
              step(1, '右上の ⋮ を押す', '⋮'),
              step(2, 'アプリをインストール（またはホーム画面に追加）を選ぶ', '＋'),
              step(3, 'インストール を押す', ''),
              /* LINE や Instagram の中のブラウザ、Chrome 以外のブラウザでは
               * 同じ項目が別の場所にある。断定した手順を出したまま黙っている
               * より、場所が違いうると言っておくほうが親切。 */
              h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6;padding:2px 2px 0',
                text: 'ブラウザによっては、メニューの場所や呼び名が違います。'
                  + 'アプリの中で開いた画面では出ないことがあるので、その時はブラウザで開き直してください。' })
            ]
            : [
              step(1, 'アドレスバーの右にある インストール を押す', '＋'),
              step(2, 'ブラウザのメニューからでも入れられます', '⋮')
            ]),
      h('div', { style: 'padding:0 20px' }, [
        h('div', { style: 'display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line);'
          + 'border-radius:12px;padding:12px;background:#fafbfd' }, [
          h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.6',
            text: '機種変更や端末の故障に備えるときは、書き出しでファイルに残します。設定にあります。' })
        ])
      ]),
      h('div', { style: 'flex:1' }),
      h('div', { style: 'padding:12px 20px 26px;display:flex;flex-direction:column;gap:8px' }, [
        installOffer ? h('button', { style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;'
          + 'font-size:15px;font-weight:800;border-radius:16px;min-height:50px;'
          + 'box-shadow:var(--shadow-action);cursor:pointer',
          onclick: async function () {
            var offer = installOffer;
            var answer = null;
            try {
              offer.prompt();
              answer = await offer.userChoice;
            } catch (e) { /* the browser withdrew the offer */ }
            /* Cancelling is not accepting. The browser resolves either way, so
             * the outcome has to be read: turned down, the screen stays where
             * it is and the offer can be made again. */
            if (answer && answer.outcome === 'accepted') {
              installOffer = null;
              onClose();
            } else {
              draw();
            }
          } }, ['このまま追加する']) : null,
        h('button', { style: installOffer
          ? 'border:1px solid var(--line);background:var(--card);color:var(--body);font-family:inherit;font-size:14px;'
            + 'font-weight:700;border-radius:16px;min-height:48px;cursor:pointer'
          : 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);cursor:pointer',
          onclick: function () { remember(A2HS_KEY, { added: true, on: new Date().toISOString() }); onClose(); } }, ['追加しました']),
        h('button', { style: 'border:0;background:none;color:var(--sub);font-family:inherit;font-size:13px;'
          + 'font-weight:700;min-height:44px;cursor:pointer', onclick: onClose },
          ['あとで（設定からいつでも見られます）'])
      ])
    ]);
  }

  /* ---- 2a: making and changing a menu ---- */

  function labelled(label, optional, counter, child) {
    return h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
      h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between' }, [
        h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em' }, [
          label,
          h('span', { style: 'font-weight:700;color:var(--faint);margin-left:4px', text: optional })
        ]),
        counter ? h('div', { style: 'font-size:11px;color:var(--faint)', text: counter }) : null
      ]),
      child
    ]);
  }

  var FIELD = 'border:1px solid var(--line);border-radius:12px;padding:11px 12px;min-height:46px;'
    + 'background:var(--card);font-family:inherit;font-size:14px;color:var(--ink);width:100%';

  /* What sits under the name field. Three ways this goes, and Design drew all
   * of them: the title is on its way, it could not be had, or it arrived and
   * is offered back for shortening or clearing. Nothing is ever guessed into
   * the field - an empty box the owner can type into beats a wrong name. */
  function titleState(edit) {
    if (edit.looking) {
      return h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:-10px;'
        + 'font-size:14px;color:var(--body)' }, [
        h('div', { style: 'width:14px;height:14px;border:2px solid var(--line);'
          + 'border-top-color:var(--sub);border-radius:8px;flex:none' }),
        h('div', { text: '動画の題名を取りに行っています。' })
      ]);
    }
    if (edit.lookFailed && !edit.name.trim()) {
      return h('div', { style: 'font-size:14px;color:var(--body);line-height:1.6;margin-top:-10px',
        text: '動画の題名は取れませんでした。名前はご自分で書いてください。' });
    }
    if (!edit.fromVideo || !edit.name.trim()) return null;

    /* Design (2026-09-12) took the dashed tag and its footnote away: one plain
     * sentence says what happened, and the "shorten" button carries the
     * shortened title itself, so nobody has to be told what it would cut. */
    var shortened = shortenTitle(edit.name);
    var OUTLINE = 'border:1px solid var(--line);border-radius:12px;background:var(--card);min-height:44px;'
      + 'padding:6px 14px;font-family:inherit;cursor:pointer;color:var(--ink);text-align:left;'
      + 'display:flex;flex-direction:column;justify-content:center;gap:2px;max-width:100%';
    return h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:-8px' }, [
      h('div', { style: 'font-size:14px;color:var(--body);line-height:1.6',
        text: '動画の題名を、そのまま入れました。長いときは短くできます。書き直しても構いません。' }),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:stretch' }, [
        shortened !== edit.name ? h('button', { style: OUTLINE + ';min-width:0;flex:1 1 180px', onclick: function () {
          edit.name = shortened; edit.fromVideo = false; draw();
        } }, [
          h('span', { style: 'font-size:14px;font-weight:700', text: '短くする' }),
          h('span', { style: 'font-size:12px;color:var(--sub);white-space:nowrap;overflow:hidden;'
            + 'text-overflow:ellipsis;display:block', text: shortened })
        ]) : null,
        h('button', { style: OUTLINE + ';flex:0 0 auto', onclick: function () {
          edit.name = ''; edit.fromVideo = false; draw();
        } }, [h('span', { style: 'font-size:14px;font-weight:700', text: '消して自分で書く' })])
      ])
    ]);
  }

  /* The part before the first separator is almost always the title proper;
   * what follows is the channel's own advertising. */
  function shortenTitle(name) {
    var cut = name.split(/[|｜【(（\[]/)[0].trim();
    return (cut || name).slice(0, 100);
  }

  /* Design replaced the two little arrows with one handle you hold and drag:
   * 44 to the finger, a 15px mark to the eye, pulled back 13px so the row
   * still starts where it did. The arrows were 26x20 - too small to hit, and
   * two taps for what is one movement.
   *
   * Dragging is not the only way to work it. The handle takes the keyboard
   * too: focus it and the up and down keys move the exercise, which is how
   * someone reading the screen aloud - or anyone who finds dragging hard -
   * still gets to reorder.
   */
  /* Which finger is moving a row, if any. Held outside the handles because
   * the point of it is to keep two of them from acting at once. */
  var dragging = null;

  function grabHandle(items, index, name, onMoved) {
    var handle = h('div', {
      style: 'width:44px;height:44px;flex:none;font-size:15px;color:var(--faint);'
        + 'display:flex;align-items:center;justify-content:center;margin-left:-13px;'
        + 'touch-action:none;cursor:grab;user-select:none',
      tabindex: '0', role: 'button', 'data-field': 'grab:' + name,
      'aria-label': name + ' を並べ替える（長押しして動かす。上下キーでも動かせます）'
    }, ['≡']);

    var move = function (to) {
      if (to < 0 || to >= items.length || to === index) return;
      items.splice(to, 0, items.splice(index, 1)[0]);
      if (onMoved) onMoved(); else draw();
    };

    handle.onkeydown = function (event) {
      if (event.key === 'ArrowUp') { event.preventDefault(); move(index - 1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); move(index + 1); }
    };

    handle.onpointerdown = function (event) {
      var row = handle.parentNode;
      if (!row) return;
      /* One at a time. Two fingers on two different handles both remember the
       * position their row had when the screen was drawn, so the second one to
       * be let go moves whatever has since slid into its old place - the wrong
       * exercise, in front of you. */
      if (dragging !== null) return;
      dragging = event.pointerId;
      var height = row.getBoundingClientRect().height || 56;
      var from = event.clientY;
      var slid = 0;
      handle.setPointerCapture(event.pointerId);
      row.style.position = 'relative';
      row.style.zIndex = '2';
      handle.style.cursor = 'grabbing';

      handle.onpointermove = function (moving) {
        if (moving.pointerId !== dragging) return;
        slid = moving.clientY - from;
        row.style.transform = 'translateY(' + slid + 'px)';
        row.style.opacity = '0.85';
      };
      var finish = function () {
        handle.onpointermove = null;
        handle.onpointerup = null;
        handle.onpointercancel = null;
        dragging = null;
        row.style.transform = '';
        row.style.opacity = '';
        row.style.zIndex = '';
        handle.style.cursor = 'grab';
        var to = index + Math.round(slid / height);
        move(Math.max(0, Math.min(items.length - 1, to)));
      };
      handle.onpointerup = finish;
      handle.onpointercancel = finish;
    };
    return handle;
  }

  function usedTags() {
    var seen = {};
    menusNow.forEach(function (m) { if (m.tag) seen[m.tag] = true; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
  }

  /* The tag bar (Design 2026-09-12): only once a tag exists. すべて first,
   * the tags, then 分類なし when something has none. The choice is kept so
   * the list opens where it was left. Selected = filled and bold. */
  var TAG_KEY = 'ouchitore_tag';
  function chosenTag() {
    var held = remembered(TAG_KEY);
    return typeof held.tag === 'string' ? held.tag : '';
  }
  function tagBar(menus) {
    var tags = usedTags();
    if (!tags.length) return null;
    var untagged = menus.some(function (m) { return !m.tag; });
    var current = chosenTag();
    if (current && current !== '__none__' && tags.indexOf(current) < 0) current = '';
    if (current === '__none__' && !untagged) current = '';
    var chips = [['', 'すべて']].concat(tags.map(function (tag) { return [tag, tag]; }));
    if (untagged) chips.push(['__none__', '分類なし']);
    return h('div', { style: 'display:flex;gap:8px;overflow-x:auto;padding:8px 18px;-webkit-overflow-scrolling:touch' },
      chips.map(function (chip) {
        var on = chip[0] === current;
        return h('button', {
          style: 'flex:none;min-height:36px;padding:0 14px;border-radius:18px;font-family:inherit;font-size:14px;'
            + 'cursor:pointer;' + (on ? 'background:var(--ink);border:1px solid var(--ink);color:var(--card);font-weight:700'
                                     : 'background:var(--card);border:1px solid var(--sub);color:var(--ink)'),
          'aria-pressed': on ? 'true' : 'false',
          onclick: function () { remember(TAG_KEY, { tag: chip[0] }); draw(); }
        }, [chip[1]]);
      }));
  }

  /* A search field only once the list is long (twenty or more): an empty
   * field on a short list is a question nobody asked. */
  function searchBox(menus) {
    if (menus.length < 20) return null;
    return h('div', { style: 'padding:8px 18px 0' }, [
      h('input', { type: 'search', value: state.menuSearch || '', placeholder: 'トレーニングメニューの名前',
        'aria-label': 'トレーニングメニューを名前で探す', 'data-field': 'menu-search',
        style: FIELD + ';min-height:44px;border-color:var(--sub);border-radius:8px',
        oninput: function () { state.menuSearch = this.value; draw(); } })
    ]);
  }

  function filteredMenus(menus) {
    var tag = usedTags().length ? chosenTag() : '';
    var text = (menus.length >= 20 ? (state.menuSearch || '') : '').trim().toLowerCase();
    return menus.filter(function (m) {
      if (tag === '__none__' && m.tag) return false;
      if (tag && tag !== '__none__' && m.tag !== tag) return false;
      if (text && m.name.toLowerCase().indexOf(text) < 0) return false;
      return true;
    });
  }

  function menuEditScreen(edit, library, onCancel) {
    var rows = edit.items.map(function (item, index) {
      return exerciseRow(grabHandle(edit.items, index, item.name), item, item.name + ' をトレーニングメニューから外す',
        function () { edit.items.splice(index, 1); draw(); }, '', true);
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      /* Stays at the top while the form scrolls: the owner lost 保存 after
       * adding exercises far down the page (2026-09-12). */
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line);'
        + 'position:sticky;top:0;background:var(--card);z-index:3' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)',
          text: edit.menu_id ? 'トレーニングメニューを編集' : 'トレーニングメニューを追加' }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--color-action);'
          + 'font-weight:800;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
          onclick: function () { saveMenu(edit); } }, ['保存'])
      ]),
      problem ? h('div', {
        style: 'display:flex;align-items:flex-start;gap:10px;padding:11px 14px;'
          + 'border-bottom:1px solid #f0e2bf;background:var(--warnSoft)'
      }, [
        h('div', { style: 'width:20px;height:20px;border:1.5px solid var(--warnInk);border-radius:5px;'
          + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;'
          + 'color:var(--warnInk);flex:none', text: '!', 'aria-hidden': 'true' }),
        h('div', { style: 'flex:1;font-size:12px;color:#7a5b12;line-height:1.5', text: problem }),
        edit.menu_id ? h('button', { style: 'border:1px solid var(--warnInk);background:var(--card);'
          + 'color:var(--warnInk);font-family:inherit;font-size:12px;font-weight:700;border-radius:9px;'
          + 'padding:8px 10px;min-height:36px;cursor:pointer',
          onclick: function () { openMenuEdit(edit.menu_id); } }, ['再読込']) : null
      ]) : null,
      h('div', { style: 'padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px' }, [
        /* Design put the URL first and numbered the three: paste a link and the
         * name below it fills itself in, so the screen should be read in that
         * order rather than opening on a required field you were about to be
         * given for free. */
        labelled('1. 動画の URL', '（任意）', null,
          h('input', { type: 'url', value: edit.video_url || '', placeholder: 'https://', style: FIELD,
            'data-field': 'menu-url',
            oninput: function () { edit.video_url = this.value; },
            onblur: function () { fetchTitle(edit); },
            onpaste: function () {
              var field = this;
              setTimeout(function () { edit.video_url = field.value; fetchTitle(edit); }, 0);
            } })),
        h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6;margin-top:-10px',
          text: '貼ると、下のトレーニングメニュー名に動画の題名が入ります。動画を使わないトレーニングメニューは、空のままで先へ進めます。' }),

        labelled('2. トレーニングメニュー名', '（必須）', edit.name.length + ' / 100',
          h('input', { type: 'text', value: edit.name, maxlength: '100', style: FIELD,
            'data-field': 'menu-name',
            oninput: function () {
              edit.name = this.value;
              /* Touched by hand, so it is the owner's name now, not the
               * video's - the dashed tag goes and does not come back. */
              if (edit.fromVideo) { edit.fromVideo = false; draw(); }
            } })),
        titleState(edit),

        labelled('3. メモ', '（任意）', null,
          h('textarea', { style: FIELD + ';min-height:66px;line-height:1.6;resize:vertical',
            oninput: function () { edit.note = this.value; } }, [edit.note || ''])),
        /* Design (2026-09-12, after Hevy's folders and Habitify's areas): one
         * tag per menu, typed or picked from the ones already in use. A
         * list that has grown long is split by these, never by how often
         * something was used. */
        labelled('4. 分類', '（任意）', null,
          h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
            h('input', { type: 'text', value: edit.tag || '', maxlength: '30', style: FIELD,
              placeholder: '例：下半身、ストレッチ',
              oninput: function () { edit.tag = this.value; } })
          ].concat(usedTags().filter(function (tag) { return tag !== (edit.tag || '').trim(); }).length
            ? [h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, usedTags().map(function (tag) {
                return h('button', {
                  style: 'min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--sub);'
                    + 'background:var(--card);color:var(--ink);font-family:inherit;font-size:14px;cursor:pointer',
                  onclick: function () { edit.tag = tag; draw(); }
                }, [tag]);
              }))]
            : []))),
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;padding-bottom:6px' }, [
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em' }, [
              '種目', h('span', { style: 'font-weight:700;color:var(--faint);margin-left:4px', text: '（任意）' })]),
            h('div', { style: 'font-size:11px;color:var(--faint)',
              text: edit.items.length + ' / 100' })
          ])
        ].concat(rows.length ? rows : [
          h('div', { style: 'padding:10px 0 16px;border-top:1px solid var(--line2);font-size:14px;color:var(--body);line-height:1.6',
            text: '動画の中でやった種目を、名前と回数で書いておけます。書かなくても、トレーニングメニューは作れます。' })
        ])),
        /* Typing a name has to come first: on a phone that has just installed
         * the app the library is empty, and with only "一覧から足す" there was no
         * way to put a single exercise into a menu at all. */
        /* The block does its job once. With exercises in the menu it folds
         * to one quiet line, so the owner is not offered again what they
         * just did (2026-09-12). */
        edit.items.length && !edit.pasteOpen && !edit.videoToolsOpen ? h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
          state.notice ? h('div', { style: 'font-size:13px;color:var(--body);line-height:1.6', text: state.notice }) : null,
          videoId(edit.video_url) ? h('button', { type: 'button',
            style: 'border:0;background:none;padding:0;font-size:12px;color:var(--sub);text-decoration:underline;'
              + 'font-family:inherit;cursor:pointer;min-height:44px;text-align:left',
            onclick: function () { edit.videoToolsOpen = true; draw(); } }, ['動画から種目を読み直す']) : null
        ]) : null,
        edit.items.length && !edit.pasteOpen && !edit.videoToolsOpen ? null : h('div', { style: 'display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);'
          + 'border-radius:12px;padding:12px' }, [
          h('div', { style: 'font-size:13px;font-weight:700;color:var(--ink)', text: '動画から種目を入れる' }),
          videoId(edit.video_url) && aiKey() ? h('button', { type: 'button',
            style: 'border:0;background:var(--ink);color:var(--card);font-family:inherit;font-size:14px;font-weight:700;'
              + 'border-radius:12px;min-height:44px;padding:0 14px;cursor:pointer;align-self:flex-start;'
              + (edit.aiBusy ? 'opacity:.6' : ''),
            'aria-disabled': edit.aiBusy ? 'true' : null,
            onclick: function () { extractFromVideo(edit); }
          }, [edit.aiBusy ? '動画を読んでいます（20秒ほど）' : '動画を AI に読ませて種目にする']) : null,
          videoId(edit.video_url) && !aiKey() ? h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
            h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.6',
              text: 'Google の Gemini のキーを入れると、URL だけで種目を取れます（キーはあなた自身のもの・無料枠あり）。' }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--sub);background:var(--card);color:var(--ink);font-family:inherit;font-size:14px;'
                + 'font-weight:700;border-radius:12px;min-height:44px;padding:0 14px;cursor:pointer;align-self:flex-start',
              onclick: function () { problem = null; state.aikeyFrom = 'menuEdit'; state.screen = { name: 'aikey' }; draw(); }
            }, ['動画を読むキーを入れる'])
          ]) : null,
          h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.6',
            text: 'もう一つの方法：YouTube の概要欄（「…もっと見る」の中）を全部コピーして貼ります。「3:20 スクワット」のような時間の行を種目にし、次の行までの時間を秒数にします。' }),
          edit.pasteOpen ? h('textarea', { style: FIELD + ';min-height:96px;line-height:1.6;resize:vertical',
            placeholder: '概要欄をここに貼る',
            oninput: function () { edit.pasted = this.value; } }, [edit.pasted || '']) : null,
          h('div', { style: 'display:flex;gap:8px' }, [
            h('button', { type: 'button',
              style: 'border:1px solid var(--sub);background:var(--card);color:var(--ink);font-family:inherit;'
                + 'font-size:14px;font-weight:700;border-radius:12px;min-height:44px;padding:0 14px;cursor:pointer',
              onclick: function () {
                if (edit.pasteOpen && (edit.pasted || '').trim()) { importFromDescription(edit); return; }
                edit.pasteOpen = !edit.pasteOpen; draw();
              } }, [edit.pasteOpen ? '貼った文から種目にする' : '概要欄を貼る'])
          ]),
          state.notice ? h('div', { style: 'font-size:13px;color:var(--body);line-height:1.6', text: state.notice }) : null
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
          h('div', { style: 'font-size:11px;font-weight:800;color:var(--sub)', text: '種目を足す' }),
          h('div', { style: 'display:flex;gap:8px' }, [
            h('input', { type: 'text', placeholder: '種目名を書く', value: edit.typed || '',
              style: 'flex:1;min-width:0;' + FIELD,
              oninput: function () { edit.typed = this.value; },
              onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addMenuExercise(edit); } } }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);background:var(--card);color:var(--body);font-family:inherit;'
                + 'font-size:13px;font-weight:700;border-radius:12px;min-height:46px;padding:0 14px;cursor:pointer',
              onclick: function () { addMenuExercise(edit); } }, ['足す'])
          ]),
          h('div', { style: 'display:flex;gap:8px;align-items:center' }, [
            h('div', { style: 'font-size:11px;color:var(--faint)', text: '単位' }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);border-radius:10px;min-height:38px;padding:0 12px;'
                + 'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;'
                + (edit.newUnit === 'sec' ? 'background:var(--card);color:var(--sub);' : 'background:var(--ink);color:var(--card);'),
              onclick: function () { edit.newUnit = 'reps'; draw(); } }, ['回数']),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);border-radius:10px;min-height:38px;padding:0 12px;'
                + 'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;'
                + (edit.newUnit === 'sec' ? 'background:var(--ink);color:var(--card);' : 'background:var(--card);color:var(--sub);'),
              onclick: function () { edit.newUnit = 'sec'; draw(); } }, ['秒数'])
          ]),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: '一覧に無い名前を書くと、そのまま一覧に加わります。セット数と回数はあとから直せます。' }),
          /* No chips of other menus' exercises here: the owner saw 種目１
           * and 種目２ from an unrelated menu offered under this one
           * (2026-09-12). Typing a name finds an existing one by itself. */
        ]),
        edit.menu_id ? h('div', { style: 'border-top:1px solid var(--line);padding-top:14px;'
          + 'display:flex;flex-direction:column;gap:8px' }, [
          h('button', {
            style: 'border:1px solid var(--line);background:var(--card);color:var(--body);font-family:inherit;'
              + 'font-size:14px;font-weight:700;border-radius:13px;min-height:46px;cursor:pointer;'
              + 'display:flex;align-items:center;justify-content:center;gap:8px',
            onclick: function () { removeMenu(edit); }
          }, [binIcon(), 'このトレーニングメニューを削除']),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: 'トレーニングメニューを消しても、これまでの記録は残ります。' })
        ]) : null
      ])
    ]);
  }

  /* Asks YouTube what the video is called, so the name does not have to be
   * typed out.  This is the app's only outward call besides the thumbnail, it
   * happens when the owner pastes a URL and not otherwise, it needs no key,
   * and nothing breaks when it fails - the field is simply left alone.
   * A name already typed is never overwritten.
   */
  async function fetchTitle(edit) {
    var id = videoId(edit.video_url);
    if (!id || edit.name.trim() || edit.looked === id) return;
    edit.looked = id;
    edit.looking = true;
    edit.lookFailed = false;
    draw();
    try {
      var response = await fetch('https://www.youtube.com/oembed?format=json&url='
        + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
      if (response.ok) {
        var info = await response.json();
        /* Only if this is still the video on the screen. An answer about a URL
         * that has since been replaced would put the wrong film's name on the
         * menu, which is worse than no name at all. */
        if (info && info.title && !edit.name.trim() && videoId(edit.video_url) === id) {
          edit.name = String(info.title).slice(0, 100);
          edit.fromVideo = true;
        }
      } else {
        edit.lookFailed = true;
      }
    } catch (offline) {
      /* No name is better than a wrong one; the owner can type it. */
      edit.lookFailed = true;
    }
    /* A failure is not remembered as "asked and answered": someone who pasted
     * a link out of signal, then found signal, can paste it again and have it
     * work. Only a success closes the question. */
    if (edit.lookFailed && edit.looked === id) edit.looked = null;
    edit.looking = false;
    draw();
  }

  /* A menu item must point at a library entry, so a typed name is created
   * there first and then added.  Already in the library means reuse it rather
   * than being refused for a duplicate name. */
  async function addMenuExercise(edit) {
    var name = (edit.typed || '').trim();
    if (!name) return;
    problem = null;
    var known = libraryNow.filter(function (e) { return e.name === name; })[0];
    try {
      if (!known) {
        var unit = edit.newUnit === 'sec' ? 'sec' : 'reps';
        var made = await api.post('/api/library/save', unit === 'sec'
          ? { name: name, sets: 1, seconds: 30, unit: 'sec' }
          : { name: name, sets: 1, reps: 10, unit: 'reps' });
        known = { ex_id: made.ex_id, name: name, sets: 1,
          reps: unit === 'sec' ? null : 10, seconds: unit === 'sec' ? 30 : null, unit: unit };
        libraryNow = (await api.get('/api/library')).items;
      }
      if (edit.items.some(function (i) { return i.ex_id === known.ex_id; })) {
        problem = 'その種目はもう入っています';
      } else {
        edit.items.push({ ex_id: known.ex_id, name: known.name, sets: known.sets,
          reps: known.reps, seconds: known.seconds, unit: known.unit });
        edit.typed = '';
      }
    } catch (error) {
      problem = error && error.note ? error.note : '足せませんでした。';
    }
    draw();
  }

  /* What a YouTube page will not hand a browser on another site (the
   * description and its chapters) the owner can copy out of the YouTube
   * app and paste here. Lines like "3:20 スクワット" become exercises; the
   * gap to the next line is the length in seconds. No request leaves the
   * phone for this. */
  var CHAPTER = /^\s*[\[\(（]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\]\)）]?\s*[-–—:：・~〜]?\s*(.+?)\s*$/;
  var NOT_EXERCISE = /^(intro|outro|opening|ending|イントロ|オープニング|エンディング|はじめに|おわりに|まとめ|終わり|挨拶|自己紹介|説明|注意|準備|告知|お知らせ)/i;
  function chaptersFrom(text) {
    var found = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var m = CHAPTER.exec(line);
      if (!m) return;
      var parts = m[1].split(':').map(Number);
      var at = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
      var name = m[2].replace(/[|｜【\[].*$/, '').trim();
      if (!name || NOT_EXERCISE.test(name)) return;
      /* "スクワット 15回" - the count is part of the line, not of the name. */
      var reps = /(\d+)\s*回\s*$/.exec(name);
      if (reps) name = name.replace(/[\s×x]*\d+\s*回\s*$/, '').trim();
      found.push({ at: at, name: name.slice(0, 60), reps: reps ? parseInt(reps[1], 10) : null });
    });
    found.sort(function (a, b) { return a.at - b.at; });
    return found.map(function (one, i) {
      var next = found[i + 1];
      var length = next ? next.at - one.at : 0;
      return { name: one.name, reps: one.reps, seconds: length > 0 && length <= 1800 ? length : null };
    });
  }

  /* The same request the PC version makes, from the phone with the owner's
   * key. The model is told to leave out rests, intro and outro, and to mark
   * guesses; the owner still checks the rows - the reading is an offer,
   * not a record. */
  var AI_MODEL = 'gemini-3.5-flash';
  var AI_PROMPT = 'この動画は自宅トレーニング動画です。日本語で答えてください。\n'
    + '動画の中で実際に行うトレーニング種目を、実施順にすべて列挙してください。\n'
    + '各種目について: 種目名（動画内で呼ばれている日本語名。無ければ一般的な日本語名）、'
    + '開始タイムスタンプ(mm:ss)、セット数、1セットあたりの実施時間(秒)または回数。\n'
    + '時間制なら unit="sec" と seconds、回数制なら unit="reps" と reps を入れる。\n'
    + '休憩(rest)・イントロ・アウトロは種目に含めない。推測した箇所は confidence を "low" にしてください。';
  var AI_SCHEMA = {
    type: 'OBJECT',
    properties: {
      exercises: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name_ja: { type: 'STRING' }, start: { type: 'STRING' }, sets: { type: 'INTEGER' },
            unit: { type: 'STRING', enum: ['sec', 'reps'] }, seconds: { type: 'INTEGER' },
            reps: { type: 'INTEGER' }, confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] }
          },
          required: ['name_ja', 'sets', 'unit', 'confidence']
        }
      }
    },
    required: ['exercises']
  };

  async function extractFromVideo(edit) {
    var id = videoId(edit.video_url);
    var key = aiKey();
    if (!id || !key || edit.aiBusy) return;
    edit.aiBusy = true;
    problem = null;
    draw();
    var found = null;
    try {
      var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + AI_MODEL
        + ':generateContent', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [
            { file_data: { file_uri: 'https://www.youtube.com/watch?v=' + id, mime_type: 'video/*' } },
            { text: AI_PROMPT }
          ] }],
          /* Thinking off and a wide output cap: with the defaults the JSON came
           * back cut short (measured 2026-09-12); like this, 9 seconds. */
          generationConfig: { temperature: 0, maxOutputTokens: 8192, mediaResolution: 'MEDIA_RESOLUTION_LOW',
            responseMimeType: 'application/json', responseSchema: AI_SCHEMA, thinkingConfig: { thinkingBudget: 0 } }
        })
      });
      if (!response.ok) {
        /* The status alone does not say why: 400 and 403 also come back for a
         * malformed request, 429 for a moment's rate limit. Say what is known. */
        problem = response.status === 400 || response.status === 403 ? '読み取りの要求が受け付けられませんでした（' + response.status + '）。設定の「動画を読むキー」を確かめてください。'
          : response.status === 429 ? '利用の上限に達したようです（429）。しばらくしてからもう一度。'
          : '動画を読めませんでした（' + response.status + '）。';
      } else {
        var answer = await response.json();
        var candidate = (answer.candidates || [])[0] || {};
        var text = (((candidate.content || {}).parts) || [])
          .filter(function (part) { return !part.thought; })
          .map(function (part) { return part.text || ''; }).join('');
        /* Say which step failed: an empty answer (the model declined or was
         * cut off) reads differently from a phone with no connection. */
        if (!text.trim()) {
          problem = '動画は届きましたが、読み取りが返りませんでした（' + (candidate.finishReason || answer.promptFeedback && answer.promptFeedback.blockReason || '理由不明') + '）。';
        } else {
          try {
            var parsed = JSON.parse(text);
            found = parsed && Array.isArray(parsed.exercises)
              ? parsed.exercises.filter(function (one) { return one && typeof one === 'object' && !Array.isArray(one); })
              : null;
            if (!found) problem = '読み取りの返事が思った形ではありませんでした。';
          } catch (broken) { problem = '読み取りの返事を解釈できませんでした（' + (candidate.finishReason || '') + '・' + text.length + '文字）。'; }
        }
      }
    } catch (failed) {
      problem = problem || '動画を読めませんでした。つながっているか確かめてください（' + String(failed && failed.message || failed).slice(0, 80) + '）。';
    }
    edit.aiBusy = false;
    if (!found) { draw(); return; }
    var added = 0, guessed = 0;
    try {
      for (var i = 0; i < found.length; i++) {
        var one = found[i];
        var name = String(one.name_ja || '').trim().slice(0, 60);
        if (!name) continue;
        var unit = one.unit === 'reps' ? 'reps' : 'sec';
        var sets = Math.max(1, Math.min(99, parseInt(one.sets, 10) || 1));
        var reps = unit === 'reps' ? Math.max(1, Math.min(999, parseInt(one.reps, 10) || 10)) : null;
        var seconds = unit === 'sec' ? Math.max(1, Math.min(3600, parseInt(one.seconds, 10) || 30)) : null;
        var known = libraryNow.filter(function (e) { return e.name === name; })[0];
        if (!known) {
          var made = await api.post('/api/library/save', unit === 'reps'
            ? { name: name, sets: sets, reps: reps, unit: 'reps' }
            : { name: name, sets: sets, seconds: seconds, unit: 'sec' });
          known = { ex_id: made.ex_id, name: name, unit: unit };
          libraryNow = (await api.get('/api/library')).items;
        }
        if (edit.items.some(function (it) { return it.ex_id === known.ex_id; })) continue;
        /* The reading's own unit and amount go on this menu's row; the
         * library entry is only reused for its id (Codex review). */
        edit.items.push({ ex_id: known.ex_id, name: known.name, sets: sets, auto: true,
          reps: reps, seconds: seconds, unit: unit });
        added += 1;
        if (one.confidence === 'low') guessed += 1;
      }
      edit.videoToolsOpen = false;
      state.notice = added
        ? 'AI が動画を読んで ' + added + ' 種目を入れました。読み取りは推測です。名前・回数・秒数を上で確かめてください。'
          + (guessed ? '（自信の低い読み取りが ' + guessed + ' 件）' : '')
        : '動画から種目が読み取れませんでした。';
    } catch (error) {
      problem = error && error.note ? error.note : '種目にできませんでした。';
    }
    draw();
  }

  async function importFromDescription(edit) {
    var chapters = chaptersFrom(edit.pasted);
    problem = null;
    if (!chapters.length) {
      problem = '「3:20 スクワット」のような、時間ではじまる行が見つかりませんでした。';
      draw();
      return;
    }
    var typical = chapters.filter(function (c) { return c.seconds; }).map(function (c) { return c.seconds; })
      .sort(function (a, b) { return a - b; });
    var fallback = typical.length ? typical[Math.floor(typical.length / 2)] : 30;
    var added = 0;
    try {
      for (var i = 0; i < chapters.length; i++) {
        var one = chapters[i];
        var known = libraryNow.filter(function (e) { return e.name === one.name; })[0];
        var seconds = one.seconds || fallback;
        var unit = one.reps ? 'reps' : 'sec';
        if (!known) {
          var made = await api.post('/api/library/save', unit === 'reps'
            ? { name: one.name, sets: 1, reps: one.reps, unit: 'reps' }
            : { name: one.name, sets: 1, seconds: seconds, unit: 'sec' });
          known = { ex_id: made.ex_id, name: one.name, sets: 1, reps: one.reps || null,
            seconds: unit === 'sec' ? seconds : null, unit: unit };
          libraryNow = (await api.get('/api/library')).items;
        }
        if (edit.items.some(function (it) { return it.ex_id === known.ex_id; })) continue;
        /* This menu's row takes what the pasted lines said, not what the
         * library happens to hold for the same name. */
        edit.items.push({ ex_id: known.ex_id, name: known.name, sets: 1, auto: true,
          reps: unit === 'reps' ? one.reps : null,
          seconds: unit === 'sec' ? seconds : null, unit: unit });
        added += 1;
      }
      edit.pasted = '';
      edit.pasteOpen = false;
      edit.videoToolsOpen = false;
      state.notice = added ? added + '種目を入れました。秒数と順番は上で直せます。' : 'すべて入っている種目でした。';
    } catch (error) {
      problem = error && error.note ? error.note : '種目にできませんでした。';
    }
    draw();
  }

  async function openMenuEdit(menuId) {
    problem = null;
    if (!state.menuEditFrom) state.menuEditFrom = 'menus';
    try {
      var menus = (await api.get('/api/menus')).menus;
      var menu = menus.filter(function (m) { return m.menu_id === menuId; })[0];
      if (!menu) { problem = 'トレーニングメニューが見つかりません'; draw(); return; }
      state.menuEdit = {
        menu_id: menu.menu_id, revision: menu.revision, name: menu.name,
        video_url: menu.video_url || '', note: menu.note || '', tag: menu.tag || '',
        items: menu.items.map(function (i) {
          return { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps,
            seconds: i.seconds, unit: i.unit, skip: i.skip === true, auto: i.auto === true };
        })
      };
      state.screen = { name: 'menuEdit' };
    } catch (error) {
      problem = error && error.note ? error.note : 'トレーニングメニューを開けませんでした。';
    }
    draw();
  }

  /* Where the editor was opened from is where it returns to: someone who
   * came to record and had to make the menu first should land back on the
   * record page with the circle in front of them, not on the training tab
   * (the owner, 2026-09-12: "作業が途切れる"). */
  function newMenu(from) {
    problem = null;
    state.menuEditFrom = from || 'menus';
    state.menuEdit = { menu_id: null, revision: null, name: '', video_url: '', note: '', tag: '', items: [] };
    state.screen = { name: 'menuEdit' };
    draw();
  }

  async function saveMenu(edit) {
    problem = null;
    try {
      var saved = await api.post('/api/menu/save', {
        menu_id: edit.menu_id, revision: edit.revision,
        name: edit.name, video_url: edit.video_url || null, note: edit.note || null,
        tag: edit.tag || null,
        items: edit.items.map(function (i) {
          return i.unit === 'sec'
            ? { ex_id: i.ex_id, sets: i.sets, seconds: i.seconds, unit: 'sec', skip: i.skip === true, auto: i.auto === true }
            : { ex_id: i.ex_id, sets: i.sets, reps: i.reps, unit: 'reps', skip: i.skip === true, auto: i.auto === true };
        })
      });
      edit.menu_id = saved.menu_id;
      edit.revision = saved.revision;
      var back = state.menuEditFrom || 'menus';
      state.menuEditFrom = null;
      state.notice = edit.fromRecord ? 'トレーニングメニューに入れました。'
        : back === 'record' ? 'トレーニングメニューができました。やったなら、行末の丸を押してください。' : null;
      state.screen = { name: back };
    } catch (error) {
      problem = error && error.note ? error.note : '保存できませんでした。';
    }
    draw();
  }

  async function removeMenu(edit) {
    if (!window.confirm('このトレーニングメニューを削除します。これまでの記録は残ります。')) return;
    problem = null;
    try {
      await api.post('/api/menu/delete', { menu_id: edit.menu_id });
      state.screen = { name: state.menuEditFrom || 'menus' };
      state.menuEditFrom = null;
    } catch (error) {
      problem = error && error.note ? error.note : '削除できませんでした。';
    }
    draw();
  }

  /* ---- 2d-2: the exercise library ---- */

  function libraryScreen(library, onBack) {
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '種目の一覧' }),
        h('div', { style: 'width:34px' })
      ]),
      problem ? h('div', {
        style: 'display:flex;align-items:flex-start;gap:10px;padding:11px 14px;'
          + 'border-bottom:1px solid #f0e2bf;background:var(--warnSoft)'
      }, [
        h('div', { style: 'width:20px;height:20px;border:1.5px solid var(--warnInk);border-radius:5px;'
          + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;'
          + 'color:var(--warnInk);flex:none', text: '!', 'aria-hidden': 'true' }),
        h('div', { style: 'flex:1;font-size:12px;color:#7a5b12;line-height:1.5' }, [
          problem,
          state.usedBy ? h('div', { style: 'font-size:11px;margin-top:3px',
            text: state.usedBy.join(' ／ ') }) : null
        ])
      ]) : null,
      h('div', { style: 'padding:8px 16px 20px;display:flex;flex-direction:column' },
        library.map(function (e, i) {
          return h('div', { style: 'display:flex;gap:10px;align-items:center;padding:11px 0;'
            + (i ? 'border-top:1px solid var(--line2);' : '') }, [
            h('div', { style: 'flex:1;min-width:0' }, [
              h('input', { type: 'text', value: e.name,
                style: 'font-size:14px;font-weight:700;color:var(--ink);border:0;background:none;'
                  + 'padding:0;width:100%;font-family:inherit',
                onchange: function () { renameExercise(e, this.value); } }),
              h('div', { style: 'font-size:10px;color:var(--faint);margin-top:3px',
                text: '記録 ' + e.use_count + '件' + (e.use_count ? '' : ' ・ 未使用') })
            ]),
            h('div', { style: 'font-size:12px;color:var(--sub);flex:none',
              text: amountLabel(e.unit, e.sets, e.reps, e.seconds) }),
            deleteButton(e.name + ' を一覧から消す', function () { removeExercise(e); })
          ]);
        }))
    ]);
  }

  async function renameExercise(exercise, name) {
    problem = null;
    state.usedBy = null;
    try {
      await api.post('/api/library/save', {
        ex_id: exercise.ex_id, name: name, sets: exercise.sets,
        reps: exercise.reps, seconds: exercise.seconds, unit: exercise.unit
      });
    } catch (error) {
      problem = error && error.note ? error.note : '直せませんでした。';
    }
    draw();
  }

  async function removeExercise(exercise) {
    if (!window.confirm(exercise.name + ' を一覧から消します。これまでの記録は残ります。')) return;
    problem = null;
    state.usedBy = null;
    try {
      await api.post('/api/library/delete', { ex_id: exercise.ex_id });
    } catch (error) {
      problem = error && error.note ? error.note : '消せませんでした。';
      state.usedBy = error && error.body && error.body.menus ? error.body.menus : null;
    }
    draw();
  }

  /* ---- the menu list tab ---- */

  /* The page for doing (Design 2026-09-12, after Strong and Hevy): every
   * menu with its circle, and the row for a day that was not on any menu.
   * Recording leaves you here - two or three in a day is normal and there
   * is no "end of session" to return from. Adding and editing menus live
   * on the training tab, not here. */
  function skipOfferBlock(view) {
    var offer = state.skipOffer;
    if (!offer) return null;
    var menu = view.menus.filter(function (m) { return m.menu_id === offer.menuId; })[0];
    if (!menu) { state.skipOffer = null; return null; }
    return h('div', { style: 'padding:14px 18px;border-bottom:1px solid var(--line);display:flex;'
      + 'flex-direction:column;gap:12px' }, [
      h('div', { style: 'font-size:14px;color:var(--body);line-height:1.6',
        text: '外した種目を、次回からも外しておけます。' }),
      h('button', {
        style: 'border:1px solid var(--sub);background:var(--card);color:var(--ink);font-family:inherit;'
          + 'font-size:15px;font-weight:700;border-radius:12px;min-height:44px;cursor:pointer;'
          + 'align-self:flex-start;padding:0 16px',
        onclick: async function () {
          state.skipOffer = null;
          await setSkip(menu, offer.ids, true);
          draw();
        }
      }, ['ふだんは外す'])
    ]);
  }

  function recordScreen(view) {
    var page = recordPage(view);
    state.notice = null;
    return page;
  }

  function recordPage(view) {
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
          onclick: function () { problem = null; state.skipOffer = null; state.screen = { name: 'home' }; draw(); } }, ['‹ 戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '記録する' }),
        h('div', { style: 'width:52px' })
      ]),
      skipOfferBlock(view),
      state.notice ? h('div', { style: 'padding:12px 18px 0;font-size:14px;color:var(--body);line-height:1.6', text: state.notice }) : null,
      view.menus.length ? searchBox(view.menus) : null,
      view.menus.length ? tagBar(view.menus) : null,
    h('div', { style: 'flex:1;padding:6px 18px 18px;display:flex;flex-direction:column;gap:' + (view.menus.length ? '2px' : '12px') }, [
      /* Said once, in place of a word under every circle: only while
       * nothing has ever been recorded. */
      view.menus.length && view.facts.first_ever && !state.notice ? h('div', {
        style: 'font-size:14px;color:var(--body);padding:8px 0;line-height:1.6',
        text: '右の丸を押すと、やった記録が残ります。' }) : null,
      view.menus.length ? null : firstMenuBox(async function (url, skipVideo) {
        problem = null;
        /* Made here rather than on another screen: the field is on this
         * one because that is the whole of it. An address that is not a
         * video goes to the editor with what was typed, so nothing that
         * was written is thrown away. */
        var id = videoId(url);
        if (!skipVideo && !id) {
          if (url.trim()) {
            newMenu('record');
            state.menuEdit.video_url = url.trim();
            problem = 'YouTube の URL ではないようです。直すか、動画なしで作ってください。';
            draw();
            return;
          }
          problem = 'URL を貼るか、動画を使わずに作ってください。';
          draw();
          return;
        }
        newMenu('record');
        if (!skipVideo) {
          state.menuEdit.video_url = url.trim();
          fetchTitle(state.menuEdit);
        }
        draw();
      })
    ].concat(filteredMenus(view.menus).map(function (menu, i) {
      /* Already put down today, and at what time. The first one is
       * enough: the circle says it happened, and the day's own list
       * below has every record with its time. */
      /* Sorted by when it was done rather than when it was written down:
       * someone who records the evening session first and the morning one
       * afterwards should see the morning time under the tick, not the
       * order they happened to type them in. */
      var already = (view.today.sessions || []).filter(function (s) {
        return s.menu_id === menu.menu_id;
      }).sort(function (a, b) {
        return String(a.performed_time || '99:99').localeCompare(String(b.performed_time || '99:99'));
      })[0];
      return menuRow(menu, i === 0, view.today.date,
        already ? (already.performed_time || '記録済み') : null,
        complete.bind(null, menu, view.today.date),
        function () {
          problem = null;
          /* Pressing the row opens the menu, where the exercises can be
           * ticked one by one - what used to be 一部だけ, off the row and
           * onto a screen of its own. A menu with nothing in it has
           * nothing to tick, so it opens for editing instead. */
          if (!menu.items.length) { state.menuEditFrom = 'record'; openMenuEdit(menu.menu_id); return; }
          state.draft = {
            date: view.today.date,
            time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()),
            items: menu.items.map(function (m) {
              return { menu_item_id: m.menu_item_id, include: !m.skip, sets: m.sets };
            })
          };
          state.screen = { name: 'partial', menuId: menu.menu_id };
          draw();
        });
    })).concat([
      otherRow(function () {
        openManual(view.today.date, (view.today.sessions || []).filter(function (s) {
          return s.session_kind === 'manual';
        })[0]);
      })
    ]))
      ,
      problem ? warnBar(problem, null, null) : null
    ]);
  }

  function menuListScreen(menus, onNew, onOpen) {
    var page = menuListPage(menus, onNew, onOpen);
    state.notice = null;
    return page;
  }

  function menuListPage(menus, onNew, onOpen) {
    var shown = filteredMenus(menus);
    /* Dragging is only offered on the whole list: an order made inside a
     * filtered view would be a guess about the rows that are not there. */
    var whole = shown.length === menus.length;
    var order = menus.slice();
    var saveOrder = async function () {
      problem = null;
      try {
        await api.post('/api/menu/reorder', { menu_ids: order.map(function (m) { return m.menu_id; }),
          expected_menu_ids: menus.map(function (m) { return m.menu_id; }) });
      } catch (error) {
        problem = error && error.note ? error.note : '並び順を保存できませんでした。';
      }
      draw();
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;flex-direction:column;gap:3px;padding:18px 18px 12px' }, [
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.1', text: 'トレーニングメニュー' }),
        /* Said once; the next drawing of anything forgets it. */
        state.notice ? h('div', { style: 'font-size:14px;color:var(--body);padding-top:6px', text: state.notice }) : null
      ]),
      menus.length ? searchBox(menus) : null,
      menus.length ? tagBar(menus) : null,
      h('div', { style: 'flex:1;padding:0 18px 18px;display:flex;flex-direction:column;gap:2px' },
        (menus.length ? shown.map(function (menu, i) {
          return h('div', {
            style: 'display:flex;gap:8px;align-items:center;padding:6px 0;'
              + (i ? 'border-top:1px solid var(--line2);' : '')
          }, [
            whole ? grabHandle(order, i, menu.name, saveOrder) : null,
            h('button', {
              style: 'flex:1;min-width:0;display:flex;gap:12px;align-items:flex-start;padding:6px 0;'
                + 'background:none;border:0;text-align:left;font-family:inherit;cursor:pointer',
              'aria-label': menu.name + ' を編集する',
              onclick: onOpen.bind(null, menu.menu_id)
            }, [
              h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px' }, [
                h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink);line-height:1.3;' + TWO_LINES,
                  text: menu.name }),
                h('div', { style: 'font-size:11px;color:var(--sub)',
                  text: menuShape(menu) + (menu.tag ? ' ・ ' + menu.tag : '') })
              ]),
              menuThumb(menu.video_url),
              h('span', { style: 'flex:none;align-self:center;color:var(--sub);display:flex' }, [svg(ICON.chevron)])
            ])
          ]);
        }) : [
          h('div', { style: 'padding:22px 0;font-size:13px;color:var(--sub);line-height:1.7',
            text: 'トレーニングメニューがありません。トレーニングメニューは、動画のURLと種目をまとめたものです。1つ作ると、やった日に丸を押すだけで残ります。' })
        ]).concat(menus.length && !shown.length ? [
          h('div', { style: 'padding:22px 0;font-size:14px;color:var(--body);line-height:1.7',
            text: 'この分類・この名前のトレーニングメニューはありません。' })
        ] : []).concat([
          /* Design (2026-09-12): the way to add one is a row at the end of
           * the list, not a dashed button - dashes already mean "cannot be
           * pressed" on the week strip. */
          addMenuRow(onNew)
        ])),
      navBar('menus')
    ]);
  }

  /* ---- screen ---- */

  var state = { screen: { name: 'home' }, draft: null, days: 30 };
  var libraryNow = [];
  var menusNow = [];    // the menus as last read, for comparing a record against its menu

  function menuOf(menuId) {
    if (menuId === null || menuId === undefined) return null;
    return menusNow.filter(function (m) { return m.menu_id === menuId; })[0] || null;
  }
  var problem = null;   // the store's own sentence, shown unchanged

  function warnBar(text, actionLabel, onAction) {
    return h('div', {
      style: 'display:flex;align-items:center;gap:10px;padding:10px 14px;'
        + 'background:var(--warnSoft);border-top:1px solid #f0e2bf'
    }, [
      h('div', { style: 'width:20px;height:20px;border:1.5px solid var(--warnInk);border-radius:5px;'
        + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;'
        + 'color:var(--warnInk);flex:none', text: '!', 'aria-hidden': 'true' }),
      h('div', { style: 'font-size:12px;color:#7a5b12;line-height:1.45;flex:1', text: text }),
      actionLabel ? h('button', {
        style: 'border:1px solid var(--warnInk);background:transparent;color:var(--warnInk);'
          + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:9px;padding:8px 10px;'
          + 'min-height:36px;cursor:pointer',
        onclick: onAction
      }, [actionLabel]) : null
    ]);
  }

  function installed() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    } catch (e) { return false; }
  }

  function navBar(here) {
    /* Design (2026-09-12): home / training / settings, drawn with the
     * pictures everyone knows. Selected = filled + bold + a 2px band on
     * top; nothing rests on hue. */
    var tabs = [['ホーム', 'home'], ['トレーニング', 'menus'], ['設定', 'settings']];
    return h('div', { style: 'display:flex;height:56px;border-top:1px solid var(--line);background:var(--card);'
      + 'padding-bottom:env(safe-area-inset-bottom)' },
      tabs.map(function (tab) {
        var on = tab[1] === here;
        return h('button', {
          style: 'flex:1;min-height:44px;display:flex;flex-direction:column;align-items:center;'
            + 'justify-content:center;gap:2px;border:0;background:none;font-family:inherit;cursor:pointer;'
            + 'position:relative;padding:0;color:var(--' + (on ? 'ink' : 'sub') + ')',
          'aria-current': on ? 'page' : null,
          onclick: function () {
            problem = null;
            state.skipOffer = null;
            state.notice = null;
            /* So that 戻る in the settings header goes back to the tab you
             * came from, rather than always to the first one. */
            if (tab[1] === 'settings' && here !== 'settings') state.settingsFrom = here;
            state.screen = { name: tab[1] };
            draw();
          }
        }, [
          on ? h('span', { style: 'position:absolute;top:0;left:50%;transform:translateX(-50%);'
            + 'width:28px;height:2px;background:var(--ink)' }) : null,
          svg(ICON[tab[1]][on ? 1 : 0]),
          h('div', { style: 'font-size:11px;font-weight:' + (on ? '700' : '400'), text: tab[0] })
        ]);
      }));
  }

  async function complete(menu, date) {
    var token = requestId(menu, date);
    problem = null;
    try {
      await api.post('/api/menu/complete', {
        menu_id: menu.menu_id, date: date, request_id: token.id, items: null,
        performed_time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())
      });
      token.clear();
      /* The owner's call (2026-09-12): after any record, home - where the
       * day's list shows what just landed. Someone recording several in a
       * row presses 記録する again. */
      state.screen = { name: 'home' };
    } catch (error) {
      problem = error && error.note ? error.note : '記録できませんでした。';
    }
    draw();
  }

  /* A phone that has never been used for this: no records anywhere in view and
   * no menus.  Checked as well as the stored mark so that a restored document
   * from before this flow existed does not re-ask. */
  function untouched(view) {
    var kept = (view.history.days || []).some(function (day) { return day.sessions.length > 0; });
    return !kept && !view.today.sessions.length && !view.menus.length;
  }

  var finishing = false;

  async function finishSetup(draft) {
    /* A tap that lands twice - a slow save, a finger that bounces - would
     * write the settings twice and redraw over itself. The first one wins. */
    if (finishing) return;
    finishing = true;
    try {
      await api.post('/api/settings/save', {
        nickname: draft.nickname, companion: draft.companion, setup_done: ymd(new Date())
      });
    } catch (error) { problem = error && error.note ? error.note : null; }
    finishing = false;
    state.setup = null;
    /* Someone can arrive here by sharing a video to an app they have never
     * opened: Android installs it, the share opens the menu editor, and the
     * first run steps in front of it. The video they shared waits rather than
     * being dropped on the floor. */
    /* Straight on to the add-to-home sheet: WebKit throws away what a browser
     * stored after seven idle days, and an app on the home screen is exempt,
     * so this is the one piece of housekeeping the records depend on. Someone
     * arriving with a shared video goes to that instead - they came to write
     * something down, not to be told about storage. */
    if (state.afterSetup) {
      state.screen = state.afterSetup;
      state.afterSetup = null;
    } else if (!installed()) {
      state.a2hsFrom = 'home';
      state.screen = { name: 'a2hs' };
    } else {
      state.screen = { name: 'home' };
    }
    draw();
  }

  function render(view) {
    if (!view.settings.setup_done && untouched(view) && state.screen.name !== 'setup') {
      state.setup = { step: 0, nickname: view.settings.nickname || '', companion: view.settings.companion };
      state.screen = { name: 'setup' };
    }
    if (state.screen.name === 'setup') {
      var draft = state.setup || (state.setup = { step: 0, nickname: '', companion: null });
      root.replaceChildren(setupScreen(draft,
        function (slug) {
          draft.companion = slug;
          /* On the last question, choosing is answering: Design left no button
           * under the pictures, because tapping one already says everything a
           * button would have asked for. */
          if (draft.step === SETUP_STEPS - 1 && slug) finishSetup(draft);
          else draw();
        },
        function (value) { draft.nickname = value; },
        function () {
          if (draft.step < SETUP_STEPS - 1) { draft.step += 1; draw(); } else finishSetup(draft);
        },
        function () {
          /* あとで means "do not ask me the rest", not "throw away what I have
           * already said": tapping a companion and then あとで used to leave
           * you with none. Whatever is in hand is kept either way.
           *
           * The last question is the exception, because there the button says
           * 相棒は選ばない - and if the draft arrived carrying a companion from
           * settings, keeping it would make the button a liar. */
          if (draft.step < SETUP_STEPS - 1 && draft.step > 0) { draft.step += 1; draw(); }
          else if (draft.step === SETUP_STEPS - 1) {
            finishSetup({ nickname: draft.nickname, companion: null });
          } else finishSetup(draft);
        }));
      return;
    }

    if (state.screen.name === 'history') {
      root.replaceChildren(historyScreen(view.history, state.days,
        function () { state.screen = { name: 'home' }; draw(); },
        function () { state.days += 30; draw(); },
        openEdit));
      return;
    }
    if (state.screen.name === 'library') {
      root.replaceChildren(libraryScreen(libraryNow, function () {
        state.screen = { name: 'settings' };
        problem = null; state.usedBy = null;
        draw();
      }));
      return;
    }
    if (state.screen.name === 'menus') {
      root.replaceChildren(menuListScreen(view.menus, newMenu, openMenuEdit));
      return;
    }
    if (state.screen.name === 'record') {
      root.replaceChildren(recordScreen(view));
      return;
    }
    if (state.screen.name === 'menuEdit') {
      root.replaceChildren(menuEditScreen(state.menuEdit, libraryNow, function () {
        state.screen = { name: state.menuEditFrom || 'menus' };
        state.menuEditFrom = null;
        problem = null;
        draw();
      }));
      return;
    }
    if (state.screen.name === 'a2hs') {
      root.replaceChildren(a2hsScreen(function () {
        state.screen = { name: state.a2hsFrom || 'home' };
        draw();
      }));
      return;
    }
    if (state.screen.name === 'manual') {
      root.replaceChildren(manualScreen(state.pick, libraryNow, function () {
        state.screen = { name: 'record' };
        problem = null;
        draw();
      }));
      return;
    }
    if (state.screen.name === 'settings') {
      root.replaceChildren(settingsScreen(
        function () { state.screen = { name: state.settingsFrom || 'home' }; draw(); },
        function (target) {
          problem = null;
          if (target === 'a2hs') state.a2hsFrom = 'settings';
          state.screen = { name: target === 'nickname' ? 'nickname'
            : target === 'companion' ? 'companion'
            : target === 'export' ? 'export'
            : target === 'a2hs' ? 'a2hs'
            : target === 'aikey' ? 'aikey'
            : target === 'about' ? 'about'
            : target === 'theme' ? 'theme' : 'library' };
          draw();
        }));
      return;
    }
    if (state.screen.name === 'theme') {
      root.replaceChildren(themeScreen(function () { state.screen = { name: 'settings' }; draw(); }));
      return;
    }
    if (state.screen.name === 'about') {
      root.replaceChildren(aboutScreen(function () { state.screen = { name: 'settings' }; draw(); }));
      return;
    }
    if (state.screen.name === 'aikey') {
      root.replaceChildren(aiKeyScreen(
        function () { state.screen = { name: state.aikeyFrom || 'settings' }; state.aikeyFrom = null; draw(); },
        function (value) {
          remember(AI_KEY, { key: (value || '').trim() });
          state.screen = { name: state.aikeyFrom || 'settings' }; state.aikeyFrom = null;
          draw();
        }));
      return;
    }
    if (state.screen.name === 'nickname') {
      root.replaceChildren(nicknameScreen(view.settings.nickname,
        function () { state.screen = { name: 'settings' }; draw(); },
        async function (value) {
          try {
            await api.post('/api/settings/save', { nickname: value });
            state.screen = { name: 'settings' };
          } catch (error) { problem = error && error.note ? error.note : null; }
          draw();
        }));
      return;
    }
    if (state.screen.name === 'companion') {
      root.replaceChildren(companionScreen(view.settings.companion,
        function () { state.screen = { name: 'settings' }; draw(); },
        async function (slug) {
          try { await api.post('/api/settings/save', { companion: slug }); }
          catch (error) { problem = error && error.note ? error.note : null; }
          draw();
        }));
      return;
    }
    if (state.screen.name === 'export') {
      root.replaceChildren(exportScreen(view.settings, view.totalSessions,
        function () { state.screen = { name: 'settings' }; draw(); },
        function () { state.a2hsFrom = 'export'; state.screen = { name: 'a2hs' }; draw(); }));
      return;
    }
    if (state.screen.name === 'edit') {
      root.replaceChildren(editScreen(state.edit, function () {
        state.screen = { name: 'history' };
        problem = null;
        draw();
      }));
      return;
    }
    if (state.screen.name === 'partial') {
      var menu = view.menus.filter(function (m) { return m.menu_id === state.screen.menuId; })[0];
      if (!menu) {                       // deleted from another tab while we stood here
        state.screen = { name: 'record' };
      } else {
        root.replaceChildren(partialScreen(state.draft, menu, function () {
          state.screen = { name: 'record' };
          problem = null;
          draw();
        }));
        return;
      }
    }
    var page = h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      /* Home header as Claude Design settled it (2026-09-13): the date in
       * plain Japanese as a quiet line, the title big, and the running clock
       * on the right of the title line - the weight the owner felt was
       * missing. Values copied from the artboard; do not tune here. */
      h('div', { style: 'display:flex;flex-direction:column;padding:20px 20px 14px;background:var(--card);'
        + 'border-bottom:1px solid var(--line)' }, [
        h('div', { style: 'font-size:15px;font-weight:700;color:var(--sub);'
          + 'letter-spacing:.01em', text: jaDateLabel(view.today.date) }),
        h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;gap:16px;'
          + 'margin-top:8px' }, [
          h('div', { style: 'font-size:30px;font-weight:800;color:var(--ink);line-height:1.15;'
            + 'letter-spacing:.02em', text: 'トレ録' }),
          /* The clock the app is running on: what the owner asked for when
           * checking the phone against the screen. Ticks by itself so it
           * never shows a stale minute. */
          clockLine()
        ])
      ]),
      weekStrip(view.today.date, view.history, view.today.calendar_this_week, view.today.calendar_prev_week,
        function (date) {
          /* "押すとその日を開きます" - the history list ending on that day, so
             the day tapped is the first one shown. */
          state.historyEnd = date;
          state.days = 30;
          state.screen = { name: 'history' };
          draw();
        }, view.facts.first_ever),
      amountCard(view.today, view.facts, view.settings, function () {
        problem = null;
        state.historyEnd = view.today.date;
        state.days = 30;
        state.screen = { name: 'history' };
        draw();
      }),
      h('div', {
        style: 'flex:1;padding:14px 18px 18px;'
          + 'display:flex;flex-direction:column;gap:18px'
      }, [
        /* Design (2026-09-12): the home page is for looking; the one button
         * on it is the way to the page for doing. Two states (2026-09-14,
         * after the owner's local app): filled while the day is empty,
         * outline with a plus once it holds a record. */
        todayRecords(view.today.sessions, function (session) {
          problem = null;
          openEdit(session.session_id, view.today.date);
        }, function () {
          problem = null;
          state.historyEnd = view.today.date;
          state.days = 30;
          state.screen = { name: 'history' };
          draw();
        }),
        /* Last on the page, after what the day holds (Design .dc.html and
         * the owner's local app put it there). */
        homeButton(view.today.sessions.length > 0, function () {
          problem = null; state.screen = { name: 'record' }; draw();
        })
      ]),
      problem ? warnBar(problem, null, null) : null,
      /* The reason differs by phone, so the warning cannot be one sentence.
       * On iOS the records really are thrown away after seven idle days; on
       * Android they are not, and saying so would be scaremongering. */
      installed() || remembered(A2HS_KEY).added ? null : warnBar(whichPhone() === 'ios'
        ? 'ホーム画面に追加していません。記録が消えることがあります。'
        : 'ホーム画面に追加していません。追加すると、次からすぐ開けます。', '手順', function () {
        state.a2hsFrom = 'home';
        state.screen = { name: 'a2hs' };
        draw();
      }),
      navBar('home')
    ]);
    root.replaceChildren(page);
  }

  /* The wording of the second state is a placeholder until Claude Design
   * settles it with the owner ("足す" is out, by the owner's word). One place
   * to change it. */
  var RECORD_LABEL = '記録する';
  var RECORD_MORE_LABEL = 'もう1つ記録する';

  function homeButton(hasRecords, onPress) {
    return h('button', {
      class: 'primary' + (hasRecords ? ' outline' : ''),
      style: 'display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:58px;'
        + 'border-radius:var(--radius-control);font-size:17px;font-weight:800;'
        + 'letter-spacing:.02em;font-family:inherit;cursor:pointer;padding:0 16px',
      onclick: onPress
    }, [
      hasRecords ? svg('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>') : null,
      hasRecords ? RECORD_MORE_LABEL : RECORD_LABEL
    ]);
  }

  /* One card per record (design/THEMES_20260914.md): title, "n種目 ／ HH:MM
   * 実施", the thumbnail on the right; the top row opens the record, and a
   * bottom row "種目を見る" folds the exercise list open without a redraw. */
  function recordCard(session, onOpen) {
    var name = session.menu_name
      || (session.items.length === 1 ? session.items[0].name : '種目 ' + session.items.length + '件');
    var time = session.performed_time || '';
    var meta = (session.items.length ? session.items.length + '種目' : (session.video_url ? '種目なし' : '記録のみ'))
      + (time ? ' ／ ' + time + ' 実施' : '');
    var list = h('div', { style: 'display:none;border-top:1px solid var(--line);padding:12px 16px;'
      + 'flex-direction:column;gap:6px' },
      session.items.map(function (item) {
        var amount = item.sets + 'セット×' + (item.unit === 'sec' ? item.seconds + '秒' : item.reps + '回');
        return h('div', { style: 'display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--body)' }, [
          h('span', { text: item.name }),
          h('span', { style: 'font-weight:700;color:var(--sub)', text: amount })
        ]);
      }));
    var toggleLabel = h('span', { text: '種目を見る' });
    var toggle = h('button', {
      style: 'flex:1;min-height:44px;background:transparent;border:0;padding:9px 16px;font-family:inherit;'
        + 'cursor:pointer;display:flex;align-items:center;gap:6px;text-align:left;font-size:13px;'
        + 'font-weight:700;color:var(--color-action)',
      'aria-expanded': 'false',
      onclick: function () {
        var open = list.style.display === 'none';
        list.style.display = open ? 'flex' : 'none';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggleLabel.textContent = open ? '種目をとじる' : '種目を見る';
        toggle.lastChild.style.transform = open ? 'rotate(180deg)' : '';
      }
    }, [toggleLabel, svg('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5"/></svg>')]);
    if (!session.items.length) toggle.style.visibility = 'hidden';
    return h('div', { style: 'background:var(--card);border:1px solid var(--line);border-radius:var(--radius-card);'
      + 'box-shadow:var(--shadow-card);overflow:hidden' }, [
      // The whole top row is the way in (SETTLED 2026-09-12: no "編集"
      // button on a list you are reading; open the record and fix it there).
      h('button', {
        style: 'display:flex;align-items:flex-start;gap:12px;padding:14px 16px 10px;width:100%;'
          + 'background:transparent;border:0;text-align:left;font-family:inherit;cursor:pointer;color:inherit',
        'aria-label': (time ? time.replace(/^0/, '').replace(':', '時') + '分の記録を' : 'この記録を') + '開く',
        onclick: onOpen
      }, [
        h('div', { style: 'flex:1;min-width:0' }, [
          h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink);line-height:1.4;' + TWO_LINES, text: name }),
          h('div', { style: 'font-size:12px;font-weight:700;color:var(--sub);margin-top:5px', text: meta })
        ]),
        session.video_url ? thumb(session.video_url, 112, 64) : null,
        h('span', { style: 'flex:none;align-self:center;font-size:20px;font-weight:700;color:var(--sub);line-height:1', text: '›', 'aria-hidden': 'true' })
      ]),
      list,
      session.items.length ? h('div', { style: 'display:flex;align-items:center;border-top:1px solid var(--line)' }, [toggle]) : null
    ]);
  }

  /* "今日の記録": heading with the count and last time on the right, then
   * one card per record, then the way to earlier days. */
  function todayRecords(sessions, onOpen, onHistory) {
    var times = sessions.map(function (s) { return s.performed_time; }).filter(Boolean).sort();
    var last = times.length ? times[times.length - 1] : '';
    return h('div', { style: 'display:flex;flex-direction:column;gap:12px' }, [
      sessions.length ? h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;padding:0 2px' }, [
        h('span', { style: 'font-size:13px;font-weight:800;color:var(--body);letter-spacing:.03em', text: '今日の記録' }),
        h('span', { style: 'font-size:12px;font-weight:700;color:var(--sub)',
          text: sessions.length + '件' + (last ? ' ／ 最後は ' + last : '') })
      ]) : null
    ].concat(sessions.map(function (session) {
      return recordCard(session, onOpen.bind(null, session));
    })).concat([
      h('button', {
        style: 'display:flex;align-items:center;justify-content:space-between;min-height:44px;width:100%;'
          + 'border:0;border-top:1px solid var(--line);background:none;padding:10px 2px;font-family:inherit;'
          + 'cursor:pointer;font-size:14px;font-weight:400;color:var(--body);text-align:left',
        onclick: onHistory
      }, ['前の日の記録を見る', h('span', { style: 'color:var(--sub);display:flex' }, [svg(ICON.chevron)])])
    ]));
  }

  function clockLine() {
    var line = h('div', { style: 'font-size:20px;font-weight:700;color:var(--body);'
      + 'font-variant-numeric:tabular-nums' });
    var tick = function () {
      var now = new Date();
      line.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    };
    tick();
    /* The line is not on the page yet when it is made; the check runs on
     * the later ticks only, and stops the timer once the page is redrawn. */
    var timer = setInterval(function () {
      if (!line.isConnected) { clearInterval(timer); return; }
      tick();
    }, 15000);
    return line;
  }

  /* Redrawing replaces the whole page, which takes the keyboard away from the
   * field being typed in - and the menu editor redraws by itself while it
   * fetches a video's title, right after a paste. So the field that had the
   * keyboard is named, and looked for again once the new page is in place,
   * along with where the cursor was sitting. */
  function whereTheKeyboardWas() {
    var live = document.activeElement;
    if (!live || !live.getAttribute || !live.getAttribute('data-field')) return null;
    var at = null;
    try { at = live.selectionStart; } catch (e) { at = null; }
    return { field: live.getAttribute('data-field'), at: at };
  }

  function giveTheKeyboardBack(held) {
    if (!held) return;
    /* Compared as a value, not spliced into a selector: a name with a
     * quotation mark in it is still a name. */
    var again = null;
    var all = root.querySelectorAll('[data-field]');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-field') === held.field) { again = all[i]; break; }
    }
    if (!again) return;
    again.focus();
    if (held.at !== null && again.setSelectionRange) {
      try { again.setSelectionRange(held.at, held.at); } catch (e) { /* not a text field */ }
    }
  }

  async function draw() {
    var held = whereTheKeyboardWas();
    try {
      var today = await api.get('/api/today');
      var results = await Promise.all([
        api.get('/api/history?end='
          + (state.screen.name === 'history' ? (state.historyEnd || today.date) : today.date)
          + '&days=' + (state.screen.name === 'history' ? state.days : 21)),
        api.get('/api/greeting?date=' + today.date),
        api.get('/api/settings'),
        api.get('/api/menus'),
        api.get('/api/library')
      ]);
      menusNow = results[3].menus;
      libraryNow = results[4].items;
      var total = 0;
      if (state.screen.name === 'export') {
        /* Only counted where it is shown; the store keeps no running total. */
        var whole = await api.exportDocument();
        total = whole.sessions.length;
      }
      render({ today: today, history: results[0], facts: results[1],
        settings: results[2].settings, menus: menusNow, totalSessions: total });
      giveTheKeyboardBack(held);
    } catch (error) {
      /* Whatever went wrong, leaving someone on a single line of text with
       * nothing to press is the wrong place to leave them. The console gets
       * the real error so a report can say what broke. */
      if (window.console && console.error) console.error(error);
      root.replaceChildren(h('div', { style: 'padding:24px 20px;display:flex;flex-direction:column;gap:14px' }, [
        h('div', { style: 'font-size:14px;color:var(--body);line-height:1.7',
          text: error && error.note ? error.note : '画面を開けませんでした。' }),
        h('div', { style: 'font-size:12px;color:var(--faint);line-height:1.7',
          text: '記録は端末の中に残っています。もう一度開いてみてください。' }),
        h('button', { style: 'border:0;background:var(--color-action);color:var(--on-action);font-family:inherit;font-size:15px;'
          + 'font-weight:800;border-radius:16px;min-height:50px;cursor:pointer',
          onclick: function () { problem = null; state.screen = { name: 'home' }; draw(); } }, ['もう一度'])
      ]));
    }
  }

  /* Shared from YouTube.
   *
   * The manifest registers the installed app as a share target, so Android's
   * share sheet offers it.  What arrives varies: YouTube usually puts the link
   * in `text`, sometimes with the title in front of it, and other apps use
   * `url`.  So all three fields are searched for something that looks like a
   * video, and the rest is ignored.
   *
   * It opens the menu editor with the URL already in and the title being
   * fetched, rather than saving anything: a menu needs at least one exercise,
   * and guessing which would be inventing a record the owner did not make.
   */
  function sharedVideo() {
    var query = new URLSearchParams(location.search);
    var fields = [query.get('url'), query.get('text'), query.get('title')];
    for (var i = 0; i < fields.length; i++) {
      var found = (fields[i] || '').match(/https?:\/\/\S*(?:youtu\.be|youtube\.com)\/\S*/);
      if (found && videoId(found[0])) return found[0];
    }
    return null;
  }

  var shared = sharedVideo();
  if (shared) {
    /* Drop the query so a reload does not open the editor a second time. */
    history.replaceState(null, '', location.pathname);
    state.menuEdit = { menu_id: null, revision: null, name: '', video_url: shared,
      note: '', items: [], newUnit: 'reps' };
    state.screen = { name: 'menuEdit' };
    state.afterSetup = { name: 'menuEdit' };
    fetchTitle(state.menuEdit);
  }

  draw();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    /* updateViaCache 'none': without it the browser may hand the old sw.js
     * back from its own HTTP cache for up to a day, so a fix to the worker -
     * including the one that stopped it serving the page in place of a script
     * - would not reach a phone that already had the app. */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(function () { /* offline use is a bonus, not a requirement */ });
  }
})();
