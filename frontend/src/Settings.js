import React, { useState } from 'react';
import './Settings.css';

const SunIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> );
const MoonIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> );

const ThemeSettings = ({ theme, onThemeChange }) => (
  <>
    <h2>테마 설정</h2>
    <p className="section-description">앱의 전체적인 테마를 라이트 또는 다크 모드로 변경합니다.</p>
    <div className="theme-selector">
      <button
        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
        onClick={() => onThemeChange('light')}
      >
        <SunIcon />
        <span>라이트</span>
      </button>
      <button
        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => onThemeChange('dark')}
      >
        <MoonIcon />
        <span>다크</span>
      </button>
    </div>
  </>
);

function Settings({ theme, onThemeChange }) {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>설정</h1>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav">
          <button 
            className={activeTab === 'theme' ? 'active' : ''} 
            onClick={() => setActiveTab('theme')}
          >
            테마 설정
          </button>
          <button 
            className={activeTab === 'categories' ? 'active' : ''} 
            onClick={() => setActiveTab('categories')}
            disabled // 아직 구현되지 않았으므로 비활성화
          >
            기본 카테고리 관리
          </button>
        </nav>
        <main className="settings-panel">
          {activeTab === 'theme' && (
            <section className="settings-section">
              <ThemeSettings theme={theme} onThemeChange={onThemeChange} />
            </section>
          )}
          {activeTab === 'categories' && (
            <section className="settings-section">
              {/* 기본 카테고리 관리 UI가 여기에 들어갈 예정입니다. */}
              <h2>기본 카테고리 관리 (준비 중)</h2>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Settings;