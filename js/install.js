// 홈 화면 설치(PWA) 상태
export const install = { prompt: null, installed: false };

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  install.prompt = e;
  window.dispatchEvent(new Event('dd:install-ready'));
});

window.addEventListener('appinstalled', () => {
  install.installed = true;
  install.prompt = null;
  window.dispatchEvent(new Event('dd:install-ready'));
});

export async function promptInstall() {
  if (!install.prompt) return false;
  install.prompt.prompt();
  const { outcome } = await install.prompt.userChoice;
  install.prompt = null;
  return outcome === 'accepted';
}
