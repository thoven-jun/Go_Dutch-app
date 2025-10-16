// src/Settings.js

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Settings.css';

const DownloadIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> );
const UploadIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> );
const TrashIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> );


// ▼▼▼ [신설] 계정 관리 패널 컴포넌트 ▼▼▼
function AccountSettingsPanel({ apiBaseUrl, showAlert, authorizedFetch, openDestructiveModal, closeDestructiveModal, onLogout, onUserUpdate }) {
  const [user, setUser] = useState({ name: '' });
  const [originalName, setOriginalName] = useState(''); // 이름 변경 취소를 위한 원본 이름 상태
  const [isEditingName, setIsEditingName] = useState(false);
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
    useEffect(() => {
    authorizedFetch(`${apiBaseUrl}/auth/me`)
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setUser(data);
          setOriginalName(data.name); // 원본 이름 저장
        }
      })
      .catch(err => console.error("Failed to fetch user info", err));
  }, [apiBaseUrl, authorizedFetch]);

  // 이름 변경 취소 핸들러
  const handleCancelEditName = () => {
    setUser(prev => ({ ...prev, name: originalName }));
    setIsEditingName(false);
  };

  // 비밀번호 변경 취소 핸들러
  const handleCancelEditPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditingPassword(false);
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    authorizedFetch(`${apiBaseUrl}/auth/profile`, {
      method: 'PATCH',
      body: JSON.stringify({ name: user.name }),
    })
    .then(res => {
      if (!res.ok) throw new Error('이름 변경에 실패했습니다.');
      return res.json();
    })
    .then(updatedUser => {
      showAlert('성공', '이름이 성공적으로 변경되었습니다.');
      setOriginalName(updatedUser.name);
      setIsEditingName(false);
      onUserUpdate(); // ▼▼▼ [추가] 이름 변경 성공 시 부모 컴포넌트에 알림 ▼▼▼
    })
    .catch(err => showAlert('오류', err.message));
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showAlert('오류', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    authorizedFetch(`${apiBaseUrl}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    .then(res => res.json().then(data => {
      if (!res.ok) {
        throw new Error(data.message || '비밀번호 변경 중 오류가 발생했습니다.');
      }
      showAlert('성공', data.message);
      handleCancelEditPassword(); // 성공 시 입력 필드 초기화 및 폼 숨기기
    }))
    .catch(err => {
      showAlert('오류', err.message);
    });
  };

  const handleAccountDelete = () => {
    const performDelete = (password) => {
      authorizedFetch(`${apiBaseUrl}/auth/delete-account`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      .then(res => res.json().then(data => {
        if (!res.ok) {
          throw new Error(data.message || '계정 삭제에 실패했습니다.');
        }
        showAlert('계정 삭제 완료', '계정이 영구적으로 삭제되었습니다.');
        closeDestructiveModal();
        onLogout(); // 삭제 성공 시 로그아웃 처리
      }))
      .catch(err => {
        // ▼▼▼ [수정] showAlert 대신, 오류 메시지를 포함하여 모달을 다시 엽니다. ▼▼▼
        openDestructiveModal({
          title: '계정 영구 삭제',
          mainContent: '계정을 삭제하면 모든 프로젝트와 관련 데이터가 영구적으로 사라지며, 복구할 수 없습니다. 계속 진행하시려면 비밀번호를 입력해주세요.',
          consequences: [],
          confirmText: '계정 삭제',
          requiresPassword: true,
          onConfirm: performDelete,
          errorMessage: err.message // 오류 메시지를 전달합니다.
        });
        // ▲▲▲ [수정] 완료 ▲▲▲
      });
    };

    openDestructiveModal({
      title: '계정 영구 삭제',
      mainContent: '계정을 삭제하면 모든 프로젝트와 관련 데이터가 영구적으로 사라지며, 복구할 수 없습니다. 계속 진행하시려면 비밀번호를 입력해주세요.',
      consequences: [],
      confirmText: '계정 삭제',
      requiresPassword: true,
      onConfirm: performDelete,
      errorMessage: '' // 처음 열 때는 오류 메시지가 없습니다.
    });
  };

  return (
    <div className="settings-section">
      <h2>계정 관리</h2>
      <p className="section-description">프로필 정보 및 비밀번호를 관리할 수 있습니다.</p>
      
      {/* ▼▼▼▼▼ [수정] 이름 변경 UI (수정 모드에 따라 다르게 렌더링) ▼▼▼▼▼ */}
      <div className="account-setting-section">
        <div className="setting-section-header">
          <h3>이름</h3>
        </div>
        <div className="setting-section-content">
          {isEditingName ? (
            <form onSubmit={handleProfileUpdate} className="edit-form-layout">
              <input 
                id="user-name" 
                type="text" 
                value={user.name} 
                onChange={e => setUser(prev => ({ ...prev, name: e.target.value }))} 
                autoFocus 
              />
              <div className="action-area">
                <button type="button" className="settings-button cancel-button" onClick={handleCancelEditName}>취소</button>
                <button type="submit" className="settings-button confirm-button">저장</button>
              </div>
            </form>
          ) : (
            <>
              <span className="display-value">{user.name}</span>
              <div className="action-area">
                <button className="settings-button" onClick={() => setIsEditingName(true)}>이름 변경</button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* ▲▲▲▲▲ [수정] 완료 ▲▲▲▲▲ */}

      <hr className="section-divider" />

      {/* ▼▼▼▼▼ [수정] 비밀번호 변경 UI (수정 모드에 따라 다르게 렌더링) ▼▼▼▼▼ */}
      <div className="account-setting-section">
        <div className="setting-section-header">
          <h3>비밀번호</h3>
        </div>
        <div className="setting-section-content">
          {isEditingPassword ? (
            <form onSubmit={handlePasswordChange} className="edit-form-layout column">
              <div className="form-fields">
                <div className="form-group">
                  <label htmlFor="current-password">현재 비밀번호</label>
                  <input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password">새 비밀번호</label>
                  <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">새 비밀번호 확인</label>
                  <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
              </div>
              <div className="action-area">
                <button type="button" className="settings-button cancel-button" onClick={handleCancelEditPassword}>취소</button>
                <button type="submit" className="settings-button confirm-button">변경 저장</button>
              </div>
            </form>
          ) : (
            <>
              <span className="display-value">••••••••</span>
              <div className="action-area">
                <button className="settings-button" onClick={() => setIsEditingPassword(true)}>비밀번호 변경</button>
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="section-divider" />

      {/* ▼▼▼ [신설] 계정 삭제 UI ▼▼▼ */}
      <div className="account-setting-section destructive">
        <div className="setting-section-header">
          <h3>계정 삭제</h3>
          <p className="section-description">
            계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="setting-section-content">
          <button className="settings-button destructive-button" onClick={handleAccountDelete}>
            계정 영구 삭제
          </button>
        </div>
      </div>
      {/* ▲▲▲ [신설] 완료 ▲▲▲ */}
    </div>
  );
}

function Settings({ onUserUpdate, apiBaseUrl, showAlert, onUpdate, openDestructiveModal, closeDestructiveModal, openImportModal, authorizedFetch, onLogout }) {
    const [activeTab, setActiveTab] = useState('account');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleExportData = () => {
        authorizedFetch(`${apiBaseUrl}/db`)
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
    
    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data && Array.isArray(data.projects)) {
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
    
    const handleResetApp = () => {
        const performReset = () => {
        authorizedFetch(`${apiBaseUrl}/reset`, { method: 'POST' })
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
                    <button className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>
                        계정 관리
                    </button>
                    <button className={activeTab === 'data' ? 'active' : ''} onClick={() => setActiveTab('data')}>
                        데이터 관리
                    </button>
                    <button className={activeTab === 'reset' ? 'active' : ''} onClick={() => setActiveTab('reset')}>
                        초기화
                    </button>
                    <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>
                        정보
                    </button>
                </nav>
        
                <main className="global-settings-panel">
                    {activeTab === 'account' && (
                        <AccountSettingsPanel 
                          apiBaseUrl={apiBaseUrl}
                          showAlert={showAlert}
                          authorizedFetch={authorizedFetch}
                          openDestructiveModal={openDestructiveModal} // prop 전달
                          closeDestructiveModal={closeDestructiveModal} // prop 전달
                          onLogout={onLogout} // prop 전달
                          onUserUpdate={onUserUpdate}
                        />
                    )}
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
                            <p>백업된 JSON 파일을 불러와 앱의 데이터를 복원합니다. <span className="warning-text">가져온 데이터는 현재 데이터에 추가됩니다.</span></p>
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
                            <a href="https://github.com/jy-devloper/Go-Dutch-Web" target="_blank" rel="noopener noreferrer">GitHub</a>
                        </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function SettingsWrapper({ onLogout, ...props }) {
  return <Settings {...props} onLogout={onLogout} />;
}