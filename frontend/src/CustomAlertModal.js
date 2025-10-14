import React from 'react';
import './CustomAlertModal.css';

function CustomAlertModal({ isOpen, onClose, title, message, onConfirm }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay alert-modal-overlay">
      <div className="modal-content alert-modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          {onConfirm && ( // onConfirm 함수가 있을 때만 '취소' 버튼 표시
            <button type="button" className="cancel-button" onClick={onClose}>
              취소
            </button>
          )}
          <button 
            type="button" 
            className="confirm-button" 
            onClick={onConfirm ? onConfirm : onClose}
          >
            {onConfirm ? '확인' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomAlertModal;