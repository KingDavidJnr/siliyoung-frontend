export type UserRole = "GENERAL_ADMIN" | "BRANCH_ADMIN" | "BRANCH_MEMBER" | "GENERAL_VIEWER";

export interface UserData {
  id: string;
  branchId: string | null;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  firstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

const SESSION_KEY = "Siliyoung Enterprise_user";

export function saveUser(user: UserData) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getUser(): UserData | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearUser() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
