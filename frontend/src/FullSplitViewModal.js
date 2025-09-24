// src/FullSplitViewModal.js

import React from 'react';

// 아이콘 및 헬퍼 함수는 EditExpenseModal에서 가져옵니다.
const LockIcon = ({ isLocked }) => ( <svg width="16" height="16" viewBox="0 0 24 24" fill={isLocked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isLocked ? <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /> : <path d="M5 11H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2m-4-4a5 5 0 0 0-10 0v4h10V7z" />}</svg> );

function FullSplitViewModal({
  isOpen,
  onClose,
  participants,
  splitMethod,
  splitDetailStrings,
  lockedParticipants,
  handleSplitDetailChange,
  handleSplitDetailBlur,
  toggleLock
}) {
  if (!isOpen) return null;

  const modalTitle = splitMethod === 'amount' ? '분담할 금액 전체보기' : '분담할 비율 전체보기';

  return (
    <div className="modal-overlay full-split-view-overlay">
      <div className="modal-content full-split-view-modal" onClick={e => e.stopPropagation()}>
        <h2>{modalTitle}</h2>
        
        <div className="full-split-list">
          {participants.map(p => (
            <div key={p.id} className="split-detail-row">
              <label htmlFor={`full-split-${p.id}`}>{p.name}</label>
              <div className="input-with-unit">
                <input
                  id={`full-split-${p.id}`}
                  type="text"
                  value={splitDetailStrings[p.id] || ''}
                  onChange={e => handleSplitDetailChange(p.id, e.target.value)}
                  onBlur={() => handleSplitDetailBlur(p.id)}
                  placeholder="0"
                  inputMode="numeric"
                  disabled={lockedParticipants.has(p.id)}
                />
                <span>{splitMethod === 'amount' ? '원' : '%'}</span>
              </div>
              <button
                type="button"
                className={`lock-button ${lockedParticipants.has(p.id) ? 'locked' : ''}`}
                onClick={() => toggleLock(p.id)}
                title={lockedParticipants.has(p.id) ? '금액 잠금 해제' : '금액 잠금'}
              >
                <LockIcon isLocked={lockedParticipants.has(p.id)} />
              </button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <div className="modal-buttons">
            <button type="button" className="confirm-button" onClick={onClose}>완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullSplitViewModal;