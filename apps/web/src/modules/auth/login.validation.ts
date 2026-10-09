import { z } from 'zod';

/**
 * Matches login.component.ts's actual FormGroup validators exactly:
 * username/password are both `Validators.required` only (no min-length —
 * the Angular form never enforced one, so this pass doesn't invent one
 * either), and recaptcha is `Validators.required` too (this Angular version
 * shows the captcha unconditionally, no showCaptcha feature flag).
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Please enter username'),
  password: z.string().min(1, 'Please enter valid password'),
  recaptcha: z.string().min(1, 'Please confirm you are not a robot'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
