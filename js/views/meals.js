// 식단 탭: 칼로리·탄단지, 물, 끼니별 음식 기록, 식단 사진
import {
  S, update, dayMeals, mealTotals, slotTotals, calorieGoal, macroTargets, pushRecentFood, burnedOn,
} from '../store.js';
import { FOODS, FOOD_CATS } from '../data/foods.js';
import { MEAL_SLOTS, mealSlotOf } from '../data/templates.js';
import { ctx } from '../ctx.js';
import { esc, fmtDate, num, r1, uid, matchKo, addDays, fmtShort, todayKey } from '../utils.js';
import { ICON, openSheet, toast, confirmBox } from '../ui.js';
import { dateStrip } from '../components/datestrip.js';
import { ring, meter } from '../components/charts.js';
import { waterCard, waterActions } from './shared.js';
import { photoKey, putPhoto, delPhoto, compressImage, hydratePhotos, photoURL } from '../photos.js';

const POPULAR = ['쌀밥', '현미밥', '닭가슴살', '삶은 계란', '찐 고구마', '바나나', '샐러드(드레싱 제외)', '그릭요거트(무가당)', '아메리카노', '김밥', '단백질 쉐이크', '사과'];

export function guessSlot() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 10.5) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

const allFoods = () => [...S().customFoods, ...FOODS];
const foodById = (id) => allFoods().find((f) => f.id === id);

function macroRow(label, v, target, color) {
  return `<div class="macro">
    <div class="mc-top"><span><i class="mc-dot" style="background:${color}"></i>${label}</span><small><b>${Math.round(v)}</b> / ${target}g</small></div>
    ${meter(v, target, { color, over: color })}
  </div>`;
}

function lastFilledDay(key, slot) {
  for (let i = 1; i <= 14; i++) {
    const k = addDays(key, -i);
    const items = S().meals[k]?.[slot];
    if (items?.length) return k;
  }
  return null;
}

function mealSection(key, m) {
  const items = dayMeals(key)[m.id] || [];
  const tot = slotTotals(key, m.id);
  const hasPhoto = S().mealPhotos[key]?.[m.id];
  const pk = photoKey(key, m.id);
  const prev = items.length ? null : lastFilledDay(key, m.id);
  return `<section class="card meal">
    <div class="meal-head">
      <span class="meal-emoji">${m.emoji}</span>
      <div class="meal-title"><b>${m.label}</b><small>${tot.count ? `${num(tot.kcal)} kcal` : '기록 없음'}</small></div>
      <button type="button" class="icon-btn sm" data-action="photo" data-slot="${m.id}" aria-label="${m.label} 사진">${ICON.camera}</button>
      <button type="button" class="icon-btn sm primary" data-action="addFood" data-slot="${m.id}" aria-label="${m.label}에 음식 추가">${ICON.plus}</button>
    </div>
    ${hasPhoto ? `<button type="button" class="photo-box" data-action="viewPhoto" data-slot="${m.id}"><img data-photo="${pk}" alt="${m.label} 사진"></button>` : ''}
    ${
      items.length
        ? `<ul class="food-list">${items
            .map(
              (it, i) => `<li><button type="button" class="food-row" data-action="editFood" data-slot="${m.id}" data-i="${i}">
                <span class="fr-name">${esc(it.name)}<small>${esc(it.unit)}${Number(it.qty) !== 1 ? ` × ${r1(it.qty)}` : ''}</small></span>
                <span class="fr-kcal">${num(it.kcal * it.qty)}<small>kcal</small></span></button></li>`,
            )
            .join('')}</ul>`
        : `<div class="meal-empty">
            <button type="button" class="btn ghost sm" data-action="addFood" data-slot="${m.id}">${ICON.plus} 음식 추가</button>
            ${prev ? `<button type="button" class="btn ghost sm" data-action="copyMeal" data-slot="${m.id}" data-from="${prev}">${ICON.copy} ${fmtShort(prev)} 식단 불러오기</button>` : ''}
          </div>`
    }
  </section>`;
}

