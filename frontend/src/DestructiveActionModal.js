// src/DestructiveActionModal.js

import React, { useState, useEffect } from 'react';

const WarningIcon = () => ( <svg xmlns="http://www.w.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> );

function DestructiveActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  mainContent,
  consequences,
  confirmText
}) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmEnabled = inputValue === confirmText;

  return (
    <div className="modal-overlay">
      <div className="modal-content destructive-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">
          <WarningIcon />
        </div>
        <h2>{title}</h2>
        <p className="main-content">{mainContent}</p>

        {consequences && consequences.length > 0 && (
          <div className="consequences-section">
            <strong>⚠️ 주의사항</strong>
            <ul>
              {consequences.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="confirm-input-section">
          <p>이 작업을 계속하려면, 아래에 '<span className="confirm-text-highlight">{confirmText}</span>'을(를) 입력하세요.</p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>취소</button>
            <button
              type="button"
              className="confirm-button destructive"
              onClick={onConfirm}
              disabled={!isConfirmEnabled}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DestructiveActionModal;