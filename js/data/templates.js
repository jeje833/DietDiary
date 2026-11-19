// 루틴/식단/운동 관련 상수와 추천 템플릿

export const COLORS = {
  coral: '#FF6B6B',
  orange: '#FF9F43',
  yellow: '#F2B705',
  green: '#22B07D',
  mint: '#14B8A6',
  blue: '#4D8EFF',
  purple: '#8B6CF6',
  pink: '#EC5FB5',
};
export const colorOf = (name) => COLORS[name] || COLORS.green;

export const SLOTS = [
  { id: 'morning', label: '아침', emoji: '🌅' },
  { id: 'afternoon', label: '오후', emoji: '☀️' },
  { id: 'evening', label: '저녁', emoji: '🌆' },
  { id: 'night', label: '자기 전', emoji: '🌙' },
  { id: 'anytime', label: '언제든', emoji: '✨' },
];
export const SLOT_ORDER = Object.fromEntries(SLOTS.map((s, i) => [s.id, i]));
export const slotOf = (id) => SLOTS.find((s) => s.id === id) || SLOTS[4];

export const ROUTINE_CATS = [
  { id: 'exercise', label: '운동', emoji: '🏃' },
  { id: 'diet', label: '식단', emoji: '🥗' },
  { id: 'life', label: '생활', emoji: '🌿' },
];

export const EMOJIS = [
  '💧', '🥤', '⚖️', '🧘', '🏃', '🚶', '🏋️', '🚴', '🏊', '🤸', '🪜', '🦵',
  '🥗', '🍳', '🥚', '🍗', '🥦', '🍎', '🍌', '🥛', '☕', '🍵', '🙅', '🚫',
  '💊', '😴', '🛌', '🌅', '🌙', '📝', '📸', '📖', '🧴', '🦷', '🧖', '🛁',
  '❤️', '🔥', '⭐', '✅', '🎯', '💪', '🌿', '🧠', '🎧', '📵', '🧹', '🌞',
];

export const ROUTINE_TEMPLATES = [
  { title: '기상 후 물 한 잔', emoji: '💧', slot: 'morning', cat: 'diet', color: 'blue', duration: 0 },
  { title: '공복 체중 재기', emoji: '⚖️', slot: 'morning', cat: 'life', color: 'purple', duration: 0 },
  { title: '아침 스트레칭', emoji: '🧘', slot: 'morning', cat: 'exercise', color: 'mint', duration: 10 },
  { title: '단백질 챙긴 아침', emoji: '🍳', slot: 'morning', cat: 'diet', color: 'orange', duration: 0 },
  { title: '영양제 먹기', emoji: '💊', slot: 'morning', cat: 'life', color: 'pink', duration: 0 },
  { title: '점심 식단 기록', emoji: '📸', slot: 'afternoon', cat: 'diet', color: 'orange', duration: 0 },
  { title: '점심 후 산책', emoji: '🚶', slot: 'afternoon', cat: 'exercise', color: 'green', duration: 15 },
  { title: '엘리베이터 대신 계단', emoji: '🪜', slot: 'anytime', cat: 'exercise', color: 'green', duration: 0 },
  { title: '오늘의 운동 완료', emoji: '🏋️', slot: 'evening', cat: 'exercise', color: 'purple', duration: 60 },
  { title: '저녁 7시 이후 금식', emoji: '🙅', slot: 'evening', cat: 'diet', color: 'coral', duration: 0, time: '19:00' },
  { title: '물 2L 마시기', emoji: '🥤', slot: 'anytime', cat: 'diet', color: 'blue', duration: 0 },
  { title: '간식 대신 과일', emoji: '🍎', slot: 'anytime', cat: 'diet', color: 'coral', duration: 0 },
  { title: '폼롤러 마사지', emoji: '🧖', slot: 'night', cat: 'exercise', color: 'mint', duration: 10 },
  { title: '하루 회고 쓰기', emoji: '📝', slot: 'night', cat: 'life', color: 'yellow', duration: 5 },
  { title: '자정 전에 잠들기', emoji: '😴', slot: 'night', cat: 'life', color: 'purple', duration: 0, time: '23:30' },
];
// 온보딩에서 기본 선택될 추천 루틴
export const DEFAULT_TEMPLATE_IDX = [0, 2, 5, 8, 9, 10, 14];

export const MEAL_SLOTS = [
  { id: 'breakfast', label: '아침', emoji: '🍳' },
  { id: 'lunch', label: '점심', emoji: '🍱' },
  { id: 'dinner', label: '저녁', emoji: '🍲' },
  { id: 'snack', label: '간식', emoji: '🍪' },
];
export const mealSlotOf = (id) => MEAL_SLOTS.find((m) => m.id === id) || MEAL_SLOTS[3];

export const MOODS = [
  { v: 1, emoji: '😫', label: '힘들어요' },
  { v: 2, emoji: '😕', label: '별로예요' },
  { v: 3, emoji: '😐', label: '보통이에요' },
  { v: 4, emoji: '🙂', label: '좋아요' },
  { v: 5, emoji: '😆', label: '최고예요' },
];

export const ACTIVITY = [
  { v: 1.2, label: '거의 안 움직여요', sub: '앉아서 일하고 운동 안 함' },
  { v: 1.375, label: '가볍게 움직여요', sub: '주 1~3회 가벼운 운동' },
  { v: 1.55, label: '보통이에요', sub: '주 3~5회 운동' },
  { v: 1.725, label: '활동적이에요', sub: '주 6~7회 운동' },
  { v: 1.9, label: '매우 활동적이에요', sub: '육체노동 + 매일 운동' },
];

export const PACES = [
  { v: 0, label: '유지' },
  { v: 0.25, label: '주 0.25kg' },
  { v: 0.5, label: '주 0.5kg' },
  { v: 0.75, label: '주 0.75kg' },
  { v: 1, label: '주 1kg' },
];

// 샘플 주간 운동 계획 (요일: 0=일 ~ 6=토). 운동 이름은 exercises.js 와 일치해야 함
export const SAMPLE_PLAN = {
  1: { title: '하체 + 유산소', items: [['스쿼트'], ['런지'], ['힙 쓰러스트'], ['빠르게 걷기', { sets: 1, min: 20 }]] },
  2: { title: '상체 (가슴·어깨)', items: [['푸시업'], ['덤벨 프레스'], ['숄더 프레스'], ['사이드 레터럴 레이즈'], ['플랭크']] },
  3: { title: '유산소 + 코어', items: [['러닝', { sets: 1, min: 30 }], ['크런치'], ['레그 레이즈'], ['플랭크']] },
  4: { title: '등 · 팔', items: [['랫풀다운'], ['시티드 로우'], ['바이셉 컬'], ['트라이셉 익스텐션']] },
  5: { title: '전신 서킷', items: [['버피'], ['맨몸 스쿼트'], ['마운틴 클라이머'], ['줄넘기']] },
  6: { title: '가벼운 활동', items: [['걷기', { sets: 1, min: 60 }], ['스트레칭']] },
  0: { title: '', items: [] },
};
