// src/pages/Register.js

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom'; // useNavigate 제거
import ReCAPTCHA from 'react-google-recaptcha';
import './Auth.css';

const EyeIcon = ({ isVisible }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {isVisible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </>
    )}
  </svg>
);

function Register({ apiBaseUrl }) { 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false); // 이 줄을 추가합니다.
      return;
    }

    const recaptchaToken = recaptchaRef.current.getValue();
    if (!recaptchaToken) {
      setError('"로봇이 아닙니다"를 체크해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, recaptchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '회원가입에 실패했습니다.');
      }
      
      // ▼▼▼ [수정] 자동 로그인 대신 성공 메시지 설정 ▼▼▼
      setSuccessMessage(data.message);

    } catch (err) {
      setError(err.message);
      recaptchaRef.current.reset();
    } finally {
      setIsLoading(false); // ▼▼▼ [추가] 성공/실패 여부와 관계없이 로딩 종료 ▼▼▼
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <h1 className="auth-title">Go Dutch</h1>
        {successMessage ? (
          <div className="auth-success">
            <h2>✅ 이메일을 확인해주세요</h2>
            <p>{successMessage}</p>
            <Link to="/login" className="auth-button">로그인 페이지로</Link>
          </div>
        ) : (
          <>
            <h2 className="auth-subtitle">새로운 계정 만들기</h2>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required autoFocus />
              </div>
              <div className="form-group">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required />
              </div>
              <div className="form-group password-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  <EyeIcon isVisible={showPassword} />
                </button>
              </div>
              
              <div className="form-group password-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 확인"
                  required
                />
              </div>
              <div className="recaptcha-wrapper">
                <ReCAPTCHA ref={recaptchaRef} sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY} />
              </div>
              {error && <p className="error-message">{error}</p>}

              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? '처리 중...' : '회원가입'}
              </button>
            </form>
            <div className="auth-footer">
              <span>이미 계정이 있으신가요?</span>
              <Link to="/login">로그인</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;