export function render() {
  const key = ctx.date;
  const t = mealTotals(key);
  const goal = calorieGoal();
  const mt = macroTargets(goal);
  const burn = burnedOn(key);
  const left = goal - t.kcal + burn;
  const over = t.kcal > goal + burn;
  return `
  <header class="page-head">
    <div><p class="eyebrow">${fmtDate(key)}</p><h1>식단</h1></div>
    <button type="button" class="icon-btn primary" data-action="addFood" aria-label="음식 추가">${ICON.plus}</button>
  </header>
  ${dateStrip(key, (k) => {
    const tk = mealTotals(k);
    if (!tk.count) return null;
    return { cls: tk.kcal > calorieGoal() * 1.05 ? 'over' : 'good' };
  })}
  <section class="card kcal-card">
    <div class="kc-top">
      ${ring(goal ? t.kcal / goal : 0, {
        size: 132,
        stroke: 12,
        color: over ? 'var(--kcal)' : 'var(--primary)',
        inner: `<small>섭취</small><b>${num(t.kcal)}</b><small>/ ${num(goal)} kcal</small>`,
        label: `섭취 ${num(t.kcal)}kcal, 목표 ${num(goal)}kcal`,
      })}
      <div class="kc-side">
        <div class="kc-row"><span>목표</span><b>${num(goal)}</b></div>
        <div class="kc-row"><span>음식</span><b>− ${num(t.kcal)}</b></div>
        <div class="kc-row"><span>운동</span><b>+ ${num(burn)}</b></div>
        <div class="kc-row total ${left < 0 ? 'over' : ''}"><span>${left >= 0 ? '남은 칼로리' : '초과 칼로리'}</span><b>${num(Math.abs(left))}</b></div>
      </div>
    </div>
    <div class="macros">
      ${macroRow('탄수화물', t.c, mt.c, 'var(--carb)')}
      ${macroRow('단백질', t.p, mt.p, 'var(--protein)')}
      ${macroRow('지방', t.f, mt.f, 'var(--fat)')}
    </div>
  </section>
  ${waterCard(key, { wide: true })}
  ${MEAL_SLOTS.map((m) => mealSection(key, m)).join('')}
  <p class="footnote">영양 정보는 일반적인 1회 제공량 기준 추정치예요. 정확한 값은 직접 입력으로 수정할 수 있어요.</p>`;
}

export function mount(root) {
  hydratePhotos(root);
}

/* ───────── 음식 검색/추가 시트 ───────── */

