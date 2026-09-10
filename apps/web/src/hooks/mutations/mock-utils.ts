/**
 * Shared mock-network convention for every hook in this directory that
 * doesn't have a real backend endpoint yet (useRequestOtp, useVerifyOtp,
 * useResetPassword). Each hook's mock branch references this with a
 * one-line comment rather than repeating the explanation:
 *
 * - Any text-entry field (username, email, phone-as-typed, or the new
 *   password) containing the substring "fail" (case-insensitive, via
 *   `shouldSimulateFailure`) makes that mock call reject.
 * - The 6-digit OTP field can't contain letters, so its dedicated failure
 *   trigger is the exact code "000000" instead — checked directly in
 *   useVerifyOtp.ts rather than through this helper.
 */
export async function simulateNetworkDelay(ms = 800): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export function shouldSimulateFailure(value: string): boolean {
  return value.toLowerCase().includes('fail');
}
