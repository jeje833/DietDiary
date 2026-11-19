// 운동 라이브러리
// kind: weight(무게×횟수) | reps(횟수) | time(분)
// met: 대사당량(MET) — 소모 칼로리 추정에 사용 (Compendium of Physical Activities 근사값)

export const EX_CATS = [
  { id: '하체', emoji: '🦵' },
  { id: '가슴', emoji: '💪' },
  { id: '등', emoji: '🏋️' },
  { id: '어깨', emoji: '🙆' },
  { id: '팔', emoji: '💪' },
  { id: '코어', emoji: '🔥' },
  { id: '유산소', emoji: '🏃' },
  { id: '스트레칭', emoji: '🧘' },
];

const D = (name, cat, kind, met, def, emoji) => ({
  name,
  cat,
  kind,
  met,
  def,
  emoji: emoji || EX_CATS.find((c) => c.id === cat)?.emoji || '🏋️',
});

export const EXERCISES = [
  D('스쿼트', '하체', 'weight', 5.0, { sets: 3, reps: 12, kg: 20 }),
  D('맨몸 스쿼트', '하체', 'reps', 5.0, { sets: 3, reps: 20 }),
  D('런지', '하체', 'reps', 4.0, { sets: 3, reps: 12 }),
  D('레그 프레스', '하체', 'weight', 5.0, { sets: 3, reps: 12, kg: 60 }),
  D('루마니안 데드리프트', '하체', 'weight', 6.0, { sets: 3, reps: 10, kg: 30 }),
  D('힙 쓰러스트', '하체', 'weight', 5.0, { sets: 3, reps: 12, kg: 30 }),
  D('레그 익스텐션', '하체', 'weight', 4.0, { sets: 3, reps: 12, kg: 25 }),
  D('레그 컬', '하체', 'weight', 4.0, { sets: 3, reps: 12, kg: 20 }),
  D('카프 레이즈', '하체', 'reps', 3.5, { sets: 3, reps: 20 }),
  D('와이드 스쿼트', '하체', 'reps', 5.0, { sets: 3, reps: 15 }),

  D('벤치 프레스', '가슴', 'weight', 5.0, { sets: 3, reps: 10, kg: 30 }),
  D('덤벨 프레스', '가슴', 'weight', 5.0, { sets: 3, reps: 12, kg: 8 }),
  D('푸시업', '가슴', 'reps', 3.8, { sets: 3, reps: 12 }),
  D('무릎 푸시업', '가슴', 'reps', 3.5, { sets: 3, reps: 15 }),
  D('체스트 플라이', '가슴', 'weight', 4.0, { sets: 3, reps: 12, kg: 6 }),

  D('랫풀다운', '등', 'weight', 5.0, { sets: 3, reps: 12, kg: 30 }),
  D('시티드 로우', '등', 'weight', 5.0, { sets: 3, reps: 12, kg: 25 }),
  D('바벨 로우', '등', 'weight', 5.0, { sets: 3, reps: 10, kg: 30 }),
  D('덤벨 로우', '등', 'weight', 5.0, { sets: 3, reps: 12, kg: 8 }),
  D('풀업', '등', 'reps', 8.0, { sets: 3, reps: 6 }),
  D('데드리프트', '등', 'weight', 6.0, { sets: 3, reps: 8, kg: 40 }),
  D('슈퍼맨', '등', 'reps', 3.5, { sets: 3, reps: 15 }),

  D('숄더 프레스', '어깨', 'weight', 5.0, { sets: 3, reps: 12, kg: 6 }),
  D('사이드 레터럴 레이즈', '어깨', 'weight', 3.5, { sets: 3, reps: 15, kg: 3 }),
  D('프론트 레이즈', '어깨', 'weight', 3.5, { sets: 3, reps: 12, kg: 3 }),
  D('페이스 풀', '어깨', 'weight', 3.5, { sets: 3, reps: 15, kg: 15 }),

  D('바이셉 컬', '팔', 'weight', 3.5, { sets: 3, reps: 12, kg: 6 }),
  D('해머 컬', '팔', 'weight', 3.5, { sets: 3, reps: 12, kg: 6 }),
  D('트라이셉 익스텐션', '팔', 'weight', 3.5, { sets: 3, reps: 12, kg: 6 }),
  D('딥스', '팔', 'reps', 5.0, { sets: 3, reps: 10 }),

  D('플랭크', '코어', 'time', 4.0, { sets: 3, min: 1 }),
  D('사이드 플랭크', '코어', 'time', 4.0, { sets: 2, min: 0.5 }),
  D('크런치', '코어', 'reps', 3.8, { sets: 3, reps: 20 }),
  D('레그 레이즈', '코어', 'reps', 3.8, { sets: 3, reps: 15 }),
  D('러시안 트위스트', '코어', 'reps', 3.8, { sets: 3, reps: 20 }),
  D('마운틴 클라이머', '코어', 'time', 8.0, { sets: 3, min: 0.5 }),
  D('바이시클 크런치', '코어', 'reps', 3.8, { sets: 3, reps: 20 }),

  D('걷기', '유산소', 'time', 3.5, { sets: 1, min: 30 }, '🚶'),
  D('빠르게 걷기', '유산소', 'time', 4.3, { sets: 1, min: 30 }, '🚶'),
  D('러닝', '유산소', 'time', 8.0, { sets: 1, min: 30 }, '🏃'),
  D('인터벌 러닝', '유산소', 'time', 9.0, { sets: 1, min: 20 }, '🏃'),
  D('트레드밀 경사 걷기', '유산소', 'time', 5.5, { sets: 1, min: 30 }, '🚶'),
  D('실내 자전거', '유산소', 'time', 6.8, { sets: 1, min: 30 }, '🚴'),
  D('천국의 계단', '유산소', 'time', 8.8, { sets: 1, min: 20 }, '🪜'),
  D('줄넘기', '유산소', 'time', 11.0, { sets: 3, min: 5 }, '🪢'),
  D('버피', '유산소', 'reps', 8.0, { sets: 3, reps: 10 }, '🔥'),
  D('점핑잭', '유산소', 'time', 8.0, { sets: 3, min: 1 }, '🤸'),
  D('타바타 HIIT', '유산소', 'time', 8.0, { sets: 1, min: 20 }, '⏱️'),
  D('수영', '유산소', 'time', 7.0, { sets: 1, min: 40 }, '🏊'),
  D('등산', '유산소', 'time', 6.0, { sets: 1, min: 90 }, '⛰️'),
  D('일립티컬', '유산소', 'time', 5.0, { sets: 1, min: 30 }, '🏃'),
  D('로잉 머신', '유산소', 'time', 7.0, { sets: 1, min: 20 }, '🚣'),
  D('홈트 댄스', '유산소', 'time', 6.5, { sets: 1, min: 30 }, '💃'),

  D('스트레칭', '스트레칭', 'time', 2.3, { sets: 1, min: 10 }),
  D('요가', '스트레칭', 'time', 2.5, { sets: 1, min: 30 }),
  D('필라테스', '스트레칭', 'time', 3.0, { sets: 1, min: 50 }),
  D('폼롤러', '스트레칭', 'time', 2.3, { sets: 1, min: 10 }),
];

export const findExercise = (name) => EXERCISES.find((e) => e.name === name);

export const KIND_LABEL = { weight: '무게 × 횟수', reps: '횟수', time: '시간' };
export const KIND_MET = { weight: 5.0, reps: 4.0, time: 5.0 };
