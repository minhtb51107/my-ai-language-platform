import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store'; // ĐÃ SỬA IMPORT

import AuthLayout from "@/core/layouts/AuthLayout"; // <-- Thêm /core
import LoginPage from "@/features/auth/pages/LoginPage"; 
import RegisterPage from "@/features/auth/pages/RegisterPage"; 

import MainLayout from "@/core/layouts/MainLayout"; // <-- Thêm /core
import ChatPage from '@/features/chat/pages/ChatPage';

export default function App() {
  const { fetchProfile, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      fetchProfile();
    } else {
      useAuthStore.setState({ isLoading: false });
    }

    const handleUnauthorized = () => useAuthStore.getState().logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated ? (
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        ) : (
          <Route element={<MainLayout />}>
            <Route index element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}