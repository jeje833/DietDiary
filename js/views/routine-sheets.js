// 루틴 만들기/수정, 루틴 메뉴, 추천 루틴 선택 시트
import { S, update, makeRoutine, statusOf, setStatus, deleteRoutine, routinesFromTemplates } from '../store.js';
import { COLORS, colorOf, SLOTS, slotOf, ROUTINE_CATS, EMOJIS, ROUTINE_TEMPLATES } from '../data/templates.js';
import { openSheet, toast, confirmBox, ICON } from '../ui.js';
import { esc, hexA, WD, todayKey, vibrate } from '../utils.js';
import { startPlayer } from '../player.js';
import { ctx } from '../ctx.js';

export function weekOrder() {
  return (S().settings.weekStart ?? 1) === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

export function daysLabel(days) {
  const set = [...days].sort().join('');
  if (days.length === 7) return '매일';
  if (set === '12345') return '평일';
  if (set === '06') return '주말';
  return weekOrder()
    .filter((d) => days.includes(d))
    .map((d) => WD[d])
    .join('·');
}

export function routineMeta(r, status) {
  const parts = [];
  if (r.time) parts.push(r.time);
  if (r.duration) parts.push(`⏱ ${r.duration}분`);
  if (status === 'skip') parts.push('오늘은 쉼');
  else if (!r.time && !r.duration) parts.push(daysLabel(r.days));
  return parts.join(' · ');
}

const DURATIONS = [0, 5, 10, 15, 20, 30, 45, 60];

export function openRoutineEditor(existing) {
  const isNew = !existing;
  const form = existing ? { ...existing, days: [...existing.days] } : makeRoutine();
  let showEmoji = false;

  const sheet = openSheet({
    title: isNew ? '새 루틴' : '루틴 수정',
    className: 'sheet-tall',
    render: () => {
      const c = colorOf(form.color);
      return `
      ${
        isNew
          ? `<p class="label">추천 루틴으로 빠르게 시작</p>
             <div class="hscroll tpl-row">${ROUTINE_TEMPLATES.map(
               (t, i) => `<button type="button" class="chip" data-action="tpl" data-i="${i}">${esc(t.emoji)} ${esc(t.title)}</button>`,
             ).join('')}</div>`
          : ''
      }
      <div class="re-top">
        <button type="button" class="emoji-pick" data-action="toggleEmoji" style="--c-soft:${hexA(c, 0.16)}" aria-label="아이콘 선택">${esc(form.emoji)}</button>
        <input class="input big" id="re-title" placeholder="루틴 이름 (예: 공복 유산소)" maxlength="30" value="${esc(form.title)}" data-input="title" data-enter="save">
      </div>
      ${
        showEmoji
          ? `<div class="emoji-grid">${EMOJIS.map((e) => `<button type="button" class="${e === form.emoji ? 'on' : ''}" data-action="emoji" data-e="${e}">${e}</button>`).join('')}</div>
             <input class="input" placeholder="다른 이모지 직접 입력" maxlength="4" data-change="emojiCustom">`
          : ''
      }
      <p class="label">색상</p>
      <div class="color-row">${Object.entries(COLORS)
        .map(([k, v]) => `<button type="button" class="color-dot ${form.color === k ? 'on' : ''}" style="--dot:${v}" data-action="color" data-c="${k}" aria-label="${k}"></button>`)
        .join('')}</div>
      <p class="label">분류</p>
      <div class="chips">${ROUTINE_CATS.map((x) => `<button type="button" class="chip ${form.cat === x.id ? 'on' : ''}" data-action="cat" data-v="${x.id}">${x.emoji} ${x.label}</button>`).join('')}</div>
      <p class="label">시간대</p>
      <div class="chips">${SLOTS.map((x) => `<button type="button" class="chip ${form.slot === x.id ? 'on' : ''}" data-action="slot" data-v="${x.id}">${x.emoji} ${x.label}</button>`).join('')}</div>
      <p class="label">반복 요일 <span class="label-sub">${daysLabel(form.days) || '선택 안 됨'}</span></p>
      <div class="days-row">${weekOrder()
        .map((d) => `<button type="button" class="day-tog ${form.days.includes(d) ? 'on' : ''} ${d === 0 ? 'sun' : ''}" data-action="day" data-d="${d}">${WD[d]}</button>`)
        .join('')}</div>
      <div class="chips sm">
        <button type="button" class="chip sm" data-action="days" data-set="all">매일</button>
        <button type="button" class="chip sm" data-action="days" data-set="weekday">평일</button>
        <button type="button" class="chip sm" data-action="days" data-set="weekend">주말</button>
      </div>
      <p class="label">타이머 <span class="label-sub">루틴 시작 시 카운트다운</span></p>
      <div class="chips">${DURATIONS.map((m) => `<button type="button" class="chip ${Number(form.duration) === m ? 'on' : ''}" data-action="dur" data-m="${m}">${m ? `${m}분` : '없음'}</button>`).join('')}</div>
      <div class="inline-field"><input class="input" type="number" inputmode="numeric" min="0" max="600" placeholder="직접 입력" value="${DURATIONS.includes(Number(form.duration)) ? '' : esc(form.duration)}" data-change="durCustom"><span>분</span></div>
      <p class="label">알림 시간 <span class="label-sub">선택 · 앱이 열려 있을 때 알려드려요</span></p>
      <div class="inline-field">
        <input class="input" type="time" value="${esc(form.time)}" data-change="time">
        ${form.time ? '<button type="button" class="chip sm" data-action="clearTime">지우기</button>' : ''}
      </div>
      <p class="label">메모</p>
      <textarea class="input" rows="2" maxlength="200" placeholder="예: 공복에 미지근한 물 300ml" data-input="memo">${esc(form.memo)}</textarea>`;
    },
    footer: () => `<button class="btn block" type="button" data-action="save">${isNew ? '루틴 추가하기' : '저장하기'}</button>`,
    actions: {
      tpl: (b) => {
        const t = ROUTINE_TEMPLATES[Number(b.dataset.i)];
        Object.assign(form, { title: t.title, emoji: t.emoji, slot: t.slot, cat: t.cat, color: t.color, duration: t.duration, time: t.time || '' });
        sheet.refresh();
      },
      title: (i) => (form.title = i.value),
      memo: (i) => (form.memo = i.value),
      toggleEmoji: () => {
        showEmoji = !showEmoji;
        sheet.refresh();
      },
      emoji: (b) => {
        form.emoji = b.dataset.e;
        showEmoji = false;
        sheet.refresh();
      },
      emojiCustom: (i) => {
        const v = i.value.trim();
        if (v) {
          form.emoji = [...v].slice(0, 2).join('');
          showEmoji = false;
          sheet.refresh();
        }
      },
      color: (b) => {
        form.color = b.dataset.c;
        sheet.refresh();
      },
      cat: (b) => {
        form.cat = b.dataset.v;
        sheet.refresh();
      },
      slot: (b) => {
        form.slot = b.dataset.v;
        sheet.refresh();
      },
      day: (b) => {
        const d = Number(b.dataset.d);
        form.days = form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d];
        sheet.refresh();
      },
      days: (b) => {
        form.days = { all: [0, 1, 2, 3, 4, 5, 6], weekday: [1, 2, 3, 4, 5], weekend: [0, 6] }[b.dataset.set];
        sheet.refresh();
      },
      dur: (b) => {
        form.duration = Number(b.dataset.m);
        sheet.refresh();
      },
      durCustom: (i) => {
        form.duration = Math.max(0, Math.min(600, Math.round(Number(i.value) || 0)));
        sheet.refresh();
      },
      time: (i) => {
        form.time = i.value;
        sheet.refresh();
      },
      clearTime: () => {
        form.time = '';
        sheet.refresh();
      },
      save: () => {
        form.title = form.title.trim();
        if (!form.title) {
          toast('루틴 이름을 입력해 주세요');
          sheet.body.querySelector('#re-title')?.focus();
          return;
        }
        if (!form.days.length) {
          toast('반복할 요일을 하나 이상 골라주세요');
          return;
        }
        update((s) => {
          if (isNew) s.routines.push(form);
          else {
            const i = s.routines.findIndex((r) => r.id === form.id);
            if (i >= 0) s.routines[i] = form;
          }
        });
        sheet.close();
        toast(isNew ? `'${form.title}' 루틴을 추가했어요` : '루틴을 수정했어요');
      },
    },
  });
}