export function openFoodSearch(slot = guessSlot(), key = ctx.date) {
  const st = { q: '', cat: S().recentFoods.length ? 'recent' : 'popular', mode: 'list', food: null, qty: 1, slot, added: 0, custom: { name: '', unit: '1인분', kcal: '', c: '', p: '', f: '', save: true } };

  const list = () => {
    let foods;
    if (st.q.trim()) foods = allFoods().filter((f) => matchKo(f.name, st.q));
    else if (st.cat === 'recent') foods = S().recentFoods.map(foodById).filter(Boolean);
    else if (st.cat === 'popular') foods = POPULAR.map((n) => FOODS.find((f) => f.name === n)).filter(Boolean);
    else if (st.cat === 'mine') foods = S().customFoods;
    else if (st.cat === 'all') foods = allFoods();
    else foods = FOODS.filter((f) => f.cat === st.cat);
    return foods.slice(0, 80);
  };

  const resultsHTML = () => {
    const foods = list();
    if (!foods.length) {
      return `<div class="no-result">${st.q ? `'${esc(st.q)}' 검색 결과가 없어요` : st.cat === 'mine' ? '아직 저장한 음식이 없어요' : '목록이 비어 있어요'}
        <button type="button" class="btn secondary sm" data-action="custom">${ICON.edit} 직접 입력하기</button></div>`;
    }
    return foods
      .map(
        (f) => `<button type="button" class="food-pick" data-action="pick" data-id="${esc(f.id)}">
          <span class="fp-name">${esc(f.name)}<small>${esc(f.unit)}${f.custom ? ' · 내 음식' : ''}</small></span>
          <span class="fp-kcal">${num(f.kcal)}<small>kcal</small></span>
          <span class="fp-add">${ICON.plus}</span></button>`,
      )
      .join('');
  };

  const slotChips = () =>
    `<div class="chips slot-chips">${MEAL_SLOTS.map((m) => `<button type="button" class="chip ${st.slot === m.id ? 'on' : ''}" data-action="slot" data-v="${m.id}">${m.emoji} ${m.label}</button>`).join('')}</div>`;

  const sheet = openSheet({
    title: '음식 추가',
    className: 'sheet-tall',
    render: () => {
      if (st.mode === 'qty') {
        const f = st.food;
        const q = st.qty;
        return `
          <button type="button" class="back-link" data-action="back">${ICON.left} 목록으로</button>
          <div class="qty-food"><h3>${esc(f.name)}</h3><p>${esc(f.unit)} 기준 ${num(f.kcal)}kcal</p></div>
          <div class="qty-stepper">
            <button type="button" class="step lg" data-action="qty" data-d="-0.5" aria-label="줄이기">${ICON.minus}</button>
            <div class="qty-val"><b>${r1(q)}</b><small>${esc(f.unit)}</small></div>
            <button type="button" class="step lg" data-action="qty" data-d="0.5" aria-label="늘리기">${ICON.plus}</button>
          </div>
          <div class="chips center">${[0.5, 1, 1.5, 2, 3].map((v) => `<button type="button" class="chip sm ${q === v ? 'on' : ''}" data-action="qtySet" data-v="${v}">× ${v}</button>`).join('')}</div>
          <div class="nutri-grid">
            <div class="big"><b>${num(f.kcal * q)}</b><small>kcal</small></div>
            <div><b>${r1(f.c * q)}g</b><small>탄수화물</small></div>
            <div><b>${r1(f.p * q)}g</b><small>단백질</small></div>
            <div><b>${r1(f.f * q)}g</b><small>지방</small></div>
          </div>
          <p class="label">끼니</p>${slotChips()}`;
      }
      if (st.mode === 'custom') {
        const c = st.custom;
        return `
          <button type="button" class="back-link" data-action="back">${ICON.left} 목록으로</button>
          <p class="label">음식 이름</p>
          <input class="input" placeholder="예: 엄마표 잡채" maxlength="30" value="${esc(c.name)}" data-input="cf" data-k="name">
          <p class="label">제공량</p>
          <input class="input" placeholder="예: 1인분, 100g, 1개" maxlength="20" value="${esc(c.unit)}" data-input="cf" data-k="unit">
          <div class="grid4">
            <label><span>칼로리</span><input class="input" type="number" inputmode="decimal" min="0" placeholder="kcal" value="${esc(c.kcal)}" data-input="cf" data-k="kcal"></label>
            <label><span>탄수화물</span><input class="input" type="number" inputmode="decimal" min="0" placeholder="g" value="${esc(c.c)}" data-input="cf" data-k="c"></label>
            <label><span>단백질</span><input class="input" type="number" inputmode="decimal" min="0" placeholder="g" value="${esc(c.p)}" data-input="cf" data-k="p"></label>
            <label><span>지방</span><input class="input" type="number" inputmode="decimal" min="0" placeholder="g" value="${esc(c.f)}" data-input="cf" data-k="f"></label>
          </div>
          <label class="check-row"><input type="checkbox" ${c.save ? 'checked' : ''} data-change="cfSave"><span>'내 음식'에 저장해서 다음에도 쓰기</span></label>
          <p class="label">끼니</p>${slotChips()}`;
      }
      const cats = [
        ...(S().recentFoods.length ? [['recent', '최근']] : []),
        ['popular', '인기'],
        ['mine', '내 음식'],
        ...FOOD_CATS.map((c) => [c, c]),
      ];
      return `
        <div class="search-box">${ICON.search}<input class="input" type="search" placeholder="음식 검색 (초성도 돼요: ㄷㄱㅅㅅ)" value="${esc(st.q)}" data-input="q" enterkeyhint="search"></div>
        <div class="hscroll chips cat-chips">${cats.map(([id, label]) => `<button type="button" class="chip sm ${!st.q && st.cat === id ? 'on' : ''}" data-action="cat" data-v="${esc(id)}">${esc(label)}</button>`).join('')}</div>
        <p class="label">추가할 끼니</p>${slotChips()}
        <div class="food-results">${resultsHTML()}</div>
        <button type="button" class="btn ghost block" data-action="custom">${ICON.edit} 찾는 음식이 없나요? 직접 입력하기</button>`;
    },
    footer: () => {
      const label = mealSlotOf(st.slot).label;
      if (st.mode === 'qty') return `<button class="btn block" type="button" data-action="add">${label}에 추가 · ${num(st.food.kcal * st.qty)}kcal</button>`;
      if (st.mode === 'custom') return `<button class="btn block" type="button" data-action="addCustom">${label}에 추가</button>`;
      return `<button class="btn ${st.added ? '' : 'secondary'} block" type="button" data-action="__close">${st.added ? `완료 · ${st.added}개 추가했어요` : '닫기'}</button>`;
    },
    actions: {
      q: (i) => {
        st.q = i.value;
        sheet.body.querySelector('.food-results').innerHTML = resultsHTML();
        sheet.body.querySelectorAll('.cat-chips .chip').forEach((c) => c.classList.toggle('on', !st.q && c.dataset.v === st.cat));
      },
      cat: (b) => {
        st.cat = b.dataset.v;
        st.q = '';
        sheet.refresh();
      },
      slot: (b) => {
        st.slot = b.dataset.v;
        sheet.refresh();
      },
      pick: (b) => {
        st.food = foodById(b.dataset.id);
        if (!st.food) return;
        st.qty = 1;
        st.mode = 'qty';
        sheet.refresh({ keepScroll: false });
      },
      back: () => {
        st.mode = 'list';
        sheet.refresh({ keepScroll: false });
      },
      qty: (b) => {
        st.qty = Math.max(0.5, Math.min(20, st.qty + Number(b.dataset.d)));
        sheet.refresh();
      },
      qtySet: (b) => {
        st.qty = Number(b.dataset.v);
        sheet.refresh();
      },
      add: () => {
        const f = st.food;
        addItem(key, st.slot, f, st.qty);
        update((s) => pushRecentFood(f));
        st.added++;
        st.mode = 'list';
        toast(`${mealSlotOf(st.slot).label}에 '${f.name}' 추가`);
        sheet.refresh({ keepScroll: false });
      },
      custom: () => {
        st.custom.name = st.custom.name || st.q;
        st.mode = 'custom';
        sheet.refresh({ keepScroll: false });
      },
      cf: (i) => {
        st.custom[i.dataset.k] = i.value;
      },
      cfSave: (i) => {
        st.custom.save = i.checked;
      },
      addCustom: () => {
        const c = st.custom;
        const name = c.name.trim();
        const kcal = Number(c.kcal);
        if (!name) return toast('음식 이름을 입력해 주세요');
        if (!(kcal >= 0) || c.kcal === '') return toast('칼로리를 입력해 주세요');
        const food = { id: `c:${uid()}`, name, unit: c.unit.trim() || '1인분', kcal, c: Number(c.c) || 0, p: Number(c.p) || 0, f: Number(c.f) || 0, custom: true };
        update((s) => {
          if (c.save) s.customFoods.unshift(food);
        });
        addItem(key, st.slot, food, 1);
        if (c.save) update((s) => pushRecentFood(food));
        st.added++;
        st.custom = { name: '', unit: '1인분', kcal: '', c: '', p: '', f: '', save: true };
        st.mode = 'list';
        toast(`'${name}' 추가했어요`);
        sheet.refresh({ keepScroll: false });
      },
    },
  });
}

