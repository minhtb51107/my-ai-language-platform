import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx'
import './index.css'
import 'katex/dist/katex.min.css';

// Thay thế bằng Client ID thực tế lấy từ Google Cloud Console của bạn
const GOOGLE_CLIENT_ID = "758520677856-j98pg9k2fju9545q0ffffmsnr9b1qtk9.apps.googleusercontent.com"; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)