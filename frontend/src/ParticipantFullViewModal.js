import React, { useState, useRef } from 'react';

function ParticipantFullViewModal({
  isOpen,
  onClose,
  participants,
  setParticipants,
  handleParticipantChange,
  addParticipantInput,
  removeParticipantInput
}) {
  // ✨ [수정] 데스크탑 드래그앤드롭 전용 Ref 및 모바일 확인
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (!isOpen) return null;

  // --- ✨ [수정] 데스크탑 전용 드래그앤드롭 핸들러 ---
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _participants = [...participants];
    const draggedItemContent = _participants.splice(dragItem.current, 1)[0];
    _participants.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setParticipants(_participants);
  };

  return (
    <div className="modal-overlay full-split-view-overlay">
      <div className="modal-content full-split-view-modal participant-full-view" onClick={e => e.stopPropagation()}>
        <h2>참여자 전체보기</h2>
        
        <div className="full-split-list">
          {participants.map((participant, index) => (
            <div 
              key={participant.id} 
              // ✨ [핵심 수정] 모바일에서는 드래그 관련 클래스와 속성, 이벤트를 적용하지 않음
              className={`participant-input-row ${!isMobile ? 'draggable-item' : ''}`}
              draggable={!isMobile}
              onDragStart={!isMobile ? () => (dragItem.current = index) : undefined}
              onDragEnter={!isMobile ? () => (dragOverItem.current = index) : undefined}
              onDragEnd={!isMobile ? handleDragSort : undefined}
              onDragOver={!isMobile ? (e) => e.preventDefault() : undefined}
            >
              {/* ✨ [핵심 수정] 데스크탑에서만 드래그 핸들 아이콘 표시 */}
              {!isMobile && <span>☰</span>}
              <input
                type="text"
                value={participant.name}
                onChange={e => handleParticipantChange(participant.id, e.target.value)}
                placeholder={`참여자 ${index + 1}`}
              />
              <button type="button" onClick={() => removeParticipantInput(participant.id)} className="remove-participant-btn">×</button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button type="button" className="add-participant-btn" onClick={addParticipantInput}>
            + 참여자 추가
          </button>
          <div className="modal-buttons">
            <button type="button" className="confirm-button" onClick={onClose}>완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParticipantFullViewModal;