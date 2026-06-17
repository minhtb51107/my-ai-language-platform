import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email không đúng định dạng." }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." }),
});

export const registerSchema = z.object({
  fullname: z.string().min(2, { message: "Họ tên phải có ít nhất 2 ký tự." }),
  email: z.string().email({ message: "Email không đúng định dạng." }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu nhập lại không khớp.",
  path: ["confirmPassword"],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;