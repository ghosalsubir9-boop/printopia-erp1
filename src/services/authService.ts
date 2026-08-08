/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserSession {
  userId: string;
  userName: string;
  role: 'Admin' | 'Accounts' | 'User';
}

export class AuthService {
  private static readonly SESSION_KEY = 'printopia_user_session';

  public static getCurrentUser(): UserSession | null {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (session) {
      try {
        return JSON.parse(session);
      } catch (e) {
        return null;
      }
    }
    
    return null;
  }

  public static login(user: UserSession) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  }

  public static logout() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  public static isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}
