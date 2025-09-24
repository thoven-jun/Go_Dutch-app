import React, { useState, useEffect } from 'react';

function ParticipantOrderModal({ isOpen, onClose, project, onSave, apiBaseUrl }) {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (isOpen && project?.participants) {
      // orderIndex를 기준으로 정렬하여 초기 상태 설정
      const sortedParticipants = [...project.participants].sort((a, b) => a.orderIndex - b.orderIndex);
      setParticipants(sortedParticipants);
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
      onSave(); // 부모 컴포넌트에 저장 완료 알림
      onClose();
    })
    .catch(error => console.error("Error saving participant order:", error));
  };

  // 임시 드래그 앤 드롭 핸들러 (라이브러리 없이 단순 구현)
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("draggedIndex", index);
  };

  const handleDrop = (e, dropIndex) => {
    const draggedIndex = e.dataTransfer.getData("draggedIndex");
    if (draggedIndex === null) return;

    const items = [...participants];
    const [reorderedItem] = items.splice(draggedIndex, 1);
    items.splice(dropIndex, 0, reorderedItem);
    setParticipants(items);
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content participant-order-modal">
        <h2>참여자 순서 편집</h2>
        <p>참여자를 드래그하여 순서를 변경하세요.</p>
        <ul className="order-list">
          {participants.map((p, index) => (
            <li
              key={p.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span>☰</span> {p.name}
            </li>
          ))}
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