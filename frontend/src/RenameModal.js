// src/RenameModal.js

import React, { useState, useEffect } from 'react';

function RenameModal({ isOpen, onClose, onRename, currentName }) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onRename(name);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content rename-modal" onClick={e => e.stopPropagation()}>
        <h2>프로젝트 이름 변경</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>취소</button>
            {/* 'rename-button'을 'confirm-button'으로 변경 */}
            <button type="submit" className="confirm-button">변경</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RenameModal;