function addItem(key, slot, f, qty) {
  update((s) => {
    const day = (s.meals[key] ||= { breakfast: [], lunch: [], dinner: [], snack: [] });
    (day[slot] ||= []).push({ id: uid(), foodId: f.id, name: f.name, unit: f.unit, kcal: f.kcal, c: f.c, p: f.p, f: f.f, qty });
  });
}

function openFoodEdit(key, slot, idx) {
  const item = dayMeals(key)[slot]?.[idx];
  if (!item) return;
  const st = { qty: Number(item.qty) || 1, kcal: item.kcal, slot };
  const sheet = openSheet({
    title: '음식 수정',
    render: () => `
      <div class="qty-food"><h3>${esc(item.name)}</h3><p>${esc(item.unit)} 기준</p></div>
      <div class="qty-stepper">
        <button type="button" class="step lg" data-action="qty" data-d="-0.5" aria-label="줄이기">${ICON.minus}</button>
        <div class="qty-val"><b>${r1(st.qty)}</b><small>${esc(item.unit)}</small></div>
        <button type="button" class="step lg" data-action="qty" data-d="0.5" aria-label="늘리기">${ICON.plus}</button>
      </div>
      <div class="nutri-grid">
        <div class="big"><b>${num(st.kcal * st.qty)}</b><small>kcal</small></div>
        <div><b>${r1(item.c * st.qty)}g</b><small>탄수화물</small></div>
        <div><b>${r1(item.p * st.qty)}g</b><small>단백질</small></div>
        <div><b>${r1(item.f * st.qty)}g</b><small>지방</small></div>
      </div>
      <p class="label">1회 제공량 칼로리 수정</p>
      <div class="inline-field"><input class="input" type="number" inputmode="decimal" min="0" value="${esc(st.kcal)}" data-change="kcal"><span>kcal</span></div>
      <p class="label">끼니 옮기기</p>
      <div class="chips">${MEAL_SLOTS.map((m) => `<button type="button" class="chip ${st.slot === m.id ? 'on' : ''}" data-action="slot" data-v="${m.id}">${m.emoji} ${m.label}</button>`).join('')}</div>`,
    footer: () => `<div class="btn-row"><button class="btn danger-ghost" type="button" data-action="del">${ICON.trash} 삭제</button><button class="btn" type="button" data-action="save">저장</button></div>`,
    actions: {
      qty: (b) => {
        st.qty = Math.max(0.5, Math.min(20, st.qty + Number(b.dataset.d)));
        sheet.refresh();
      },
      kcal: (i) => {
        st.kcal = Math.max(0, Number(i.value) || 0);
        sheet.refresh();
      },
      slot: (b) => {
        st.slot = b.dataset.v;
        sheet.refresh();
      },
      del: () => {
        update((s) => s.meals[key][slot].splice(idx, 1));
        sheet.close();
        toast(`'${item.name}' 삭제했어요`, {
          action: '되돌리기',
          onAction: () => update((s) => s.meals[key][slot].splice(idx, 0, item)),
        });
      },
      save: () => {
        update((s) => {
          const arr = s.meals[key][slot];
          const it = { ...arr[idx], qty: st.qty, kcal: st.kcal };
          if (st.slot === slot) arr[idx] = it;
          else {
            arr.splice(idx, 1);
            (s.meals[key][st.slot] ||= []).push(it);
          }
        });
        sheet.close();
      },
    },
  });
}

