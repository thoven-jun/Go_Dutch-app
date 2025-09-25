import React, { useState, useEffect, useRef } from 'react';

function ParticipantOrderModal({ isOpen, onClose, project, onSave, apiBaseUrl }) {
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  
  // 드래그앤드롭을 위한 Ref
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // ✨ [핵심 수정] 모바일 환경(터치 가능 기기)인지 확인
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    if (isOpen && project?.participants) {
      const sortedParticipants = [...project.participants].sort((a, b) => a.orderIndex - b.orderIndex);
      setParticipants(sortedParticipants);
      setSelectedId(null);
    }
  }, [isOpen, project]);

  const handleSaveOrder = () => {
    const orderedParticipantIds = participants.map(p => p.id);
    fetch(`${apiBaseUrl}/projects/${project.id}/participants/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedParticipantIds })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to save order');
      onSave();
      onClose();
    })
    .catch(error => console.error("Error saving participant order:", error));
  };

  // --- 모바일용: 탭(클릭) 이벤트 핸들러 ---
  const handleItemTap = (tappedIndex) => {
    if (selectedId === null) {
      setSelectedId(participants[tappedIndex].id);
    } else {
      const selectedParticipant = participants.find(p => p.id === selectedId);
      if (selectedParticipant && selectedParticipant.id === participants[tappedIndex].id) {
        setSelectedId(null);
        return;
      }
      const items = participants.filter(p => p.id !== selectedId);
      items.splice(tappedIndex, 0, selectedParticipant);
      setParticipants(items);
      setSelectedId(null);
    }
  };

  // --- 데스크탑용: 드래그앤드롭 정렬 핸들러 ---
  const handleDragSort = () => {
    let _participants = [...participants];
    const draggedItemContent = _participants.splice(dragItem.current, 1)[0];
    _participants.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setParticipants(_participants);
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content participant-order-modal">
        <h2>참여자 순서 편집</h2>
        {/* ✨ [수정] 환경에 따라 다른 안내 메시지 표시 */}
        <p>{isMobile ? 
            (selectedId === null ? '이동할 참여자를 선택하세요.' : '참여자를 이동시킬 위치를 선택하세요.') : 
            '참여자를 드래그하여 순서를 변경하세요.'}
        </p>
        <ul className="order-list">
          {participants.map((p, index) => {
            // ✨ [핵심 수정] 환경에 따라 다른 이벤트 핸들러를 li 요소에 부여
            const desktopEvents = {
              draggable: true,
              onDragStart: () => (dragItem.current = index),
              onDragEnter: () => (dragOverItem.current = index),
              onDragEnd: handleDragSort,
              onDragOver: (e) => e.preventDefault(),
            };
            const mobileEvents = {
              onClick: () => handleItemTap(index),
            };

            return (
              <li
                key={p.id}
                className={selectedId === p.id ? 'selected' : ''}
                {...(isMobile ? mobileEvents : desktopEvents)} // 환경에 맞는 이벤트 객체를 적용
              >
                <span>{isMobile ? (selectedId === p.id ? '◉' : '○') : '☰'}</span> {p.name}
              </li>
            );
          })}
        </ul>
        <div className="modal-footer">
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>취소</button>
            <button type="button" className="confirm-button" onClick={handleSaveOrder}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ParticipantOrderModal;