// 나 탭: 프로필/목표, 몸 분석(BMI·대사량), 체중 기록, 설정, 설치 안내, 백업
import { S, update, latestWeight, energyFor, calorieGoal, bmi, bmiLabel, replaceState, resetState } from '../store.js';
import { ACTIVITY, PACES } from '../data/templates.js';
import { esc, num, r1, todayKey, daysBetween, fmtShort, isIOS, isStandalone, parseKey } from '../utils.js';
import { ICON, openSheet, toast, confirmBox, applyTheme } from '../ui.js';
import { meter } from '../components/charts.js';
import { install, promptInstall } from '../install.js';
import { requestNotify, notifySupported } from '../reminders.js';
import { exportPhotos, importPhotos, clearPhotos } from '../photos.js';
import { ctx } from '../ctx.js';

export const APP_VERSION = '1.0.0';

/* ───────── 프로필 폼 (온보딩에서도 사용) ───────── */

export function profileFormHTML(f) {
  const e = energyFor(f, Number(f.startWeight) || 60);
  return `
    <p class="label">닉네임</p>
    <input class="input" maxlength="12" placeholder="예: 다이어터" value="${esc(f.name)}" data-input="pf" data-k="name">
    <p class="label">성별</p>
    <div class="seg full">
      <button type="button" class="${f.sex === 'f' ? 'on' : ''}" data-action="pfSex" data-v="f">여성</button>
      <button type="button" class="${f.sex === 'm' ? 'on' : ''}" data-action="pfSex" data-v="m">남성</button>
    </div>
    <div class="grid2 form-grid">
      <label><span>나이</span><div class="inline-field"><input class="input" type="number" inputmode="numeric" min="10" max="100" value="${esc(f.age)}" data-change="pfNum" data-k="age"><span>세</span></div></label>
      <label><span>키</span><div class="inline-field"><input class="input" type="number" inputmode="decimal" min="100" max="230" step="0.1" value="${esc(f.height)}" data-change="pfNum" data-k="height"><span>cm</span></div></label>
      <label><span>시작 체중</span><div class="inline-field"><input class="input" type="number" inputmode="decimal" min="20" max="300" step="0.1" value="${esc(f.startWeight)}" data-change="pfNum" data-k="startWeight"><span>kg</span></div></label>
      <label><span>목표 체중</span><div class="inline-field"><input class="input" type="number" inputmode="decimal" min="20" max="300" step="0.1" value="${esc(f.goalWeight)}" data-change="pfNum" data-k="goalWeight"><span>kg</span></div></label>
    </div>
    <p class="label">평소 활동량</p>
    <div class="radio-list">${ACTIVITY.map((a) => `<button type="button" class="radio ${f.activity === a.v ? 'on' : ''}" data-action="pfAct" data-v="${a.v}"><b>${a.label}</b><small>${a.sub}</small></button>`).join('')}</div>
    <p class="label">감량 속도</p>
    <div class="chips">${PACES.map((p) => `<button type="button" class="chip ${f.pace === p.v ? 'on' : ''}" data-action="pfPace" data-v="${p.v}">${p.label}</button>`).join('')}</div>
    <div class="energy-box">
      <div><small>기초대사량</small><b>${num(e.bmr)}</b></div>
      <div><small>활동대사량</small><b>${num(e.tdee)}</b></div>
      <div class="hl"><small>권장 섭취</small><b>${num(e.goal)}</b></div>
    </div>
    ${e.floor ? '<p class="hint">건강을 위해 최소 섭취량 이상으로 맞췄어요.</p>' : ''}
    <label class="check-row"><input type="checkbox" ${f.calorieGoal > 0 ? 'checked' : ''} data-change="pfManual"><span>하루 목표 칼로리를 직접 정할게요</span></label>
    ${f.calorieGoal > 0 ? `<div class="inline-field"><input class="input" type="number" inputmode="numeric" min="800" max="5000" step="10" value="${esc(f.calorieGoal)}" data-change="pfNum" data-k="calorieGoal"><span>kcal</span></div>` : ''}
    <p class="label">하루 물 목표</p>
    <div class="stepper sm">
      <button type="button" class="step" data-action="pfWater" data-d="-1" aria-label="줄이기">${ICON.minus}</button>
      <span class="step-val"><b>${f.waterGoal}</b>잔 (${r1((f.waterGoal * 250) / 1000)}L)</span>
      <button type="button" class="step" data-action="pfWater" data-d="1" aria-label="늘리기">${ICON.plus}</button>
    </div>`;
}

const LIMITS = { age: [10, 100], height: [100, 230], startWeight: [20, 300], goalWeight: [20, 300], calorieGoal: [800, 5000] };

