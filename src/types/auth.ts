/**
 * Authentication and User Session Types
 */

export type AuthMode = 'local' | 'cloud';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  authMode: AuthMode;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}
