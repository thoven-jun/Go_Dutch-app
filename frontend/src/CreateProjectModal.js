import React, { useState, useEffect, useRef } from 'react';
import ParticipantFullViewModal from './ParticipantFullViewModal';

let nextId = 0;
const createParticipant = (name = '') => ({
  id: nextId++,
  name,
});

function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const [projectName, setProjectName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [duplicateIndices, setDuplicateIndices] = useState([]);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  
  // ✨ [수정] 데스크탑 드래그앤드롭 전용 Ref
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const listContainer = useRef(null);
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    if (isOpen) {
      nextId = 0;
      setParticipants([createParticipant(), createParticipant()]);
      setProjectName('');
      setValidationError('');
      setDuplicateIndices([]);
      setIsFullViewOpen(false);
    }
  }, [isOpen]);

  // ✨ [수정] ID를 기준으로 참여자 이름을 변경합니다.
  const handleParticipantChange = (id, value) => {
    setParticipants(prevParticipants => 
      prevParticipants.map(p => (p.id === id ? { ...p, name: value } : p))
    );
    if (validationError) {
      setValidationError('');
      setDuplicateIndices([]);
    }
  };
  
  // ✨ [수정] 새 참여자 객체를 추가합니다.
  const addParticipantInput = () => {
    setParticipants([...participants, createParticipant()]);
  };

  // ✨ [수정] ID를 기준으로 참여자를 삭제합니다.
  const removeParticipantInput = (id) => {
    if (participants.length <= 2) {
      alert('참여자는 최소 2명 이상이어야 합니다.');
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    setDuplicateIndices([]);

    if (participants.some(p => p.name.trim() === '')) {
      setValidationError('참여자 이름을 모두 입력해주세요.');
      return;
    }

    const finalProjectName = projectName.trim();
    // ✨ [수정] 객체의 name 속성을 사용하도록 수정
    const participantData = participants.map((p, index) => ({ name: p.name.trim(), originalIndex: index }));

    if (!finalProjectName) {
      setValidationError('프로젝트 이름을 입력해주세요.');
      return;
    }
    if (participantData.length < 2) {
      setValidationError('참여자를 두 명 이상 추가해주세요.');
      return;
    }

    const nameCounts = participantData.reduce((acc, p) => {
      acc[p.name] = (acc[p.name] || 0) + 1;
      return acc;
    }, {});
    const duplicateNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);

    if (duplicateNames.length > 0) {
      const indicesToHighlight = participantData
        .filter(p => duplicateNames.includes(p.name))
        .map(p => p.originalIndex);
      setDuplicateIndices(indicesToHighlight);
      setValidationError('참여자 이름은 중복될 수 없습니다. 동명이인이 있다면 별명을 붙여주세요.');
      return;
    }
    
    onCreateProject(finalProjectName, participantData.map(p => p.name));
  };

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
    <>
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content create-project-modal" onClick={e => e.stopPropagation()}>
            <h2>새로운 정산 시작하기</h2>
            <form onSubmit={handleSubmit} id="create-project-form">
              <div className="form-group">
                <label htmlFor="project-name">정산 이름</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="예: 강릉 여행"
                  autoFocus
                />
              </div>
              <div className="form-group participant-form-group">
                <div className="form-label-header">
                  <label>참여자</label>
                  <button type="button" className="view-all-button" onClick={() => setIsFullViewOpen(true)}>
                    전체보기
                  </button>
                </div>
                <div className="participant-list-container" ref={listContainer}>
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
                        className={duplicateIndices.includes(index) ? 'input-error' : ''}
                      />
                      {participants.length > 2 && (
                        <button type="button" onClick={() => removeParticipantInput(participant.id)} className="remove-participant-btn">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addParticipantInput} className="add-participant-btn">
                  + 참여자 추가
                </button>
              </div>
            </form>
            <div className="modal-footer">
              {validationError && <p className="error-message">{validationError}</p>}
              <div className="modal-buttons">
                <button type="button" className="cancel-button" onClick={onClose}>취소</button>
                <button type="submit" form="create-project-form" className="confirm-button">생성</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ParticipantFullViewModal
        isOpen={isFullViewOpen}
        onClose={() => setIsFullViewOpen(false)}
        participants={participants}
        setParticipants={setParticipants}
        handleParticipantChange={handleParticipantChange}
        addParticipantInput={addParticipantInput}
        removeParticipantInput={removeParticipantInput}
      />
    </>
  );
}

export default CreateProjectModal;