export function routineTask(r) {
  return { id: r.id, title: r.title, emoji: r.emoji, color: colorOf(r.color), durationSec: (Number(r.duration) || 0) * 60, memo: r.memo };
}

export function playRoutines(list, title, key = ctx.date) {
  startPlayer({
    title,
    tasks: list.map(routineTask),
    onTaskDone: (t) => update((s) => setStatus(key, t.id, 'done')),
  });
}

export function openRoutineMenu(id, key = ctx.date) {
  const r = S().routines.find((x) => x.id === id);
  if (!r) return;
  const future = key > todayKey();
  const sheet = openSheet({
    title: '',
    className: 'sheet-menu',
    render: () => {
      const st = statusOf(key, id);
      const c = colorOf(r.color);
      return `
      <div class="rm-head" style="--c:${c};--c-soft:${hexA(c, 0.16)}">
        <span class="r-emoji lg">${esc(r.emoji)}</span>
        <div><h3>${esc(r.title)}</h3>
          <p>${slotOf(r.slot).emoji} ${slotOf(r.slot).label} · ${daysLabel(r.days)}${r.time ? ` · ${r.time}` : ''}${r.duration ? ` · ${r.duration}분` : ''}</p></div>
      </div>
      ${r.memo ? `<p class="rm-memo">${esc(r.memo)}</p>` : ''}
      <div class="menu-list">
        ${future ? '' : `<button type="button" class="menu-item" data-action="play">${ICON.play}<span>${r.duration ? `${r.duration}분 타이머로 시작` : '스톱워치로 시작'}</span></button>`}
        ${future ? '' : `<button type="button" class="menu-item" data-action="done">${ICON.check}<span>${st === 'done' ? '완료 취소' : '완료하기'}</span></button>`}
        ${future ? '' : `<button type="button" class="menu-item" data-action="skip"><span class="mi-emoji">😴</span><span>${st === 'skip' ? '쉬기 취소' : '오늘은 쉬기'} <small>달성률 계산에서 빠져요</small></span></button>`}
        <button type="button" class="menu-item" data-action="edit">${ICON.edit}<span>수정</span></button>
        <button type="button" class="menu-item danger" data-action="del">${ICON.trash}<span>삭제</span></button>
      </div>`;
    },
    actions: {
      play: () => {
        sheet.close();
        playRoutines([r], r.title, key);
      },
      done: () => {
        const st = statusOf(key, id);
        update((s) => setStatus(key, id, st === 'done' ? null : 'done'));
        if (st !== 'done') vibrate(30);
        sheet.close();
      },
      skip: () => {
        const st = statusOf(key, id);
        update((s) => setStatus(key, id, st === 'skip' ? null : 'skip'));
        sheet.close();
      },
      edit: () => {
        sheet.close();
        openRoutineEditor(r);
      },
      del: async () => {
        const ok = await confirmBox(`'${r.title}' 루틴을 삭제할까요?\n지난 기록은 통계에 남아요.`, { ok: '삭제', danger: true });
        if (!ok) return;
        update(() => deleteRoutine(id));
        sheet.close();
        toast('루틴을 삭제했어요');
      },
    },
  });
}