export function profileFormActions(f, refresh) {
  return {
    pf: (i) => (f[i.dataset.k] = i.value),
    pfSex: (b) => {
      f.sex = b.dataset.v;
      refresh();
    },
    pfNum: (i) => {
      const k = i.dataset.k;
      const [lo, hi] = LIMITS[k];
      const v = Number(i.value);
      if (!(v >= lo && v <= hi)) {
        toast(`${lo}~${hi} 사이로 입력해 주세요`);
        refresh();
        return;
      }
      f[k] = k === 'age' || k === 'calorieGoal' ? Math.round(v) : r1(v);
      refresh();
    },
    pfAct: (b) => {
      f.activity = Number(b.dataset.v);
      refresh();
    },
    pfPace: (b) => {
      f.pace = Number(b.dataset.v);
      refresh();
    },
    pfManual: (i) => {
      f.calorieGoal = i.checked ? energyFor(f, Number(f.startWeight) || 60).goal : 0;
      refresh();
    },
    pfWater: (b) => {
      f.waterGoal = Math.max(1, Math.min(16, f.waterGoal + Number(b.dataset.d)));
      refresh();
    },
  };
}

function openProfileEditor() {
  const f = { ...S().profile };
  const sheet = openSheet({
    title: '프로필 · 목표',
    className: 'sheet-tall',
    render: () => profileFormHTML(f),
    footer: () => '<button class="btn block" type="button" data-action="save">저장하기</button>',
    actions: {
      ...profileFormActions(f, () => sheet.refresh()),
      save: () => {
        f.name = (f.name || '').trim();
        update((s) => (s.profile = { ...s.profile, ...f }));
        sheet.close();
        toast('프로필을 저장했어요');
      },
    },
  });
}

/* ───────── 체중 기록 ───────── */

function openWeightAdd() {
  const st = { date: todayKey(), kg: S().weights[todayKey()] ?? latestWeight() };
  const sheet = openSheet({
    title: '체중 기록',
    render: () => `
      <p class="label">날짜</p>
      <input class="input" type="date" max="${todayKey()}" value="${st.date}" data-change="date">
      <p class="label">체중</p>
      <div class="inline-field"><input class="input big" type="number" inputmode="decimal" step="0.1" min="20" max="300" value="${esc(st.kg)}" data-input="kg" data-enter="save"><span>kg</span></div>`,
    footer: () => '<button class="btn block" type="button" data-action="save">기록하기</button>',
    actions: {
      date: (i) => {
        st.date = i.value && i.value <= todayKey() ? i.value : todayKey();
        if (S().weights[st.date] != null) st.kg = S().weights[st.date];
        sheet.refresh();
      },
      kg: (i) => (st.kg = i.value),
      save: () => {
        const v = Number(st.kg);
        if (!(v >= 20 && v <= 300)) return toast('체중을 확인해 주세요 (20~300kg)');
        update((s) => (s.weights[st.date] = r1(v)));
        sheet.close();
        toast(`${fmtShort(st.date)} ${r1(v)}kg 기록했어요`);
      },
    },
  });
}

let showAllWeights = false;

function weightList() {
  const entries = Object.entries(S().weights).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  if (!entries.length) return '<p class="muted center">아직 체중 기록이 없어요</p>';
  const shown = showAllWeights ? entries : entries.slice(0, 7);
  return `<ul class="w-list">${shown
    .map(([k, v]) => {
      const idx = entries.findIndex((e) => e[0] === k);
      const prev = entries[idx + 1];
      const d = prev ? r1(v - prev[1]) : null;
      const day = parseKey(k);
      return `<li><span class="wl-date">${day.getFullYear() !== new Date().getFullYear() ? `${day.getFullYear()}.` : ''}${fmtShort(k)}</span>
        <b>${r1(v)}kg</b>
        <span class="wl-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d == null ? '' : d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${Math.abs(d)}` : '='}</span>
        <button type="button" class="icon-btn sm ghost" data-action="delWeight" data-k="${k}" aria-label="삭제">${ICON.trash}</button></li>`;
    })
    .join('')}</ul>
    ${entries.length > 7 ? `<button type="button" class="link-btn center" data-action="toggleWeights">${showAllWeights ? '접기' : `전체 ${entries.length}개 보기`}</button>` : ''}`;
}

/* ───────── 설치 안내 ───────── */

