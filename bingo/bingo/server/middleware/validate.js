// server/middleware/validate.js
import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(4000),
  // captchaToken: z.string().min(1).optional(), // add later
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
  // captchaToken: z.string().min(1).optional(),
});

export const resetConfirmSchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(200),
});

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    next();
  };
}
