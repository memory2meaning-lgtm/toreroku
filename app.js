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
  function longLabel(date) {
    var d = parseYmd(date);
    return date + ' ' + WEEKDAYS[(d.getDay() + 6) % 7];
  }

  /* Four steps of lightness by how many records the day holds - no hue, no
   * score.  Claude Design settled these for the published strip: relative
   * luminance falls 100 - 79 - 58 - 35 - 12 percent, so the order survives
   * with the hue taken out, which is the point for a colour-blind reader. */
  var INK_STEPS = ['#dce3ec', '#b3c0d1', '#7e8ea3', '#37465c'];
  var INK_TEXT = ['var(--ink)', 'var(--ink)', '#fff', '#fff'];

  /* ---- greeting ----
   * The store hands over facts only; these are the design's own sentences,
   * from artboards 1b, 1c and 1d.  A greeting, and at most one plain fact.
   * Never praise, never a streak. */
  /* The name is spent once per launch.  Being called by name every time the
   * home screen redraws would be the tacky kind of familiarity; once, when the
   * app opens, is the greeting doing its job. */
  var nameSpent = false;

  function greetingLine(facts, nickname) {
    var hello = facts.part_of_day === 'morning' ? 'おはようございます'
      : facts.part_of_day === 'afternoon' ? 'こんにちは' : 'こんばんは';
    if (nickname && !nameSpent) {
      nameSpent = true;
      hello += '、' + nickname + 'さん。';
    } else {
      hello += '。';
    }
    if (facts.first_ever) return hello;
    if (facts.days_since !== null && facts.days_since >= 2) {
      return hello + facts.days_since + '日ぶりですね。';
    }
    if (facts.has_today && facts.days_this_week >= 2) {
      return hello + '今週はこれで' + facts.days_this_week + '日です。';
    }
    return hello;
  }

  /* ---- home ---- */

  function weekStrip(today, history, thisWeek, prevWeek, onPick) {
    var counts = {};
    (history.days || []).forEach(function (day) { counts[day.date] = day.sessions.length; });
    var todayDate = parseYmd(today);
    var monday = new Date(todayDate);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    var cells = [];
    var labels = [];
    for (var i = 0; i < 7; i++) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + i);
      var date = ymd(day);
      var future = date > today;
      var isToday = date === today;
      var count = counts[date] || 0;
      var step = count > 0 ? Math.min(count, INK_STEPS.length) - 1 : -1;
      var style = 'flex:1;height:44px;border-radius:8px;'
        + (future ? 'border:1px dashed var(--faint);background:#fff;'
                  : 'border:1px solid var(--line);background:' + (step < 0 ? '#fff' : INK_STEPS[step]) + ';'
                    + 'color:' + (step < 0 ? 'var(--faint)' : INK_TEXT[step]) + ';')
        + (isToday ? 'box-shadow:0 0 0 2px var(--card),0 0 0 3.5px var(--ink);' : '')
        + 'display:flex;align-items:center;justify-content:center;'
        + 'font-family:var(--mono);font-size:13px;font-weight:700;padding:0;';
      cells.push(h('button', {
        style: style + (future ? 'cursor:default;' : 'cursor:pointer;'),
        disabled: future,
        'aria-label': (day.getMonth() + 1) + '月' + day.getDate() + '日'
          + (count ? 'の記録を見る' : '（記録なし）'),
        onclick: future ? null : onPick.bind(null, date)
      }, [count ? String(count) : '']));
      labels.push(h('div', { style: 'flex:1;text-align:center', text: WEEKDAYS[i] }));
    }

    return h('div', { style: 'padding:0 18px 14px;display:flex;flex-direction:column;gap:7px' }, [
      h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between' }, [
        h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '今週の実績' }),
        h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--body)',
          text: '今週 ' + thisWeek + '日 ・ 先週 ' + prevWeek + '日' })
      ]),
      h('div', { style: 'display:flex;gap:5px' }, cells),
      h('div', { style: 'display:flex;gap:5px;font-family:var(--mono);font-size:10px;color:var(--faint)' }, labels),
      h('div', { style: 'font-size:11px;color:var(--faint)', text: '数字は記録の件数。押すとその日を開きます。' })
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

  function amountCard(today, facts, settings) {
    var companion = settings.companion;
    var sessions = today.sessions || [];
    var items = sessions.reduce(function (n, s) { return n + s.items.length; }, 0);
    var seconds = sessions.reduce(function (n, s) {
      return n + s.items.reduce(function (m, i) { return m + (i.unit === 'sec' ? i.sets * i.seconds : 0); }, 0);
    }, 0);
    var minutes = Math.round(seconds / 60);
    var times = sessions.map(function (s) { return s.performed_time; }).filter(Boolean).sort();
    var span = times.length > 1 ? times[0] + ' - ' + times[times.length - 1] : (times[0] || '');
    var has = sessions.length > 0;

    var videos = sessions.filter(function (s) { return !!s.video_url; }).length;

    /* Only what the day holds, and a zero is never written: a day spent on one
     * video used to read 0種目, which told someone who had just trained that
     * they had done nothing. */
    var figure = function (count, unit) {
      return h('div', { style: 'display:flex;align-items:baseline;gap:2px' }, [
        h('span', { style: 'font-family:var(--mono);font-size:28px;font-weight:800;color:var(--ink);line-height:1.05', text: String(count) }),
        h('span', { style: 'font-size:13px;font-weight:700;color:var(--sub)', text: unit })
      ]);
    };
    var figures = [];
    [[items, '種目'], [minutes, '分'], [videos, '本の動画']].forEach(function (pair) {
      if (pair[0] <= 0) return;
      if (figures.length) figures.push(h('div', { style: 'width:1px;height:18px;background:var(--line)' }));
      figures.push(figure(pair[0], pair[1]));
    });

    return h('div', { style: 'padding:0 18px 14px;display:flex;flex-direction:column;gap:8px' }, [
      h('div', { style: 'font-size:13px;color:var(--body);line-height:1.5;min-height:20px', text: greetingLine(facts, settings.nickname) }),
      h('div', {
        style: 'border:1px solid var(--line);border-radius:16px;background:#fff;padding:14px;'
          + 'display:flex;gap:14px;align-items:flex-start'
      }, [
        companionBox(companion),
        h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em',
            text: has ? 'きょう動いた分' : 'きょうはこれから' }),
          has ? h('div', { style: 'display:flex;align-items:baseline;gap:8px;flex-wrap:wrap' }, figures) : null,
          h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)',
            text: has ? sessions.length + '件' + (span ? ' ／ ' + span : '') : '' }),
          has ? null : h('div', { style: 'font-size:12px;color:var(--sub)', text: '下のボタンから記録できます。' })
        ])
      ])
    ]);
  }

  function thumb(videoUrl) {
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
    var box = 'width:120px;height:68px;border-radius:8px;background:#e9eef5;border:1px solid var(--line);'
      + 'overflow:hidden;flex:none;position:relative;display:flex;align-items:center;justify-content:center;';
    if (!url) return h('div', { style: box }, inner);
    /* The thumbnail itself is the way to the video - there is no full-width
       row for it (settled decision, spec 17.15). */
    return h('a', { href: videoUrl, target: '_blank', rel: 'noopener noreferrer',
      style: box + 'cursor:pointer', title: 'YouTubeで動画をひらく' }, inner);
  }

  function sessionRow(session, first, open, toggle) {
    var detail = [];
    if (open) {
      detail.push(h('div', {
        style: 'display:flex;flex-direction:column;gap:3px;border-left:2px solid var(--line);'
          + 'padding:2px 0 2px 10px;margin-top:2px'
      }, session.items.map(function (item) {
        return h('div', { style: 'display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--body)' }, [
          h('span', { text: item.name }),
          h('span', { style: 'font-family:var(--mono);color:var(--sub)',
            text: item.sets + '×' + (item.unit === 'sec' ? item.seconds + '秒' : item.reps + '回') })
        ]);
      })));
    }

    var name = session.menu_name
      || (session.items.length === 1 ? session.items[0].name : '種目 ' + session.items.length + '件');
    /* "すべて" is a claim about this record against the menu it came from, so
     * it is only said when the menu is still here and the counts agree.  Saying
     * it for a partly-done menu would be a small lie in the one place the
     * owner looks to check what actually happened. */
    var sub;
    if (session.session_kind === 'manual') {
      sub = '手で選んだ記録';
    } else {
      var source = menuOf(session.menu_id);
      if (!session.items.length) {
        sub = session.video_url ? '動画だけ' : '記録のみ';
      } else {
        sub = session.items.length + '種目'
          + (!source ? '' : session.items.length < source.items.length ? '（一部）' : 'すべて');
      }
    }

    var body = [
      h('div', { style: 'font-size:14px;font-weight:800;color:var(--ink);line-height:1.25;' + TWO_LINES, text: name }),
      h('div', { style: 'font-size:11px;color:var(--sub)', text: sub })
    ];
    detail.forEach(function (d) { body.push(d); });
    if (session.items.length) body.push(h('button', {
      style: 'border:0;background:none;padding:0;text-align:left;font-size:12px;font-weight:700;'
        + 'color:var(--deep);text-decoration:underline;cursor:pointer;min-height:34px;'
        + (open ? 'margin-top:2px;' : ''),
      onclick: toggle
    }, [open ? 'とじる' : '種目を見る']));

    var right = [h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, body)];
    if (session.video_url) right.push(thumb(session.video_url));

    return h('div', {
      style: 'padding:11px 0;' + (first ? '' : 'border-top:1px solid var(--line2);')
        + 'display:flex;gap:12px;align-items:flex-start'
    }, [
      h('div', { style: 'font-family:var(--mono);font-size:14px;font-weight:700;color:var(--ink);'
        + 'flex:none;width:44px;padding-top:1px', text: session.performed_time || '' }),
      h('div', { style: 'flex:1;min-width:0;display:flex;gap:12px;align-items:flex-start' }, right)
    ]);
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
    return h('a', { href: videoUrl, target: '_blank', rel: 'noopener noreferrer',
      style: box + 'cursor:pointer', title: 'YouTubeで動画をひらく' }, inner);
  }

  function menuShape(menu) {
    var first = menu.items[0];
    if (!first) return menu.video_url ? '動画だけ' : '種目なし';
    var amount = first.sets + 'セット×' + (first.unit === 'sec' ? first.seconds + '秒' : first.reps + '回');
    return menu.items.length + '種目 ・ ' + amount + (menu.items.length > 1 ? ' ほか' : '');
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

  function menuRow(menu, first, date, onDone, onPart) {
    return h('div', {
      style: 'display:flex;flex-direction:column;gap:10px;padding:12px 0;'
        + (first ? '' : 'border-top:1px solid var(--line2);')
    }, [
      h('div', { style: 'display:flex;gap:12px;align-items:flex-start' }, [
        h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px' }, [
          h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink);line-height:1.3;' + TWO_LINES,
                text: menu.name }),
          h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--sub)', text: menuShape(menu) })
        ]),
        menuThumb(menu.video_url)
      ]),
      h('div', { style: 'display:flex;gap:8px' }, [
        h('button', {
          style: 'flex:1;border:0;background:var(--deep);color:#fff;font-family:inherit;font-size:14px;'
            + 'font-weight:800;border-radius:13px;min-height:44px;box-shadow:var(--shadow-action);cursor:pointer',
          onclick: onDone
        }, ['完了を記録']),
        menu.items.length ? h('button', {
          style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
            + 'font-size:13px;font-weight:700;border-radius:13px;min-height:44px;padding:0 14px;cursor:pointer',
          onclick: onPart
        }, ['一部だけ']) : null
      ])
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
          style: 'font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:2px',
          text: '定義 ' + amountLabel(source.unit, source.sets, source.reps, source.seconds)
            + ' → ' + amountLabel(source.unit, item.sets, source.reps, source.seconds)
        }));
      }

      var right;
      if (item.include) {
        right = h('div', { style: 'display:flex;align-items:center;gap:6px;flex:none' }, [
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:#fff;'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを減らす',
            onclick: function () { if (item.sets > 1) { item.sets -= 1; draw(); } } }, ['−']),
          h('div', { style: 'font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);'
            + 'min-width:56px;text-align:center',
            text: amountLabel(source.unit, item.sets, source.reps, source.seconds) }),
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:#fff;'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを増やす',
            onclick: function () { if (item.sets < 99) { item.sets += 1; draw(); } } }, ['＋'])
        ]);
      } else {
        right = h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--faint);flex:none',
          text: amountLabel(source.unit, source.sets, source.reps, source.seconds) });
      }

      return h('div', {
        style: 'display:flex;gap:12px;align-items:center;border-radius:14px;padding:11px 12px;'
          + (item.include ? 'border:1.5px solid var(--ink);background:#fff'
                          : 'border:1px solid var(--line);background:#fafbfd')
      }, [
        h('button', {
          style: 'width:24px;height:24px;border-radius:7px;flex:none;padding:0;cursor:pointer;'
            + 'display:flex;align-items:center;justify-content:center;font-size:13px;'
            + (item.include ? 'background:var(--ink);color:#fff;border:0'
                            : 'border:1.5px solid var(--faint);background:#fff'),
          'aria-label': source.name + (item.include ? ' を外す' : ' を選ぶ'),
          onclick: function () { item.include = !item.include; draw(); }
        }, [item.include ? '✓' : '']),
        h('div', { style: 'flex:1;min-width:0' }, left),
        right
      ]);
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onBack }, ['戻る']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: menu.name }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:12px 16px;border-bottom:1px solid var(--line2);background:#fafbfd' }, [
        h('div', { style: 'font-size:12px;color:var(--sub);line-height:1.55',
          text: 'やった種目だけ選びます。メニューそのものは変わりません。' })
      ]),
      h('div', { style: 'flex:1;display:flex;flex-direction:column;padding-bottom:16px' }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px' }, [
          h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--sub)',
            text: chosen.length + ' / ' + draft.items.length + ' 選択' }),
          h('div', { style: 'display:flex;gap:8px' }, [
            h('button', { style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
              + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:36px;'
              + 'padding:0 10px;cursor:pointer',
              onclick: function () { draft.items.forEach(function (i) { i.include = true; }); draw(); } }, ['すべて']),
            h('button', { style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
              + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:10px;min-height:36px;'
              + 'padding:0 10px;cursor:pointer',
              onclick: function () { draft.items.forEach(function (i) { i.include = false; }); draw(); } }, ['すべて外す'])
          ])
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px;padding:0 16px' }, rows)
      ]),
      problem ? warnBar(problem, null, null) : null,
      h('div', {
        style: 'border-top:1px solid var(--line);padding:12px 16px 22px;display:flex;'
          + 'flex-direction:column;gap:10px;background:#fff'
      }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
          h('div', { style: 'font-size:12px;color:var(--sub)', text: '実施時刻' }),
          h('label', { style: 'display:flex;align-items:center;gap:8px;border:1px solid var(--line);'
            + 'border-radius:10px;padding:8px 12px;min-height:40px;cursor:pointer' }, [
            h('input', { type: 'time', value: draft.time,
              style: 'font-family:var(--mono);font-size:14px;font-weight:700;color:var(--ink);'
                + 'border:0;background:none;padding:0;font-family:var(--mono)',
              onchange: function () { draft.time = this.value; } })
          ])
        ]),
        h('button', {
          style: 'border:0;background:var(--deep);color:#fff;font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);'
            + 'cursor:pointer;opacity:' + (chosen.length ? '1' : '.45'),
          disabled: chosen.length === 0,
          onclick: function () { savePartial(draft, menu); }
        }, ['選んだ' + chosen.length + '種目を記録'])
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
        h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)',
          text: day.sessions.length + '件 ・ ' + items + '種目' })
      ]));
      day.sessions.forEach(function (session) {
        groups.push(h('button', {
          style: 'padding:11px 0;border-top:1px solid var(--line2);display:flex;gap:12px;'
            + 'align-items:flex-start;width:100%;background:none;border-left:0;border-right:0;'
            + 'border-bottom:0;text-align:left;font-family:inherit;cursor:pointer',
          onclick: onPick.bind(null, session.session_id, day.date)
        }, [
          h('div', { style: 'font-family:var(--mono);font-size:14px;font-weight:700;color:var(--ink);'
            + 'flex:none;width:44px;padding-top:1px', text: session.performed_time || '' }),
          h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px' }, [
            h('div', { style: 'font-size:14px;font-weight:800;color:var(--ink);line-height:1.25;' + TWO_LINES,
              text: session.menu_name || '種目 ' + session.item_count + '件' }),
            h('div', { style: 'font-size:11px;color:var(--sub)',
              text: session.session_kind === 'manual' ? '手で選んだ記録'
                : session.item_count ? session.item_count + '種目'
                : session.video_url ? '動画だけ' : '記録のみ' })
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
        h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--body)',
          text: history.start + ' → ' + history.end }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:12px;font-weight:700;'
          + 'color:var(--deep);text-decoration:underline;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
          onclick: onMore }, [days + '日前へ'])
      ]),
      h('div', { style: 'padding:0 18px 18px;display:flex;flex-direction:column' }, groups)
    ]);
  }

  /* ---- 2b-2: correcting one record ---- */

  function binIcon(w, hgt) {
    return h('span', {
      style: 'width:' + w + 'px;height:' + hgt + 'px;border:1.5px solid var(--sub);border-top:0;'
        + 'border-radius:0 0 3px 3px;position:relative;display:inline-block'
    }, [h('span', { style: 'position:absolute;left:-2.5px;right:-2.5px;top:-4px;height:1.5px;'
      + 'background:var(--sub);display:block' })]);
  }

  function numberBox(value, unitLabel, onChange) {
    return h('div', {
      style: 'border:1px solid var(--line);border-radius:9px;padding:7px 9px;min-height:36px;'
        + 'display:flex;align-items:center;gap:3px;background:#fff'
    }, [
      h('input', {
        type: 'number', value: String(value), min: '1', inputmode: 'numeric',
        style: 'font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);'
          + 'border:0;background:none;padding:0;width:' + (String(value).length + 1.5) + 'ch;'
          + 'text-align:right;-moz-appearance:textfield',
        onchange: function () { onChange(parseInt(this.value, 10)); }
      }),
      h('span', { style: 'font-size:11px;color:var(--sub)', text: unitLabel })
    ]);
  }

  function fieldRow(label, valueText, warn, onOpen, hint) {
    return h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
      h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: label }),
      h('label', {
        style: 'display:flex;align-items:center;justify-content:space-between;border-radius:12px;'
          + 'padding:11px 12px;min-height:46px;background:#fff;cursor:pointer;'
          + (warn ? 'border:1.5px solid var(--warnInk)' : 'border:1px solid var(--line)')
      }, [onOpen, h('span', { style: 'font-size:12px;color:var(--sub)', text: '変更' })]),
      hint ? h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6', text: hint }) : null
    ]);
  }

  function editScreen(edit, onCancel) {
    var rows = edit.items.map(function (item, index) {
      return h('div', {
        style: 'display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line2);'
          + (index === edit.items.length - 1 ? 'border-bottom:1px solid var(--line2);' : '')
      }, [
        h('div', { style: 'flex:1;min-width:0;font-size:14px;font-weight:700;color:var(--ink)', text: item.name }),
        h('div', { style: 'display:flex;align-items:center;gap:6px;flex:none' }, [
          numberBox(item.sets, 'セット', function (v) { item.sets = v; }),
          h('div', { style: 'font-size:12px;color:var(--faint)', text: '×' }),
          item.unit === 'sec'
            ? numberBox(item.seconds, '秒', function (v) { item.seconds = v; })
            : numberBox(item.reps, '回', function (v) { item.reps = v; })
        ]),
        h('button', {
          style: 'width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:9px;'
            + 'display:flex;align-items:center;justify-content:center;background:#fff;cursor:pointer;padding:0',
          'aria-label': item.name + ' をこの記録から外す',
          onclick: function () {
            if (edit.items.length === 1) {
              problem = '1件以上の種目を指定してください';
            } else {
              edit.items.splice(index, 1);
            }
            draw();
          }
        }, [binIcon(11, 13)])
      ]);
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)', text: '記録を修正' }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--deep);'
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
            style: 'font-family:var(--mono);font-size:15px;font-weight:700;color:var(--ink);'
              + 'border:0;background:none;padding:0',
            onchange: function () { edit.date = this.value; } }),
          '別の日へ移せます。手で選んだ記録は1日に1つまでです。'),
        fieldRow('実施時刻', edit.time, false,
          h('input', { type: 'time', value: edit.time || '',
            style: 'font-family:var(--mono);font-size:15px;font-weight:700;color:var(--ink);'
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
                style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
                  + 'font-family:inherit;font-size:12px;font-weight:700;border-radius:11px;'
                  + 'min-height:38px;padding:0 12px;cursor:pointer',
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
              + 'background:#fff;font-size:13px;color:var(--body);line-height:1.6;font-family:inherit;'
              + 'width:100%;resize:vertical',
            onchange: function () { edit.note = this.value; }
          }, [edit.note || ''])
        ]),
        h('div', { style: 'border-top:1px solid var(--line);padding-top:14px;display:flex;'
          + 'flex-direction:column;gap:8px' }, [
          h('button', {
            style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
              + 'font-size:14px;font-weight:700;border-radius:13px;min-height:46px;cursor:pointer;'
              + 'display:flex;align-items:center;justify-content:center;gap:8px',
            onclick: function () { removeRecord(edit); }
          }, [binIcon(12, 14), 'この記録を削除']),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: '削除は確認ダイアログを出してから実行します。' })
        ])
      ])
    ]);
  }

  /* The history list carries no exercises, so the day is read again to get
   * them - and that read is what the editor is filled from, not the list. */
  async function openEdit(sessionId, date) {
    problem = null;
    try {
      var day = await api.get('/api/today?date=' + date);
      var session = day.sessions.filter(function (s) { return s.session_id === sessionId; })[0];
      if (!session) { problem = 'この記録は見つかりませんでした。'; draw(); return; }
      state.edit = {
        session_id: session.session_id,
        date: date,
        time: session.performed_time || '',
        note: session.note || '',
        items: session.items.map(function (i) {
          return { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps,
            seconds: i.seconds, unit: i.unit };
        })
      };
      state.screen = { name: 'edit' };
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
    var counted = h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--faint);'
      + 'text-align:center;padding-bottom:14px', text: (draft.step + 1) + ' / ' + SETUP_STEPS });

    var head = function (title, note) {
      return h('div', { style: 'padding:22px 20px 0' }, [
        h('div', { style: 'width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 18px' }),
        counted,
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.3', text: title }),
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.75;padding-top:10px', text: note })
      ]);
    };

    var body;
    if (draft.step === 0) {
      var line = function (text) {
        return h('div', { style: 'display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);'
          + 'border-radius:12px;padding:12px;background:#fff' }, [
          h('div', { style: 'width:6px;height:6px;border-radius:3px;background:var(--ink);margin-top:7px;flex:none' }),
          h('div', { style: 'flex:1;font-size:13px;color:var(--body);line-height:1.6', text: text })
        ]);
      };
      body = [
        head('お家トレへようこそ', '家でやったトレーニングを、その場で残しておくための記録帳です。'),
        h('div', { style: 'padding:16px 20px 0;display:flex;flex-direction:column;gap:8px' }, [
          line('記録はこの端末の中だけにあります。どこにも送られません。'),
          line('点数をつけません。順位もつけません。続いた日数も数えません。'),
          line('はじめに三つだけうかがいます。どれも飛ばせますし、あとから設定で変えられます。')
        ])
      ];
    } else if (draft.step === 1) {
      var counter = h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)',
        text: Array.from(draft.nickname).length + ' / 12' });
      body = [
        head('なんとお呼びしましょう',
          'アプリを開いたときのあいさつで一度だけ呼びます。そのあとは呼びません。空のままでもかまいません。'),
        h('div', { style: 'padding:18px 20px 0' }, [
          h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
            h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between' }, [
              h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: '呼び名（任意）' }),
              counter
            ]),
            h('input', { type: 'text', value: draft.nickname, maxlength: '12', style: FIELD,
              placeholder: '呼ばれたい名前', autocomplete: 'nickname',
              oninput: function () {
                onName(this.value);
                counter.textContent = Array.from(this.value).length + ' / 12';
              } })
          ])
        ])
      ];
    } else {
      body = [
        head('相棒をひとつ', COMPANION_NOTE),
        h('div', { style: 'padding:16px 20px 0;display:flex;flex-direction:column;gap:12px' },
          companionChoices(draft.companion, onChoose))
      ];
    }

    var last = draft.step === SETUP_STEPS - 1;
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;background:#fff' },
      body.concat([
        h('div', { style: 'flex:1;min-height:18px' }),
        h('div', { style: 'padding:12px 20px 26px;display:flex;flex-direction:column;gap:8px;background:#fff' }, [
          h('button', { style: 'border:0;background:var(--deep);color:#fff;font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);cursor:pointer',
            onclick: onNext }, [last ? 'はじめる' : '次へ']),
          h('button', { style: 'border:0;background:none;color:var(--sub);font-family:inherit;font-size:13px;'
            + 'font-weight:700;min-height:44px;cursor:pointer', onclick: onSkip }, ['あとで'])
        ])
      ]));
  }

  /* ---- 1f: choosing a companion ---- */

  var COMPANIONS = [
    ['capybara', 'カピバラ'], ['penguin', 'ペンギン'], ['sloth', 'ナマケモノ'],
    ['tortoise', 'リクガメ'], ['owl', 'フクロウ'], ['seal', 'アザラシ'],
    ['goat', 'ヤギ'], ['tanuki', 'タヌキ'], ['otter', 'カワウソ'], ['alpaca', 'アルパカ']
  ];

  var COMPANION_NOTE = 'ホームの「きょう動いた分」のところに小さく出ます。トレーニングをそっと見守ります。'
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
            h('div', { style: 'font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:2px', text: '既定' })
          ]),
          h('div', { style: 'width:22px;height:22px;border-radius:11px;flex:none;display:flex;'
            + 'align-items:center;justify-content:center;font-size:12px;'
            + (chosen ? 'border:1.5px solid var(--faint);' : 'background:var(--ink);color:#fff;') },
            [chosen ? '' : '✓'])
        ]),
        h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' },
          COMPANIONS.map(function (c) {
            var on = chosen === c[0];
            return h('button', {
              style: 'border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;'
                + 'align-items:center;background:#fff;font-family:inherit;cursor:pointer;'
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
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;background:#fff;'
        + 'display:flex;flex-direction:column;gap:8px' }, [
        h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
          h('div', { style: 'width:22px;height:22px;border-radius:6px;flex:none;display:flex;'
            + 'align-items:center;justify-content:center;font-size:12px;'
            + (name ? 'background:var(--ink);color:#fff;' : 'border:1.5px solid var(--faint);') },
            [name ? '✓' : '']),
          h('div', { style: 'font-size:13px;color:var(--body);flex:1',
            text: name ? '選んでいます' : '選んでいません' }),
          name ? h('button', { style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
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
    var counter = h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)',
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
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub)', text: '呼び名（任意）' }),
            counter
          ]),
          field
        ])
      ]),
      h('div', { style: 'flex:1' }),
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;background:#fff;'
        + 'display:flex;gap:10px' }, [
        h('button', { style: 'flex:1;border:1px solid var(--line);background:#fff;color:var(--body);'
          + 'font-family:inherit;font-size:14px;font-weight:700;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(''); } }, ['呼ばない']),
        h('button', { style: 'flex:2;border:0;background:var(--ink);color:#fff;font-family:inherit;'
          + 'font-size:14px;font-weight:800;border-radius:12px;min-height:46px;cursor:pointer',
          onclick: function () { onSave(draft.value); } }, ['この名前にする'])
      ])
    ]);
  }

  /* ---- 1g: keeping the records ---- */

  function exportScreen(settings, sessionCount, onBack, onA2hs) {
    var fileRow = function (label, value) {
      return h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
        h('div', { style: 'font-size:12px;color:var(--sub)', text: label }),
        h('div', { style: 'font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink)', text: value })
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
            text: 'Safari は7日間使わないと記録を消します。ホーム画面に追加したものは消えません。' }),
          h('button', { style: 'border:1px solid var(--warnInk);background:#fff;color:var(--warnInk);'
            + 'font-family:inherit;font-size:13px;font-weight:800;border-radius:12px;min-height:44px;cursor:pointer',
            onclick: onA2hs }, ['手順を見る'])
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '書き出す' }),
          h('div', { style: 'border:1px solid var(--line);border-radius:16px;padding:14px;'
            + 'display:flex;flex-direction:column;gap:10px' }, [
            h('div', { style: 'font-size:12px;color:var(--body);line-height:1.6',
              text: 'メニューと記録をまとめて1つの JSON ファイルにします。機種変更のときは、このファイルを新しい端末で読み込みます。' }),
            h('div', { style: 'border-top:1px solid var(--line2);padding-top:10px' },
              [fileRow('前回の書き出し', settings.last_export || 'まだありません')]),
            fileRow('記録の件数', sessionCount + '件'),
            h('button', { style: 'border:0;background:var(--deep);color:#fff;font-family:inherit;'
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
                text: 'いまこの端末にある記録は、読み込んだ内容に置き換わります。' })
            ]),
            h('label', { style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
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
            types: [{ description: 'お家トレの記録', accept: { 'application/json': ['.json'] } }]
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
    if (!window.confirm('いまこの端末にある記録は、読み込んだ内容に置き換わります。続けますか。')) return;
    problem = null;
    try {
      var text = await file.text();
      await api.importDocument(JSON.parse(text));
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

  function settingsScreen(onBack, go) {
    var row = function (label, hint, target) {
      return h('button', {
        style: 'display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:14px;'
          + 'padding:14px;background:#fff;width:100%;font-family:inherit;text-align:left;cursor:pointer',
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
        row('記録を残す', '書き出し／読み込み。機種変更のときはここから。', 'export'),
        row('ホーム画面に追加', '記録が消えないための手順をもう一度見ます。', 'a2hs'),
        row('種目の一覧', '名前や標準のセット数を直す。使っていない種目を消す。', 'library')
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
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:#fff;'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを減らす',
            onclick: function () { if (item.sets > 1) { item.sets -= 1; draw(); } } }, ['−']),
          h('div', { style: 'font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);'
            + 'min-width:56px;text-align:center',
            text: amountLabel(item.unit, item.sets, item.reps, item.seconds) }),
          h('button', { style: 'width:44px;height:44px;border:1px solid var(--line);background:#fff;'
            + 'border-radius:9px;font-size:15px;color:var(--body);font-family:inherit;cursor:pointer',
            'aria-label': 'セットを増やす',
            onclick: function () { if (item.sets < 99) { item.sets += 1; draw(); } } }, ['＋'])
        ]),
        h('button', {
          style: 'width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:9px;'
            + 'display:flex;align-items:center;justify-content:center;background:#fff;cursor:pointer;padding:0',
          'aria-label': item.name + ' を外す',
          onclick: function () { pick.items.splice(index, 1); draw(); }
        }, [binIcon(11, 13)])
      ]);
    });

    var often = library.filter(function (e) {
      return !pick.items.some(function (i) { return i.name === e.name; });
    }).slice(0, pick.showAll ? library.length : 4);

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)',
          text: '種目を選んで記録' }),
        h('div', { style: 'width:34px' })
      ]),
      h('div', { style: 'padding:11px 18px;border-bottom:1px solid var(--line2);background:#fafbfd' }, [
        h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--body)', text: longLabel(pick.date) })
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
                + 'min-height:46px;font-family:inherit;font-size:14px;color:var(--ink);background:#fff',
              oninput: function () { pick.typed = this.value; },
              onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addTyped(pick); } } }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
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
                h('div', { style: 'font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:2px',
                  text: '標準 ' + amountLabel(e.unit, e.sets, e.reps, e.seconds) + ' ・ 記録 ' + e.use_count + '件' })
              ]),
              h('button', { style: 'border:1px solid var(--line);background:#fff;color:var(--body);'
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
              + 'font-size:12px;font-weight:700;color:var(--deep);text-decoration:underline;'
              + 'font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px',
              onclick: function () { pick.showAll = true; draw(); } }, ['一覧をすべて見る'])
          ] : []))
        ])
      ]),
      problem ? warnBar(problem, null, null) : null,
      h('div', { style: 'border-top:1px solid var(--line);padding:12px 16px 22px;display:flex;'
        + 'flex-direction:column;gap:10px;background:#fff' }, [
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
          h('div', { style: 'font-size:12px;color:var(--sub)', text: '実施時刻' }),
          h('label', { style: 'display:flex;align-items:center;gap:8px;border:1px solid var(--line);'
            + 'border-radius:10px;padding:8px 12px;min-height:40px;cursor:pointer' }, [
            h('input', { type: 'time', value: pick.time,
              style: 'font-family:var(--mono);font-size:14px;font-weight:700;color:var(--ink);'
                + 'border:0;background:none;padding:0',
              onchange: function () { pick.time = this.value; } })
          ])
        ]),
        h('button', {
          style: 'border:0;background:var(--deep);color:#fff;font-family:inherit;font-size:15px;'
            + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);'
            + 'cursor:pointer;opacity:' + (pick.items.length ? '1' : '.45'),
          disabled: pick.items.length === 0,
          onclick: function () { saveManual(pick); }
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

  function openManual(date) {
    problem = null;
    state.pick = {
      date: date,
      time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()),
      items: [], typed: '', showAll: false
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
      state.screen = { name: 'home' };
    } catch (error) {
      problem = error && error.note ? error.note : '記録できませんでした。';
    }
    draw();
  }

  /* ---- 1c: the add-to-home sheet ---- */

  function a2hsScreen(onClose) {
    var step = function (n, text, mark) {
      return h('div', { style: 'display:flex;align-items:center;gap:12px;border:1px solid var(--line);'
        + 'border-radius:12px;padding:12px;background:#fff' }, [
        h('div', { style: 'width:22px;height:22px;border-radius:6px;background:var(--ink);color:#fff;'
          + 'font-family:var(--mono);font-size:12px;font-weight:700;display:flex;align-items:center;'
          + 'justify-content:center;flex:none', text: String(n) }),
        h('div', { style: 'flex:1;font-size:13px;color:var(--body);line-height:1.5', text: text }),
        h('div', { style: 'width:30px;height:30px;border:1px solid var(--line);border-radius:8px;'
          + 'display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sub);'
          + 'flex:none', text: mark })
      ]);
    };
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;background:#fff' }, [
      h('div', { style: 'padding:22px 20px 8px' }, [
        h('div', { style: 'width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 18px' }),
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.3',
          text: 'ホーム画面に追加してください' })
      ]),
      h('div', { style: 'padding:10px 20px 0' }, [
        h('div', { style: 'font-size:13px;color:var(--body);line-height:1.75',
          text: 'iPhone の Safari は、7日間使わないとブラウザに保存した記録を消します。ホーム画面に追加したものは消えません。記録はこの端末の中だけにあります。' })
      ]),
      h('div', { style: 'padding:16px 20px;display:flex;flex-direction:column;gap:8px' }, [
        step(1, '画面下の 共有 ボタンを押す', '↑'),
        step(2, 'ホーム画面に追加 を選ぶ', '＋'),
        step(3, '右上の 追加 を押す', '')
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
        h('button', { style: 'border:0;background:var(--deep);color:#fff;font-family:inherit;font-size:15px;'
          + 'font-weight:800;border-radius:16px;min-height:50px;box-shadow:var(--shadow-action);cursor:pointer',
          onclick: onClose }, ['追加しました']),
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
        counter ? h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)', text: counter }) : null
      ]),
      child
    ]);
  }

  var FIELD = 'border:1px solid var(--line);border-radius:12px;padding:11px 12px;min-height:46px;'
    + 'background:#fff;font-family:inherit;font-size:14px;color:var(--ink);width:100%';

  /* What sits under the name field. Three ways this goes, and Design drew all
   * of them: the title is on its way, it could not be had, or it arrived and
   * is offered back for shortening or clearing. Nothing is ever guessed into
   * the field - an empty box the owner can type into beats a wrong name. */
  function titleState(edit) {
    if (edit.looking) {
      return h('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:-10px;'
        + 'font-size:13px;color:var(--sub)' }, [
        h('div', { style: 'width:14px;height:14px;border:2px solid var(--line);'
          + 'border-top-color:var(--sub);border-radius:8px;flex:none' }),
        h('div', { text: '題名を取っています' })
      ]);
    }
    if (edit.lookFailed && !edit.name.trim()) {
      return h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6;margin-top:-10px',
        text: '題名は取れませんでした。欄は空のままです（誤った名前は入れません）。URL はそのまま使えます。' });
    }
    if (!edit.fromVideo || !edit.name.trim()) return null;

    var link = function (label, onTap) {
      return h('button', { style: 'border:0;background:none;padding:0;font-size:12px;font-weight:700;'
        + 'color:var(--deep);text-decoration:underline;font-family:inherit;cursor:pointer;'
        + 'min-height:44px;display:flex;align-items:center;margin:-11px 0', onclick: onTap }, [label]);
    };
    return h('div', { style: 'display:flex;flex-direction:column;gap:6px;margin-top:-10px' }, [
      h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, [
        h('div', { style: 'display:inline-flex;align-items:center;gap:5px;border:1px dashed var(--sub);'
          + 'border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;color:var(--sub)',
          text: '動画から入れた題名' }),
        link('短くする', function () {
          /* The part before the first separator is almost always the title
           * proper; what follows is the channel's own advertising. */
          var cut = edit.name.split(/[|｜【(（\[]/)[0].trim();
          edit.name = (cut || edit.name).slice(0, 100);
          draw();
        }),
        link('空にする', function () { edit.name = ''; edit.fromVideo = false; draw(); })
      ]),
      h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
        text: '直すと破線の札は消えます。自分で書いた名前として扱います。' })
    ]);
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
  function grabHandle(items, index, name) {
    var handle = h('div', {
      style: 'width:44px;height:44px;flex:none;font-size:15px;color:var(--faint);'
        + 'display:flex;align-items:center;justify-content:center;margin-left:-13px;'
        + 'touch-action:none;cursor:grab;user-select:none',
      tabindex: '0', role: 'button',
      'aria-label': name + ' を並べ替える（長押しして動かす。上下キーでも動かせます）'
    }, ['≡']);

    var move = function (to) {
      if (to < 0 || to >= items.length || to === index) return;
      items.splice(to, 0, items.splice(index, 1)[0]);
      draw();
    };

    handle.onkeydown = function (event) {
      if (event.key === 'ArrowUp') { event.preventDefault(); move(index - 1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); move(index + 1); }
    };

    handle.onpointerdown = function (event) {
      var row = handle.parentNode;
      if (!row) return;
      var height = row.getBoundingClientRect().height || 56;
      var from = event.clientY;
      var slid = 0;
      handle.setPointerCapture(event.pointerId);
      row.style.position = 'relative';
      row.style.zIndex = '2';
      handle.style.cursor = 'grabbing';

      handle.onpointermove = function (moving) {
        slid = moving.clientY - from;
        row.style.transform = 'translateY(' + slid + 'px)';
        row.style.opacity = '0.85';
      };
      var finish = function () {
        handle.onpointermove = null;
        handle.onpointerup = null;
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

  function menuEditScreen(edit, library, onCancel) {
    var rows = edit.items.map(function (item, index) {
      return h('div', { style: 'display:flex;gap:8px;align-items:center;padding:6px 0;'
        + 'border-top:1px solid var(--line2)' }, [
        grabHandle(edit.items, index, item.name),
        h('div', { style: 'flex:1;min-width:0;font-size:14px;font-weight:700;color:var(--ink)', text: item.name }),
        h('div', { style: 'display:flex;align-items:center;gap:6px;flex:none' }, [
          numberBox(item.sets, 'セット', function (v) { item.sets = v; }),
          h('div', { style: 'font-size:12px;color:var(--faint)', text: '×' }),
          item.unit === 'sec'
            ? numberBox(item.seconds, '秒', function (v) { item.seconds = v; })
            : numberBox(item.reps, '回', function (v) { item.reps = v; })
        ]),
        h('button', {
          style: 'width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:9px;'
            + 'display:flex;align-items:center;justify-content:center;background:#fff;cursor:pointer;padding:0',
          'aria-label': item.name + ' をメニューから外す',
          onclick: function () { edit.items.splice(index, 1); draw(); }
        }, [binIcon(11, 13)])
      ]);
    });

    var addable = library.filter(function (e) {
      return !edit.items.some(function (i) { return i.ex_id === e.ex_id; });
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 12px;min-height:64px;border-bottom:1px solid var(--line)' }, [
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--body);'
          + 'font-weight:700;font-family:inherit;cursor:pointer;min-height:44px;padding:0 4px', onclick: onCancel }, ['やめる']),
        h('div', { style: 'flex:1;text-align:center;font-size:14px;font-weight:800;color:var(--ink)',
          text: edit.menu_id ? 'メニューを編集' : 'メニューを作る' }),
        h('button', { style: 'border:0;background:none;padding:0;font-size:14px;color:var(--deep);'
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
        edit.menu_id ? h('button', { style: 'border:1px solid var(--warnInk);background:#fff;'
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
          text: '貼ると、下のメニュー名に動画の題名が入ります。動画を使わないメニューは、空のままで先へ進めます。' }),

        labelled('2. メニュー名', '（必須）', edit.name.length + ' / 100',
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
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;padding-bottom:6px' }, [
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '種目' }),
            h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--faint)',
              text: edit.items.length + ' / 100' })
          ])
        ].concat(rows.length ? rows : [
          h('div', { style: 'padding:10px 0;border-top:1px solid var(--line2);font-size:12px;color:var(--sub)',
            text: '種目がありません。下から足してください。' })
        ])),
        /* Typing a name has to come first: on a phone that has just installed
         * the app the library is empty, and with only "一覧から足す" there was no
         * way to put a single exercise into a menu at all. */
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
          h('div', { style: 'font-size:11px;font-weight:800;color:var(--sub)', text: '種目を足す' }),
          h('div', { style: 'display:flex;gap:8px' }, [
            h('input', { type: 'text', placeholder: '種目名を書く', value: edit.typed || '',
              style: 'flex:1;min-width:0;' + FIELD,
              oninput: function () { edit.typed = this.value; },
              onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addMenuExercise(edit); } } }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
                + 'font-size:13px;font-weight:700;border-radius:12px;min-height:46px;padding:0 14px;cursor:pointer',
              onclick: function () { addMenuExercise(edit); } }, ['足す'])
          ]),
          h('div', { style: 'display:flex;gap:8px;align-items:center' }, [
            h('div', { style: 'font-size:11px;color:var(--faint)', text: '単位' }),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);border-radius:10px;min-height:38px;padding:0 12px;'
                + 'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;'
                + (edit.newUnit === 'sec' ? 'background:#fff;color:var(--sub);' : 'background:var(--ink);color:#fff;'),
              onclick: function () { edit.newUnit = 'reps'; draw(); } }, ['回数']),
            h('button', { type: 'button',
              style: 'border:1px solid var(--line);border-radius:10px;min-height:38px;padding:0 12px;'
                + 'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;'
                + (edit.newUnit === 'sec' ? 'background:var(--ink);color:#fff;' : 'background:#fff;color:var(--sub);'),
              onclick: function () { edit.newUnit = 'sec'; draw(); } }, ['秒数'])
          ]),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: '一覧に無い名前を書くと、そのまま一覧に加わります。セット数と回数はあとから直せます。' }),
          addable.length ? h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;padding-top:2px' },
            addable.slice(0, 12).map(function (e) {
              return h('button', {
                style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
                  + 'font-size:12px;font-weight:700;border-radius:11px;min-height:38px;padding:0 12px;cursor:pointer',
                onclick: function () {
                  edit.items.push({ ex_id: e.ex_id, name: e.name, sets: e.sets, reps: e.reps,
                    seconds: e.seconds, unit: e.unit });
                  draw();
                }
              }, [e.name]);
            })) : null
        ]),
        edit.menu_id ? h('div', { style: 'border-top:1px solid var(--line);padding-top:14px;'
          + 'display:flex;flex-direction:column;gap:8px' }, [
          h('button', {
            style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
              + 'font-size:14px;font-weight:700;border-radius:13px;min-height:46px;cursor:pointer;'
              + 'display:flex;align-items:center;justify-content:center;gap:8px',
            onclick: function () { removeMenu(edit); }
          }, [binIcon(12, 14), 'このメニューを削除']),
          h('div', { style: 'font-size:11px;color:var(--faint);line-height:1.6',
            text: 'メニューを消しても、これまでの記録は残ります。' })
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
        if (info && info.title && !edit.name.trim()) {
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

  async function openMenuEdit(menuId) {
    problem = null;
    try {
      var menus = (await api.get('/api/menus')).menus;
      var menu = menus.filter(function (m) { return m.menu_id === menuId; })[0];
      if (!menu) { problem = 'メニューが見つかりません'; draw(); return; }
      state.menuEdit = {
        menu_id: menu.menu_id, revision: menu.revision, name: menu.name,
        video_url: menu.video_url || '', note: menu.note || '',
        items: menu.items.map(function (i) {
          return { ex_id: i.ex_id, name: i.name, sets: i.sets, reps: i.reps,
            seconds: i.seconds, unit: i.unit };
        })
      };
      state.screen = { name: 'menuEdit' };
    } catch (error) {
      problem = error && error.note ? error.note : 'メニューを開けませんでした。';
    }
    draw();
  }

  function newMenu() {
    problem = null;
    state.menuEdit = { menu_id: null, revision: null, name: '', video_url: '', note: '', items: [] };
    state.screen = { name: 'menuEdit' };
    draw();
  }

  async function saveMenu(edit) {
    problem = null;
    try {
      var saved = await api.post('/api/menu/save', {
        menu_id: edit.menu_id, revision: edit.revision,
        name: edit.name, video_url: edit.video_url || null, note: edit.note || null,
        items: edit.items.map(function (i) {
          return i.unit === 'sec'
            ? { ex_id: i.ex_id, sets: i.sets, seconds: i.seconds, unit: 'sec' }
            : { ex_id: i.ex_id, sets: i.sets, reps: i.reps, unit: 'reps' };
        })
      });
      edit.menu_id = saved.menu_id;
      edit.revision = saved.revision;
      state.screen = { name: 'menus' };
    } catch (error) {
      problem = error && error.note ? error.note : '保存できませんでした。';
    }
    draw();
  }

  async function removeMenu(edit) {
    if (!window.confirm('このメニューを削除します。これまでの記録は残ります。')) return;
    problem = null;
    try {
      await api.post('/api/menu/delete', { menu_id: edit.menu_id });
      state.screen = { name: 'menus' };
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
          state.usedBy ? h('div', { style: 'font-family:var(--mono);font-size:11px;margin-top:3px',
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
              h('div', { style: 'font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:3px',
                text: '記録 ' + e.use_count + '件' + (e.use_count ? '' : ' ・ 未使用') })
            ]),
            h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--sub);flex:none',
              text: amountLabel(e.unit, e.sets, e.reps, e.seconds) }),
            h('button', {
              style: 'width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:9px;'
                + 'display:flex;align-items:center;justify-content:center;background:#fff;cursor:pointer;padding:0',
              'aria-label': e.name + ' を一覧から消す',
              onclick: function () { removeExercise(e); }
            }, [binIcon(11, 13)])
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

  function menuListScreen(menus, onNew, onOpen) {
    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;flex-direction:column;gap:3px;padding:18px 18px 12px' }, [
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.1', text: 'メニュー' })
      ]),
      h('div', { style: 'flex:1;padding:0 18px 18px;display:flex;flex-direction:column;gap:2px' },
        (menus.length ? menus.map(function (menu, i) {
          return h('button', {
            style: 'display:flex;gap:12px;align-items:flex-start;padding:12px 0;width:100%;'
              + 'background:none;border:0;' + (i ? 'border-top:1px solid var(--line2);' : '')
              + 'text-align:left;font-family:inherit;cursor:pointer',
            onclick: onOpen.bind(null, menu.menu_id)
          }, [
            h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px' }, [
              h('div', { style: 'font-size:15px;font-weight:800;color:var(--ink);line-height:1.3;' + TWO_LINES,
                text: menu.name }),
              h('div', { style: 'font-family:var(--mono);font-size:11px;color:var(--sub)', text: menuShape(menu) })
            ]),
            menuThumb(menu.video_url)
          ]);
        }) : [
          h('div', { style: 'padding:22px 0;font-size:13px;color:var(--sub);line-height:1.7',
            text: 'メニューがありません。メニューは、動画のURLと種目をまとめたものです。1つ作ると、やった日に1タップで記録できます。' })
        ]).concat([
          h('button', {
            style: 'margin-top:12px;border:1px dashed var(--faint);background:transparent;color:var(--body);'
              + 'font-family:inherit;font-size:13px;font-weight:700;border-radius:13px;min-height:46px;cursor:pointer',
            onclick: onNew
          }, ['メニューを作る'])
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
  var open = {};        // session_id -> exercises shown
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
    var tabs = [['記録', 'home', '4px'], ['メニュー', 'menus', '4px'], ['設定', 'settings', '8px']];
    return h('div', { style: 'display:flex;border-top:1px solid var(--line);background:#fff' },
      tabs.map(function (tab) {
        var on = tab[1] === here;
        return h('button', {
          style: 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;'
            + 'padding:10px 0 16px;border:0;background:none;font-family:inherit;cursor:pointer',
          onclick: function () {
            problem = null;
            /* So that 戻る in the settings header goes back to the tab you
             * came from, rather than always to the first one. */
            if (tab[1] === 'settings' && here !== 'settings') state.settingsFrom = here;
            state.screen = { name: tab[1] };
            draw();
          }
        }, [
          h('div', { style: 'width:16px;height:16px;border-radius:' + tab[2] + ';'
            + (on ? 'background:var(--ink)' : 'border:1.5px solid var(--faint)') }),
          h('div', { style: 'font-size:11px;font-weight:' + (on ? '800' : '700')
            + ';color:var(--' + (on ? 'ink' : 'sub') + ')', text: tab[0] })
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

  async function finishSetup(draft) {
    try {
      await api.post('/api/settings/save', {
        nickname: draft.nickname, companion: draft.companion, setup_done: ymd(new Date())
      });
    } catch (error) { problem = error && error.note ? error.note : null; }
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
        function (slug) { draft.companion = slug; draw(); },
        function (value) { draft.nickname = value; },
        function () {
          if (draft.step < SETUP_STEPS - 1) { draft.step += 1; draw(); } else finishSetup(draft);
        },
        function () {
          if (draft.step === 0) finishSetup({ nickname: '', companion: null });
          else if (draft.step < SETUP_STEPS - 1) { draft.step += 1; draw(); }
          else finishSetup({ nickname: draft.nickname, companion: null });
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
    if (state.screen.name === 'menuEdit') {
      root.replaceChildren(menuEditScreen(state.menuEdit, libraryNow, function () {
        state.screen = { name: 'menus' };
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
        state.screen = { name: 'home' };
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
            : target === 'a2hs' ? 'a2hs' : 'library' };
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
        state.screen = { name: 'home' };
      } else {
        root.replaceChildren(partialScreen(state.draft, menu, function () {
          state.screen = { name: 'home' };
          problem = null;
          draw();
        }));
        return;
      }
    }
    var page = h('div', { style: 'display:flex;flex-direction:column;min-height:100vh' }, [
      h('div', { style: 'display:flex;flex-direction:column;gap:3px;padding:18px 18px 12px' }, [
        h('div', { style: 'font-family:var(--mono);font-size:12px;color:var(--faint)', text: longLabel(view.today.date) }),
        h('div', { style: 'font-size:19px;font-weight:800;color:var(--ink);line-height:1.1', text: 'お家トレ' })
      ]),
      weekStrip(view.today.date, view.history, view.today.calendar_this_week, view.today.calendar_prev_week,
        function (date) {
          /* "押すとその日を開きます" - the history list ending on that day, so
             the day tapped is the first one shown. */
          state.historyEnd = date;
          state.days = 30;
          state.screen = { name: 'history' };
          draw();
        }),
      amountCard(view.today, view.facts, view.settings),
      h('div', {
        style: 'flex:1;padding:14px 18px 18px;border-top:1px solid var(--line);'
          + 'display:flex;flex-direction:column;gap:18px'
      }, [
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between' }, [
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: '今日の記録' }),
            view.today.sessions.length ? h('button', {
              style: 'border:1px solid var(--line);background:#fff;color:var(--body);font-family:inherit;'
                + 'font-size:12px;font-weight:700;border-radius:10px;min-height:34px;padding:0 12px;cursor:pointer',
              /* Correcting and deleting live in one place, and that place is
                 the list a record is opened from. */
              onclick: function () {
                problem = null;
                state.historyEnd = view.today.date;
                state.days = 30;
                state.screen = { name: 'history' };
                draw();
              }
            }, ['編集']) : null
          ])
        ].concat(view.today.sessions.map(function (session, i) {
          return sessionRow(session, i === 0, !!open[session.session_id], function () {
            open[session.session_id] = !open[session.session_id];
            draw();
          });
        })).concat([
          h('button', {
            style: 'border:1px dashed var(--faint);background:transparent;color:var(--body);'
              + 'font-family:inherit;font-size:13px;font-weight:700;border-radius:13px;min-height:44px;'
              + 'cursor:pointer;margin-top:4px',
            onclick: function () { openManual(view.today.date); }
          }, ['種目を選んで記録'])
        ])),
        h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, [
          h('div', { style: 'font-size:12px;font-weight:800;color:var(--sub);letter-spacing:.04em', text: 'メニュー' })
        ].concat(view.menus.map(function (menu, i) {
          return menuRow(menu, i === 0, view.today.date,
            complete.bind(null, menu, view.today.date),
            function () {
              problem = null;
              state.draft = {
                date: view.today.date,
                time: pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()),
                items: menu.items.map(function (m) {
                  return { menu_item_id: m.menu_item_id, include: true, sets: m.sets };
                })
              };
              state.screen = { name: 'partial', menuId: menu.menu_id };
              draw();
            });
        })))
      ]),
      problem ? warnBar(problem, null, null) : null,
      installed() ? null : warnBar('ホーム画面に追加していません。記録が消えることがあります。', '手順', function () {
        state.a2hsFrom = 'home';
        state.screen = { name: 'a2hs' };
        draw();
      }),
      navBar('home')
    ]);
    root.replaceChildren(page);
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
    var again = root.querySelector('[data-field="' + held.field + '"]');
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
      root.replaceChildren(h('div', { class: 'boot' }, [error && error.note ? error.note : '画面を開けませんでした。']));
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

    /* The service worker stores index.html and the scripts by their plain
     * names, but the page asks for them with the ?v=NN that says which
     * version it wants, and a stored copy under a different address is no
     * copy at all.  So the page puts away what it is actually made of - the
     * addresses in its own tags - the moment it has finished loading.
     * Without this, someone who installs the app and goes out of signal
     * before opening it a second time finds it will not start.
     *
     * The name has to be the one sw.js uses: it throws away every other. */
    setTimeout(function () {
      if (!window.caches) return;
      var mine = ['./', './index.html', './manifest.webmanifest', './tokens.css'];
      for (var i = 0; i < document.scripts.length; i++) {
        var from = document.scripts[i].getAttribute('src');
        if (from) mine.push(from);
      }
      /* Into whichever store the service worker is keeping, found by name
       * rather than written down twice: sw.js throws away every cache but its
       * own on activation, so a copy written under a name that has moved on
       * would be swept away the next time the app updates. */
      caches.keys().then(function (names) {
        var theirs = names.filter(function (name) { return name.indexOf('ouchitore-') === 0; })[0];
        return caches.open(theirs || 'ouchitore-v2');
      }).then(function (store) {
        mine.forEach(function (one) { store.add(one).catch(function () { }); });
      }).catch(function () { });
    }, 1500);
  }
})();
