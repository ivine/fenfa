import { ref } from 'vue'

// 上传凭据仅在当前页面会话中共享。
const token = ref('')

export function useAuth() {
  function handleAuthError(res: Response): boolean {
    return res.status === 401 || res.status === 403
  }
  return { token, handleAuthError }
}
