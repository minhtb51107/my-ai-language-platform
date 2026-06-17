import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { authService } from '@/features/auth/services/auth.service';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true); setApiError(null);
      await authService.register(data.email, data.password, data.fullname);
      alert('Đăng ký thành công! Vui lòng đăng nhập.'); 
      navigate('/login');
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-zinc-200 shadow-sm sm:p-8 p-6">
      <div className="mb-6 space-y-1 text-center sm:text-left">
        <h2 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h2>
        <p className="text-sm text-zinc-500">Bắt đầu hành trình chinh phục ngôn ngữ cùng AI</p>
      </div>

      {apiError && <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-600">{apiError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Họ và Tên</label>
          <input {...register('fullname')} placeholder="Nguyễn Văn A" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
          {errors.fullname && <p className="text-sm text-red-500">{errors.fullname.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input {...register('email')} type="email" placeholder="name@example.com" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mật khẩu</label>
            <input {...register('password')} type="password" placeholder="••••••••" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Xác nhận mật khẩu</label>
            <input {...register('confirmPassword')} type="password" placeholder="••••••••" disabled={isLoading} className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50" />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="mt-6 flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Đăng ký
        </button>

        <div className="mt-4 text-center text-sm text-zinc-500">
          Đã có tài khoản? <Link to="/login" className="font-medium text-blue-600 hover:underline">Đăng nhập</Link>
        </div>
      </form>
    </div>
  );
}