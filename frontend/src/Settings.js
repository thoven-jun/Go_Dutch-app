// src/Settings.js

import React from 'react';
import './Settings.css';

function Settings() {
  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>설정</h1>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav">
          <button disabled>테마 설정</button>
          <button disabled>기본 카테고리 관리</button>
        </nav>
        <main className="settings-panel">
          <div className="settings-placeholder">
            <h3>기능 준비 중</h3>
            <p>앱의 전체적인 설정을 변경하는 기능이 곧 추가될 예정입니다.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;