export function openTemplatePicker() {
  const existing = new Set(S().routines.filter((r) => !r.endKey).map((r) => r.title));
  const picked = new Set();
  const sheet = openSheet({
    title: '추천 루틴',
    className: 'sheet-tall',
    render: () => `
      <p class="sheet-desc">다이어트에 도움이 되는 습관이에요. 원하는 것을 골라 추가하세요.</p>
      <div class="pick-list">${ROUTINE_TEMPLATES.map((t, i) => {
        const has = existing.has(t.title);
        const c = colorOf(t.color);
        return `<button type="button" class="pick ${picked.has(i) ? 'on' : ''}" data-action="pick" data-i="${i}" ${has ? 'disabled' : ''} style="--c:${c};--c-soft:${hexA(c, 0.16)}">
          <span class="r-emoji">${t.emoji}</span>
          <span class="r-text"><b>${esc(t.title)}</b><small>${slotOf(t.slot).label}${t.duration ? ` · ${t.duration}분` : ''}${t.time ? ` · ${t.time}` : ''}${has ? ' · 이미 있어요' : ''}</small></span>
          <span class="check">${ICON.check}</span></button>`;
      }).join('')}</div>`,
    footer: () => `<button class="btn block" type="button" data-action="add" ${picked.size ? '' : 'disabled'}>${picked.size ? `${picked.size}개 추가하기` : '루틴을 골라주세요'}</button>`,
    actions: {
      pick: (b) => {
        const i = Number(b.dataset.i);
        picked.has(i) ? picked.delete(i) : picked.add(i);
        sheet.refresh();
      },
      add: () => {
        if (!picked.size) return;
        update((s) => s.routines.push(...routinesFromTemplates([...picked])));
        sheet.close();
        toast(`루틴 ${picked.size}개를 추가했어요`);
      },
    },
  });
}
