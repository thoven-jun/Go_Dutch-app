// src/pages/VerifyEmail.js

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './VerifyEmail.css';

function VerifyEmail({ apiBaseUrl, onLoginSuccess }) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('이메일 인증을 진행 중입니다...');
  const navigate = useNavigate();
  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current === true) {
      return;
    }

    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('유효하지 않은 접근입니다. 인증 토큰이 없습니다.');
      return;
    }

    fetch(`${apiBaseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    .then(res => res.json().then(data => {
      if (!res.ok) {
        throw new Error(data.message || '인증에 실패했습니다.');
      }
      return data;
    }))
    .then(data => {
      setStatus('success');
      setMessage('인증이 완료되었습니다! 잠시 후 메인 페이지로 이동합니다.');
      onLoginSuccess(data.accessToken);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    })
    .catch(err => {
      setStatus('error');
      setMessage(err.message);
    });

    return () => {
      effectRan.current = true;
    };
    
  }, [searchParams, apiBaseUrl, onLoginSuccess, navigate]);

  // ▼▼▼ [수정] 3가지 상태(verifying, success, error)를 모두 처리하도록 변경 ▼▼▼
  const renderTitle = () => {
    if (status === 'success') {
      return '✅ 인증 완료';
    }
    if (status === 'error') {
      return '❌ 인증 실패';
    }
    return '인증 확인 중...';
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        {status === 'verifying' && <div className="spinner"></div>}
        <h1>{renderTitle()}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
  // ▲▲▲ [수정] 완료 ▲▲▲
}

export default VerifyEmail;