function installCard() {
  let body;
  if (isStandalone() || install.installed) {
    body = '<p class="install-ok">✅ 홈 화면 앱으로 사용 중이에요</p>';
  } else if (install.prompt) {
    body = `<p class="sheet-desc">홈 화면에 설치하면 앱처럼 전체 화면으로 열리고, 오프라인에서도 쓸 수 있어요.</p>
      <button type="button" class="btn block" data-action="install">${ICON.download} 홈 화면에 설치하기</button>`;
  } else if (isIOS()) {
    body = `<ol class="steps">
      <li><b>Safari</b>로 이 페이지를 열어주세요</li>
      <li>하단의 <b>공유 버튼</b> ${ICON.share} 을 누르고</li>
      <li><b>'홈 화면에 추가'</b>를 선택하면 끝!</li></ol>`;
  } else {
    body = `<ol class="steps">
      <li><b>Chrome / 삼성 인터넷</b>으로 이 페이지를 열어주세요</li>
      <li>브라우저 메뉴 <b>⋮</b> 를 누르고</li>
      <li><b>'앱 설치'</b> 또는 <b>'홈 화면에 추가'</b>를 선택하세요</li></ol>`;
  }
  return `<section class="card"><div class="card-head"><h3>📲 앱으로 설치</h3></div>${body}</section>`;
}

/* ───────── 백업 ───────── */

async function exportData() {
  let photos = {};
  try {
    photos = await exportPhotos();
  } catch {
    /* 사진 없음 */
  }
  const payload = { app: 'DietDiary', version: 1, exportedAt: new Date().toISOString(), state: S(), photos };
  const name = `dietdiary-backup-${todayKey()}.json`;
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (isIOS() && window.File && navigator.canShare) {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'DietDiary 백업' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
  toast('백업 파일을 내려받았어요');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const st = data.state || data;
      if (!st || typeof st !== 'object' || !st.profile || !Array.isArray(st.routines)) throw new Error('DietDiary 백업 파일이 아니에요');
      const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('ko-KR') : '알 수 없음';
      if (!(await confirmBox(`백업(${when})으로 복원할까요?\n지금 기기에 있는 기록은 모두 바뀌어요.`, { ok: '복원하기', danger: true }))) return;
      if (data.photos && Object.keys(data.photos).length) {
        await clearPhotos();
        await importPhotos(data.photos);
      }
      replaceState({ ...st, onboarded: true });
      toast('백업을 복원했어요');
    } catch (e) {
      toast(e.message?.includes('JSON') ? '파일을 읽을 수 없어요' : e.message || '복원에 실패했어요');
    }
  };
  input.click();
}

/* ───────── 화면 ───────── */

