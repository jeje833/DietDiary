// 첫 실행 온보딩: 프로필 → 추천 루틴 → 운동 계획 → 설치 안내
import { S, update, routinesFromTemplates, samplePlan, energyFor } from '../store.js';
import { ROUTINE_TEMPLATES, DEFAULT_TEMPLATE_IDX, colorOf, slotOf } from '../data/templates.js';
import { bindDelegation, ICON, toast } from '../ui.js';
import { esc, hexA, todayKey, isIOS, isStandalone, num } from '../utils.js';
import { profileFormHTML, profileFormActions } from './me.js';
import { install, promptInstall } from '../install.js';

let open = false;

export function openOnboarding() {
  if (open) return;
  open = true;
  const f = { ...S().profile, name: S().profile.name || '' };
  const st = { step: 0, picked: new Set(DEFAULT_TEMPLATE_IDX), plan: 'sample' };
  const el = document.createElement('div');
  el.className = 'onboard';
  document.body.appendChild(el);
  document.body.classList.add('locked');

  const STEPS = 4;
  const render = () => {
    let body = '';
    let cta = '다음';
    if (st.step === 0) {
      body = `<div class="ob-hero">
          <img src="icons/icon-192.png" alt="" class="ob-logo" width="88" height="88">
          <h1>DietDiary</h1>
          <p>식단 · 운동 · 습관을 하나의 루틴으로.<br>나만의 다이어트 계획을 세우고 매일 실천해요.</p>
        </div>
        <ul class="ob-feats">
          <li><span>✅</span><div><b>시간대별 루틴</b><small>아침·오후·저녁 습관을 체크하고 타이머로 실행</small></div></li>
          <li><span>🍽️</span><div><b>식단 기록</b><small>음식 검색으로 칼로리·탄단지 자동 계산, 사진 기록</small></div></li>
          <li><span>🏋️</span><div><b>운동 스케줄</b><small>요일별 운동 계획을 직접 짜고 세트별로 실행</small></div></li>
          <li><span>📊</span><div><b>리포트</b><small>달성률 신호등 달력, 체중 변화 그래프</small></div></li>
        </ul>`;
      cta = '시작하기';
    } else if (st.step === 1) {
      body = `<h2 class="ob-title">나에 대해 알려주세요</h2><p class="ob-sub">하루 권장 칼로리를 계산하는 데 사용돼요. 나중에 바꿀 수 있어요.</p>${profileFormHTML(f)}`;
    } else if (st.step === 2) {
      body = `<h2 class="ob-title">매일 할 루틴을 골라보세요</h2><p class="ob-sub">다이어트에 도움 되는 습관이에요. 언제든 추가·수정할 수 있어요.</p>
        <div class="pick-list">${ROUTINE_TEMPLATES.map((t, i) => {
          const c = colorOf(t.color);
          return `<button type="button" class="pick ${st.picked.has(i) ? 'on' : ''}" data-action="pick" data-i="${i}" style="--c:${c};--c-soft:${hexA(c, 0.16)}">
            <span class="r-emoji">${t.emoji}</span>
            <span class="r-text"><b>${esc(t.title)}</b><small>${slotOf(t.slot).emoji} ${slotOf(t.slot).label}${t.duration ? ` · ${t.duration}분` : ''}${t.time ? ` · ${t.time}` : ''}</small></span>
            <span class="check">${ICON.check}</span></button>`;
        }).join('')}</div>`;
      cta = st.picked.size ? `${st.picked.size}개 루틴으로 다음` : '루틴 없이 다음';
    } else if (st.step === 3) {
      body = `<h2 class="ob-title">운동 계획은 어떻게 할까요?</h2><p class="ob-sub">요일별로 할 운동을 정해두면 매일 운동 탭에 나타나요.</p>
        <div class="radio-list big">
          <button type="button" class="radio ${st.plan === 'sample' ? 'on' : ''}" data-action="plan" data-v="sample">
            <b>📋 샘플 계획으로 시작</b><small>월 하체 · 화 상체 · 수 유산소 · 목 등/팔 · 금 서킷 · 토 가벼운 활동 · 일 휴식<br>무게·횟수는 자유롭게 바꿀 수 있어요</small></button>
          <button type="button" class="radio ${st.plan === 'empty' ? 'on' : ''}" data-action="plan" data-v="empty">
            <b>✏️ 직접 짤게요</b><small>빈 계획에서 시작해 원하는 운동을 요일별로 추가해요</small></button>
        </div>`;
    } else {
      const e = energyFor(f, Number(f.startWeight));
      const goal = f.calorieGoal > 0 ? f.calorieGoal : e.goal;
      let installHTML;
      if (isStandalone()) installHTML = '<p class="install-ok">✅ 이미 홈 화면 앱으로 실행 중이에요</p>';
      else if (install.prompt) installHTML = `<button type="button" class="btn secondary block" data-action="install">${ICON.download} 홈 화면에 설치하기</button>`;
      else if (isIOS()) installHTML = `<ol class="steps"><li><b>Safari</b> 하단의 공유 버튼 ${ICON.share} 누르기</li><li><b>'홈 화면에 추가'</b> 선택</li><li>홈 화면의 DietDiary 아이콘으로 실행!</li></ol>`;
      else installHTML = '<ol class="steps"><li>브라우저 메뉴 <b>⋮</b> 누르기</li><li><b>\'앱 설치\'</b> 또는 <b>\'홈 화면에 추가\'</b> 선택</li><li>홈 화면 아이콘으로 실행!</li></ol>';
      body = `<div class="ob-hero sm"><div class="ob-party">🎯</div><h2 class="ob-title">준비 완료!</h2>
          <p class="ob-sub">${f.name ? `${esc(f.name)}님의 ` : ''}하루 목표는 <b>${num(goal)}kcal</b>,<br>목표 체중은 <b>${f.goalWeight}kg</b>이에요.</p></div>
        <div class="card"><div class="card-head"><h3>📲 홈 화면에 설치하면 앱처럼 쓸 수 있어요</h3></div>${installHTML}</div>`;
      cta = 'DietDiary 시작하기';
    }
    el.innerHTML = `
      <div class="ob-top">
        ${st.step > 0 ? `<button type="button" class="icon-btn" data-action="back" aria-label="이전">${ICON.left}</button>` : '<span></span>'}
        <div class="ob-dots">${Array.from({ length: STEPS + 1 }, (_, i) => `<span class="${i === st.step ? 'on' : i < st.step ? 'past' : ''}"></span>`).join('')}</div>
        <span></span>
      </div>
      <div class="ob-body">${body}</div>
      <div class="ob-foot"><button type="button" class="btn block lg" data-action="next">${cta}</button></div>`;
  };

  const actions = {
    ...profileFormActions(f, () => {
      const y = el.querySelector('.ob-body')?.scrollTop || 0;
      render();
      el.querySelector('.ob-body').scrollTop = y;
    }),
    back: () => {
      st.step = Math.max(0, st.step - 1);
      render();
    },
    pick: (b) => {
      const i = Number(b.dataset.i);
      st.picked.has(i) ? st.picked.delete(i) : st.picked.add(i);
      const y = el.querySelector('.ob-body').scrollTop;
      render();
      el.querySelector('.ob-body').scrollTop = y;
    },
    plan: (b) => {
      st.plan = b.dataset.v;
      render();
    },
    install: async () => {
      if (await promptInstall()) toast('홈 화면에 설치했어요 🎉');
      render();
    },
    next: () => {
      if (st.step === 1) {
        if (Number(f.goalWeight) >= Number(f.startWeight)) toast('목표 체중이 현재보다 높아요. 유지·증량 목표라면 그대로 진행하세요');
      }
      if (st.step < STEPS) {
        st.step++;
        render();
        el.querySelector('.ob-body').scrollTop = 0;
        return;
      }
      finish();
    },
  };
  bindDelegation(el, () => actions);

  const finish = () => {
    const today = todayKey();
    update((s) => {
      s.profile = { ...s.profile, ...f, name: (f.name || '').trim(), startDate: today };
      if (!Object.keys(s.weights).length) s.weights[today] = Number(f.startWeight);
      if (!s.routines.length) s.routines = routinesFromTemplates([...st.picked].sort((a, b) => a - b));
      if (st.plan === 'sample' && !Object.values(s.plan).some((p) => p.exercises.length)) s.plan = samplePlan();
      s.onboarded = true;
    });
    el.classList.add('leaving');
    setTimeout(() => {
      el.remove();
      if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('locked');
      open = false;
    }, 300);
    toast('환영해요! 오늘의 첫 루틴을 체크해 보세요 🌱');
  };

  render();
}