/* ───────── 사진 ───────── */

function pickPhoto(key, slot) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const blob = await compressImage(file);
      await putPhoto(photoKey(key, slot), blob);
      update((s) => {
        (s.mealPhotos[key] ||= {})[slot] = true;
      });
      toast('📸 식단 사진을 저장했어요');
    } catch (e) {
      toast(e.message || '사진을 저장하지 못했어요');
    }
  };
  input.click();
}

async function viewPhoto(key, slot) {
  const url = await photoURL(photoKey(key, slot));
  const sheet = openSheet({
    title: `${mealSlotOf(slot).label} 사진`,
    render: () => `<div class="photo-view">${url ? `<img src="${url}" alt="">` : '<p>사진을 불러올 수 없어요</p>'}</div>`,
    footer: () => `<div class="btn-row"><button class="btn danger-ghost" type="button" data-action="del">${ICON.trash} 삭제</button><button class="btn secondary" type="button" data-action="retake">${ICON.camera} 다시 선택</button></div>`,
    actions: {
      del: async () => {
        if (!(await confirmBox('이 사진을 삭제할까요?', { ok: '삭제', danger: true }))) return;
        await delPhoto(photoKey(key, slot));
        update((s) => {
          if (s.mealPhotos[key]) delete s.mealPhotos[key][slot];
        });
        sheet.close();
      },
      retake: () => {
        sheet.close();
        pickPhoto(key, slot);
      },
    },
  });
}

export const actions = {
  ...waterActions,
  addFood: (b) => openFoodSearch(b.dataset.slot || (ctx.date === todayKey() ? guessSlot() : 'breakfast')),
  editFood: (b) => openFoodEdit(ctx.date, b.dataset.slot, Number(b.dataset.i)),
  copyMeal: (b) => {
    const { slot, from } = b.dataset;
    const items = S().meals[from]?.[slot] || [];
    update((s) => {
      const day = (s.meals[ctx.date] ||= { breakfast: [], lunch: [], dinner: [], snack: [] });
      day[slot] = [...(day[slot] || []), ...items.map((it) => ({ ...it, id: uid() }))];
    });
    toast(`${fmtShort(from)} ${mealSlotOf(slot).label} 식단 ${items.length}개를 불러왔어요`);
  },
  photo: (b) => {
    const slot = b.dataset.slot;
    if (S().mealPhotos[ctx.date]?.[slot]) viewPhoto(ctx.date, slot);
    else pickPhoto(ctx.date, slot);
  },
  viewPhoto: (b) => viewPhoto(ctx.date, b.dataset.slot),
};
