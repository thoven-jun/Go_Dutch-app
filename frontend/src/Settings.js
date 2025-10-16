// src/Settings.js

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Settings.css';

const DownloadIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> );
const UploadIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> );
const TrashIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> );

function Settings({ apiBaseUrl, showAlert, onUpdate, openDestructiveModal, closeDestructiveModal, openImportModal, authorizedFetch }) {
  const [activeTab, setActiveTab] = useState('data'); // 'data', 'reset', 'info'
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleExportData = () => {
    authorizedFetch(`${apiBaseUrl}/db`) // fetch -> authorizedFetch
      .then(response => response.json())
      .then(data => {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gudutch-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('데이터 내보내기 실패:', error);
        showAlert('오류', '데이터를 내보내는 중 오류가 발생했습니다.');
      });
  };
  
  // 👇 [추가] 데이터 가져오기 버튼 클릭 시 실행될 함수
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  // 👇 [추가] 파일이 선택되면 데이터를 읽고 서버로 전송하는 함수
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && Array.isArray(data.projects)) {
          // 👇 [수정] 서버로 바로 보내는 대신, 모달을 열어줍니다.
          openImportModal(data.projects);
        } else {
          showAlert('오류', '파일 형식이 올바르지 않습니다. projects 배열이 없습니다.');
        }
      } catch (error) {
        showAlert('오류', '올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };
  
  // 👇 [추가] 앱 초기화 버튼 클릭 시 실행될 함수
  const handleResetApp = () => {
    const performReset = () => {
      authorizedFetch(`${apiBaseUrl}/reset`, { method: 'POST' }) // fetch -> authorizedFetch
        .then(res => {
          if (!res.ok) throw new Error('Failed to reset data');
          onUpdate();
          navigate('/');
          closeDestructiveModal();
          showAlert('초기화 완료', '모든 데이터가 삭제되고 앱이 초기화되었습니다.');
        })
        .catch(err => {
          console.error(err);
          closeDestructiveModal();
          showAlert('오류', '데이터 초기화 중 오류가 발생했습니다.');
        });
    };
    
    openDestructiveModal({
      title: '앱 초기화',
      mainContent: '정말 모든 데이터를 삭제하고 앱을 초기 상태로 되돌리시겠습니까?',
      consequences: ['모든 프로젝트와 지출 내역이 영구적으로 삭제됩니다.', '이 작업은 되돌릴 수 없습니다.'],
      confirmText: '초기화',
      onConfirm: performReset
    });
  };

  return (
    <div className="manager-container settings-page">
      <header className="manager-header">
        <h1 className="page-title">전체 설정</h1>
        <Link to="/" className="close-button">돌아가기</Link>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          <button className={activeTab === 'data' ? 'active' : ''} onClick={() => setActiveTab('data')}>
            데이터 관리
          </button>
          <button className={activeTab === 'reset' ? 'active' : ''} onClick={() => setActiveTab('reset')}>
            데이터 초기화
          </button>
          <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>
            정보
          </button>
        </nav>

        <main className="global-settings-panel">
          {activeTab === 'data' && (
            <div className="settings-section">
              <h2>데이터 관리</h2>
              <p className="section-description">앱의 모든 데이터를 파일로 저장(내보내기)하거나, 저장된 파일로 복원(가져오기)할 수 있습니다.</p>
              <div className="settings-card">
                <div className="card-content">
                  <strong>데이터 내보내기 (백업)</strong>
                  <p>모든 프로젝트와 지출 내역을 JSON 파일로 컴퓨터에 저장합니다.</p>
                </div>
                <button className="settings-button" onClick={handleExportData}>
                  <DownloadIcon /> 내보내기
                </button>
              </div>
              <div className="settings-card">
                <div className="card-content">
                  <strong>데이터 가져오기 (복원)</strong>
                  <p>백업된 JSON 파일을 불러와 앱의 데이터를 복원합니다. <span className="warning-text">기존의 모든 데이터는 덮어씌워집니다.</span></p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".json" />
                <button className="settings-button" onClick={handleImportClick}>
                  <UploadIcon /> 가져오기
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="settings-section">
              <h2>데이터 초기화</h2>
              <div className="settings-card destructive">
                <div className="card-content">
                  <strong>앱 초기화</strong>
                  <p>모든 프로젝트와 지출 내역을 영구적으로 삭제하고 앱을 처음 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다.</p>
                </div>
                <button className="settings-button destructive-button" onClick={handleResetApp}>
                  <TrashIcon /> 모든 데이터 삭제
                </button>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="settings-section">
              <h2>정보</h2>
              <div className="info-card">
                <span>버전: v1.0.0 (베타)</span>
                <a href="#" target="_blank" rel="noopener noreferrer">피드백 보내기</a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Settings;