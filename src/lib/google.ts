type IdentityApi = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme: string; size: string; type: string; text: string; width: number },
  ) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: IdentityApi } };
  }
}
let loading: Promise<IdentityApi> | undefined;
export function loadGoogleIdentity(): Promise<IdentityApi> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () =>
      window.google?.accounts.id
        ? resolve(window.google.accounts.id)
        : reject(new Error('Không tải được đăng nhập Google.'));
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error('Không kết nối được Google. Kiểm tra mạng rồi thử lại.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
