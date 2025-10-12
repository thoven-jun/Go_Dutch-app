import React, { useState, useEffect, useRef } from 'react';
import ParticipantFullViewModal from './ParticipantFullViewModal';

let nextId = 0;
const createParticipant = (name = '') => ({
  id: nextId++,
  name,
});

function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const [projectName, setProjectName] = useState('');
  // ✨ [추가] 프로젝트 유형 및 날짜 상태
  const [projectType, setProjectType] = useState('general');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [participants, setParticipants] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [duplicateIndices, setDuplicateIndices] = useState([]);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const listContainer = useRef(null);
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    if (isOpen) {
      nextId = 0;
      // ✨ 모달이 열릴 때 상태 초기화
      setProjectName('');
      setParticipants([createParticipant(), createParticipant()]);
      setProjectType('general');
      setStartDate('');
      setEndDate('');
      setValidationError('');
      setDuplicateIndices([]);
      setIsFullViewOpen(false);
    }
  }, [isOpen]);

  const handleParticipantChange = (id, value) => {
    setParticipants(prevParticipants => 
      prevParticipants.map(p => (p.id === id ? { ...p, name: value } : p))
    );
    if (validationError) {
      setValidationError('');
      setDuplicateIndices([]);
    }
  };
  
  const addParticipantInput = () => {
    setParticipants([...participants, createParticipant()]);
  };

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

    const finalProjectName = projectName.trim();
    if (!finalProjectName) {
      setValidationError('프로젝트 이름을 입력해주세요.');
      return;
    }
    
    // ✨ [추가] 여행 유형일 경우 날짜 유효성 검사
    if (projectType === 'travel' && (!startDate || !endDate)) {
      setValidationError('여행 기간을 모두 입력해주세요.');
      return;
    }
    if (projectType === 'travel' && new Date(startDate) > new Date(endDate)) {
        setValidationError('시작일은 종료일보다 이전이어야 합니다.');
        return;
    }
    
    if (participants.some(p => p.name.trim() === '')) {
      setValidationError('참여자 이름을 모두 입력해주세요.');
      return;
    }
    
    const participantData = participants.map((p, index) => ({ name: p.name.trim(), originalIndex: index }));
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
    
    // ✨ [수정] onCreateProject 호출 시 유형과 날짜 정보 전달
    onCreateProject({
      name: finalProjectName,
      type: projectType,
      startDate: projectType === 'travel' ? startDate : null,
      endDate: projectType === 'travel' ? endDate : null,
      participants: participantData.map(p => p.name)
    });
  };

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

              {/* ✨ [추가] 프로젝트 유형 선택 UI */}
              <div className="form-group">
                <label>정산 유형</label>
                <div className="project-type-selector">
                  <button type="button" className={`project-type-button ${projectType === 'general' ? 'active' : ''}`} onClick={() => setProjectType('general')}>일반</button>
                  <button type="button" className={`project-type-button ${projectType === 'travel' ? 'active' : ''}`} onClick={() => setProjectType('travel')}>여행</button>
                  <button type="button" className={`project-type-button ${projectType === 'gathering' ? 'active' : ''}`} onClick={() => setProjectType('gathering')}>회식/모임</button>
                </div>
              </div>

              {/* ✨ [추가] 여행 유형 선택 시 날짜 입력 UI */}
              {projectType === 'travel' && (
                <div className="form-group">
                  <label>여행 기간</label>
                  <div className="date-range-picker">
                    <div className="date-input-group">
                      <label htmlFor="start-date">시작일</label>
                      <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <span className="tilde">~</span>
                    <div className="date-input-group">
                      <label htmlFor="end-date">종료일</label>
                      <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

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
                      className={`participant-input-row ${!isMobile ? 'draggable-item' : ''}`}
                      draggable={!isMobile}
                      onDragStart={!isMobile ? () => (dragItem.current = index) : undefined}
                      onDragEnter={!isMobile ? () => (dragOverItem.current = index) : undefined}
                      onDragEnd={!isMobile ? handleDragSort : undefined}
                      onDragOver={!isMobile ? (e) => e.preventDefault() : undefined}
                    >
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