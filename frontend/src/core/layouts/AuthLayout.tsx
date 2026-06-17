import { Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react'; // Icon đẹp từ lucide

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Cột trái: Branding (Ẩn trên mobile, hiện trên màn hình lớn) */}
      <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <span>MindRevol AI</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Nền tảng học ngoại ngữ <br />
            <span className="text-blue-500">Thông minh & Cá nhân hóa</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Trợ lý ảo AI sẽ tự động phân tích cảm xúc, ghi nhớ sở thích và đồng hành cùng bạn trên con đường chinh phục ngôn ngữ mới.
          </p>
        </div>
        
        <div className="text-sm text-zinc-500">
          © 2026 MindRevol. All rights reserved.
        </div>
      </div>

      {/* Cột phải: Form Đăng nhập/Đăng ký (Render ra từ React Router) */}
      <div className="flex w-full flex-col items-center justify-center bg-zinc-50 p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <Outlet /> {/* <-- Các trang Login/Register sẽ được nhúng vào đây */}
        </div>
      </div>
    </div>
  );
}