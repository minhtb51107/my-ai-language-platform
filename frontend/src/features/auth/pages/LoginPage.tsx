import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'; 
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/store/auth.store';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true); setApiError(null);
      const res = await authService.login(data.email, data.password);
      login(res.data?.accessToken || res.accessToken, res.data?.user || res.user);
      navigate('/');
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Lỗi kết nối máy chủ.');
    } finally { setIsLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true); setApiError(null);
      const res = await authService.googleLogin(credentialResponse.credential);
      login(res.data?.accessToken || res.accessToken, res.data?.user || res.user);
      navigate('/');
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Đăng nhập Google thất bại.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-zinc-200 shadow-sm sm:p-8 p-6">
      <div className="mb-6 space-y-1 text-center sm:text-left">
        <h2 className="text-3xl font-bold tracking-tight">Đăng nhập</h2>
        <p className="text-sm text-zinc-500">Nhập email và mật khẩu để tiếp tục học tập</p>
      </div>

      {apiError && <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-600">{apiError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input {...register('email')} type="email" placeholder="name@example.com" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Mật khẩu</label>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Quên mật khẩu?</Link>
          </div>
          <input {...register('password')} type="password" placeholder="••••••••" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="mt-6 flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Đăng nhập
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
        <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-zinc-500">Hoặc</span></div>
      </div>

      <div className="flex justify-center w-full">
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setApiError('Lỗi Google')} useOneTap width="100%" />
      </div>

      <div className="mt-6 text-center text-sm text-zinc-500">
        Chưa có tài khoản? <Link to="/register" className="font-medium text-blue-600 hover:underline">Đăng ký ngay</Link>
      </div>
    </div>
  );
}