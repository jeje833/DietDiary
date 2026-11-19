// 화면 간에 공유되는 현재 상태 (선택 날짜, 현재 탭)
import { todayKey } from './utils.js';

export const ctx = {
  date: todayKey(),
  tab: 'today',
  rerender: () => {},
  go(tab) {
    location.hash = `#/${tab}`;
  },
};
