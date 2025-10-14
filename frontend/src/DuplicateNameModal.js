import React, { useState, useEffect } from 'react';
import './DuplicateNameModal.css';

function DuplicateNameModal({ isOpen, onClose, onSave, duplicates, newName, editingParticipantId }) {
  const [names, setNames] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialNames = {};
      duplicates.forEach(p => {
        initialNames[p.id] = p.name;
      });
      initialNames['new'] = newName;
      setNames(initialNames);
      setError('');
    }
  }, [isOpen, duplicates, newName]);

  if (!isOpen) {
    return null;
  }

  const handleNameChange = (id, value) => {
    setNames(prev => ({ ...prev, [id]: value }));
    if (error) {
      setError('');
    }
  };

  const handleSave = () => {
    const nameValues = Object.values(names).map(name => name.trim());
    
    if (nameValues.some(name => name === '')) {
      setError('참여자 이름은 비워둘 수 없습니다.');
      return;
    }
    
    const uniqueNames = new Set(nameValues);
    if (uniqueNames.size !== nameValues.length) {
      setError('참여자 이름은 중복될 수 없습니다. 각 참여자의 이름을 다르게 지정해주세요.');
      return;
    }
    
    onSave(names);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content duplicate-modal" onClick={e => e.stopPropagation()}>
        <h2>동명이인 발생</h2>
        <p>이미 '{newName}'님이 있습니다. 명확한 구분을 위해 각 참여자의 별명을 포함하여 이름을 수정해주세요.</p>
        
        {/* --- ✨ [수정] UI 구조 개선 --- */}
        <div className="duplicate-list">
          <div className="form-group">
            <label>기존 참여자</label>
            {duplicates.map(p => (
              <input
                key={p.id}
                type="text"
                value={names[p.id] || ''}
                onChange={(e) => handleNameChange(p.id, e.target.value)}
              />
            ))}
          </div>
          <div className="form-group">
            <label>{editingParticipantId ? '수정 참여자' : '새 참여자'}</label>
            <input
              type="text"
              value={names['new'] || ''}
              onChange={(e) => handleNameChange('new', e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-footer">
            {error && <p className="error-message">{error}</p>}
            <div className="modal-buttons">
                <button type="button" className="cancel-button" onClick={onClose}>취소</button>
                <button type="button" className="confirm-button" onClick={handleSave}>저장</button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default DuplicateNameModal;