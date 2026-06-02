/**
 * AuthService handles authentication operations.
 * Password-based logins are deprecated; all user logins are verified via Supabase JWTs.
 */
export class AuthService {
  /**
   * Logs out the session. (Local sessions are stateless JWTs, so this is a no-op).
   */
  static async logout() {
    return true;
  }
}