export function render() {
  const s = S();
  const p = s.profile;
  const cur = latestWeight();
  const e = energyFor(p, cur);
  const goal = calorieGoal();
  const b = bmi(cur, p.height);
  const bl = bmiLabel(b);
  const dday = daysBetween(p.startDate || todayKey(), todayKey()) + 1;
  const total = p.startWeight - p.goalWeight;
  const prog = total > 0 ? (p.startWeight - cur) / total : 0;
  const st = s.settings;
  return `
  <header class="page-head"><div><p class="eyebrow">다이어트 ${dday}일째</p><h1>${p.name ? `${esc(p.name)}님` : '나'}</h1></div>
    <button type="button" class="icon-btn" data-action="editProfile" aria-label="프로필 수정">${ICON.edit}</button></header>

  <section class="card profile-card">
    <div class="pc-top">
      <span class="avatar">${p.sex === 'm' ? '🙋‍♂️' : '🙋‍♀️'}</span>
      <div class="pc-info"><b>${p.name ? esc(p.name) : '닉네임을 설정해 주세요'}</b><small>${p.sex === 'm' ? '남성' : '여성'} · ${p.age}세 · ${r1(p.height)}cm</small></div>
      <button type="button" class="chip sm" data-action="editProfile">수정</button>
    </div>
    <div class="weight-flow">
      <div><small>시작</small><b>${r1(p.startWeight)}<i>kg</i></b></div>
      <span class="wf-arrow">${ICON.right}</span>
      <div class="hl"><small>현재</small><b>${r1(cur)}<i>kg</i></b></div>
      <span class="wf-arrow">${ICON.right}</span>
      <div><small>목표</small><b>${r1(p.goalWeight)}<i>kg</i></b></div>
    </div>
    ${meter(Math.max(0, prog), 1, { color: 'var(--primary)' })}
    <p class="pc-msg">${prog >= 1 ? '🎉 목표 체중 달성! 이제 유지가 목표예요' : `목표까지 <b>${r1(Math.max(0, cur - p.goalWeight))}kg</b> · 진행률 ${Math.round(Math.max(0, prog) * 100)}%`}</p>
  </section>

  <section class="card">
    <div class="card-head"><h3>내 몸 분석</h3></div>
    <div class="tiles four">
      <div><b>${r1(b)}</b><small>BMI · <span class="tone ${bl.tone}">${bl.label}</span></small></div>
      <div><b>${num(e.bmr)}</b><small>기초대사량</small></div>
      <div><b>${num(e.tdee)}</b><small>활동대사량</small></div>
      <div class="hl"><b>${num(goal)}</b><small>하루 목표 kcal</small></div>
    </div>
    <p class="footnote left">Mifflin-St Jeor 공식과 대한비만학회 BMI 기준이에요. ${p.calorieGoal > 0 ? '목표 칼로리는 직접 설정한 값이에요.' : `주 ${p.pace}kg 감량 속도로 계산했어요.`}</p>
  </section>

  <section class="card">
    <div class="card-head"><h3>체중 기록</h3><button type="button" class="chip sm" data-action="addWeight">${ICON.plus} 기록</button></div>
    ${weightList()}
  </section>

  <section class="card settings">
    <div class="card-head"><h3>설정</h3></div>
    <div class="set-row2"><span>화면 테마</span>
      <div class="seg sm">${[['system', '자동'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) => `<button type="button" class="${st.theme === v ? 'on' : ''}" data-action="theme" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="set-row2"><span>한 주의 시작</span>
      <div class="seg sm">${[[1, '월요일'], [0, '일요일']].map(([v, l]) => `<button type="button" class="${st.weekStart === v ? 'on' : ''}" data-action="weekStart" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="set-row2"><span>세트 휴식 시간</span>
      <div class="seg sm">${[[0, '끔'], [30, '30초'], [60, '1분'], [90, '1분30'], [120, '2분']].map(([v, l]) => `<button type="button" class="${st.restSec === v ? 'on' : ''}" data-action="restSec" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="set-row2"><span>루틴 알림<small>알림 시간을 정한 루틴 · 앱이 열려 있을 때</small></span>
      <button type="button" class="switch ${st.notify ? 'on' : ''}" data-action="notify" role="switch" aria-checked="${st.notify}" aria-label="루틴 알림"><span></span></button></div>
  </section>

  ${installCard()}

  <section class="card">
    <div class="card-head"><h3>💾 데이터</h3></div>
    <p class="sheet-desc">기록은 이 기기의 브라우저에만 저장돼요. 휴대폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업해 두세요.</p>
    <div class="btn-col">
      <button type="button" class="btn secondary block" data-action="export">${ICON.download} 백업 파일 내보내기</button>
      <button type="button" class="btn secondary block" data-action="import">${ICON.upload} 백업 파일로 복원하기</button>
      <button type="button" class="btn danger-ghost block" data-action="reset">${ICON.trash} 모든 데이터 초기화</button>
    </div>
  </section>
  <p class="footnote">DietDiary v${APP_VERSION} · 칼로리·영양 정보는 참고용 추정치이며 의학적 조언을 대신하지 않아요.</p>`;
}

export const actions = {
  editProfile: () => openProfileEditor(),
  addWeight: () => openWeightAdd(),
  delWeight: async (b) => {
    const k = b.dataset.k;
    const v = S().weights[k];
    update((s) => delete s.weights[k]);
    toast(`${fmtShort(k)} 기록을 삭제했어요`, { action: '되돌리기', onAction: () => update((s) => (s.weights[k] = v)) });
  },
  toggleWeights: () => {
    showAllWeights = !showAllWeights;
    ctx.rerender();
  },
  theme: (b) => {
    update((s) => (s.settings.theme = b.dataset.v));
    applyTheme(b.dataset.v);
  },
  weekStart: (b) => update((s) => (s.settings.weekStart = Number(b.dataset.v))),
  restSec: (b) => update((s) => (s.settings.restSec = Number(b.dataset.v))),
  notify: async () => {
    if (S().settings.notify) {
      update((s) => (s.settings.notify = false));
      return;
    }
    if (!notifySupported()) {
      toast(isIOS() ? '아이폰은 홈 화면에 설치한 뒤 알림을 켤 수 있어요' : '이 브라우저는 알림을 지원하지 않아요');
      return;
    }
    const res = await requestNotify();
    if (res !== 'granted') {
      toast('알림 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요');
      return;
    }
    update((s) => (s.settings.notify = true));
    toast('🔔 루틴 알림을 켰어요');
  },
  install: async () => {
    const ok = await promptInstall();
    if (ok) toast('홈 화면에 설치했어요 🎉');
    ctx.rerender();
  },
  export: () => exportData(),
  import: () => importData(),
  reset: async () => {
    if (!(await confirmBox('모든 루틴, 식단, 운동, 체중 기록을 삭제할까요?\n이 작업은 되돌릴 수 없어요.', { ok: '모두 삭제', danger: true, title: '데이터 초기화' }))) return;
    await clearPhotos().catch(() => {});
    resetState();
    toast('초기화했어요');
  },
};
