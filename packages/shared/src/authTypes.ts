import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);

export const passwordSchema = z.string().min(8).max(128);

export const authLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export const authRegisterSchema = authLoginSchema.extend({
  displayName: z.string().trim().min(1).max(40).optional()
});

export const createUserSchema = authRegisterSchema.extend({
  role: z.enum(["admin", "user"]).default("user")
});

export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  role: z.enum(["admin", "user"]).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional()
});

export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AuthSession {
  token: string;
  user: AppUser;
}

export interface AuthLoginSession {
  id: string;
  userId: string;
  username: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  current?: boolean;
}
