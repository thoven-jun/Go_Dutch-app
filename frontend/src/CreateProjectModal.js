import React, { useState, useEffect } from 'react';

function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const [projectName, setProjectName] = useState('');
  const [participants, setParticipants] = useState(['']);
  const [validationError, setValidationError] = useState('');
  // ✨ 중복된 입력창의 인덱스를 저장할 상태 추가
  const [duplicateIndices, setDuplicateIndices] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setParticipants(['']);
      setValidationError('');
      // ✨ 모달이 열릴 때 상태 초기화
      setDuplicateIndices([]);
    }
  }, [isOpen]);

  const handleParticipantChange = (index, value) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);
    // ✨ 사용자가 값을 수정하면 오류 표시를 즉시 제거
    if (validationError) {
      setValidationError('');
      setDuplicateIndices([]);
    }
  };

  const addParticipantInput = () => {
    setParticipants([...participants, '']);
  };

  const removeParticipantInput = (index) => {
    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    // ✨ 유효성 검사 전에 항상 초기화
    setDuplicateIndices([]);

    const finalProjectName = projectName.trim();
    // ✨ 이름과 원래 인덱스를 함께 처리
    const participantData = participants
      .map((name, index) => ({ name: name.trim(), index }))
      .filter(p => p.name);

    // --- 유효성 검사 로직 ---
    if (!finalProjectName) {
      setValidationError('프로젝트 이름을 입력해주세요.');
      return;
    }
    if (participantData.length === 0) {
      setValidationError('참여자를 한 명 이상 추가해주세요.');
      return;
    }

    // ✨ --- 동명이인 유효성 검사 로직 수정 --- ✨
    const nameCounts = participantData.reduce((acc, p) => {
      acc[p.name] = (acc[p.name] || 0) + 1;
      return acc;
    }, {});

    const duplicateNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);

    if (duplicateNames.length > 0) {
      const indicesToHighlight = participantData
        .filter(p => duplicateNames.includes(p.name))
        .map(p => p.index);

      setDuplicateIndices(indicesToHighlight);
      setValidationError('참여자 이름은 중복될 수 없습니다. 동명이인이 있다면 별명을 붙여주세요.');
      return;
    }
    // ✨ --- 로직 수정 완료 --- ✨

    onCreateProject(finalProjectName, participantData.map(p => p.name));
  };

  if (!isOpen) {
    return null;
  }

  return (
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
          <div className="form-group">
            <label>참여자</label>
            {participants.map((participant, index) => (
              <div key={index} className="participant-input-row">
                <input
                  type="text"
                  value={participant}
                  onChange={e => handleParticipantChange(index, e.target.value)}
                  placeholder={`참여자 ${index + 1}`}
                  // ✨ 중복 여부에 따라 'input-error' 클래스 동적 적용
                  className={duplicateIndices.includes(index) ? 'input-error' : ''}
                />
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeParticipantInput(index)} className="remove-participant-btn">×</button>
                )}
              </div>
            ))}
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
  );
}

export default CreateProjectModal;