import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ParticipantManager.css';

const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );

function ParticipantManager({ projects, onUpdate, showAlert, onOpenDuplicateModal, closeAlert }) {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === parseInt(projectId));
  
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [editing, setEditing] = useState({ id: null, name: '' });

  useEffect(() => {
    if (project) {
      setParticipants(project.participants || []);
    }
  }, [project, projects]);

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newParticipant.trim()) return;
    
    const duplicates = participants.filter(p => p.name === newParticipant.trim());
    if (duplicates.length > 0) {
      onOpenDuplicateModal(duplicates, newParticipant.trim(), projectId);
      setNewParticipant('');
    } else {
      fetch(`http://localhost:3001/projects/${projectId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newParticipant.trim() })
      }).then(() => {
        setNewParticipant('');
        onUpdate();
      });
    }
  };
  
  const handleDeleteParticipant = (participant) => {
    // 서버에 결제 내역이 있는지 확인
    const isPayer = project.expenses?.some(e => e.payer_id === participant.id);
    
    const title = isPayer ? '결제 내역 함께 삭제' : '참여자 삭제';
const message = isPayer 
      ? `'${participant.name}'님과 '${participant.name}'님이 결제한 모든 지출 내역을 함께 삭제합니다. 이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?`
      : `'${participant.name}'님을 삭제하면, 금액 및 비율 지정 방식의 지출 항목은 '균등 부담' 방식으로 모두 조정됩니다.이 작업은 되돌릴 수 없습니다.계속하시겠습니까?`;
      
    showAlert(title, message, () => {
      fetch(`http://localhost:3001/participants/${participant.id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          onUpdate();
        } else {
          console.error("삭제 실패:", res.statusText);
        }
        closeAlert();
      });
    });
  };

  const handleStartEditing = (participant) => {
    setEditing({ id: participant.id, name: participant.name });
  };

  const handleCancelEditing = () => {
    setEditing({ id: null, name: '' });
  };

  const handleSaveEditing = () => {
    const newName = editing.name.trim();
    if (!newName) return;

    // 현재 수정 중인 참여자를 제외한 다른 참여자들
    const otherParticipants = participants.filter(p => p.id !== editing.id);
    const duplicates = otherParticipants.filter(p => p.name === newName);

    // ✨ 동명이인이 발견되면, 사용자에게 확인을 요청
    if (duplicates.length > 0) {
      showAlert(
        '동명이인 발생',
        `'${newName}'님은 이미 참여자 목록에 있습니다.\n그래도 동명이인으로 처리하시겠습니까?`,
        () => {
          // '확인'을 누르면 동명이인 처리 모달을 염
          // 마지막 인자로 '수정 중인 참여자 ID'를 넘겨줌
          onOpenDuplicateModal(duplicates, newName, projectId, editing.id);
          closeAlert(); // 확인창 닫기
          handleCancelEditing(); // 수정 입력창 닫기
        }
      );
      return; // 저장을 중단하고 사용자 선택을 기다림
    }

    // 동명이인이 없으면 바로 저장
    fetch(`http://localhost:3001/participants/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
    }).then(() => {
        handleCancelEditing();
        onUpdate();
    });
  };

  if (!project) {
    return <div>프로젝트를 불러오는 중...</div>;
  }

  return (
    <div className="manager-container">
      <header className="manager-header">
        <h1>참여자 관리</h1>
        <Link to={`/project/${projectId}`} className="close-button">돌아가기</Link>
      </header>
      
      <div className="manager-content">
        <div className="add-participant-section">
          <h3>새 참여자 추가</h3>
          <form onSubmit={handleAddParticipant} className="add-form">
            <input
              type="text"
              value={newParticipant}
              onChange={e => setNewParticipant(e.target.value)}
              placeholder="참여자 이름 입력"
            />
            <button type="submit">추가</button>
          </form>
        </div>

        <div className="participant-list-section">
          <h3>참여자 목록 ({participants.length}명)</h3>
          <ul className="participant-list">
            {participants.map(p => (
              <li key={p.id}>
                {editing.id === p.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      autoFocus
                    />
                    <button onClick={handleSaveEditing} className="save-edit-button">저장</button>
                    <button onClick={handleCancelEditing} className="cancel-edit-button">취소</button>
                  </div>
                ) : (
                  <>
                    <span>{p.name}</span>
                    <div className="participant-actions">
                      <button onClick={() => handleStartEditing(p)} className="action-button"><EditIcon /></button>
                      {/* --- ✨ 삭제 버튼에 participant 객체 전체를 넘겨주도록 수정 --- */}
                      <button onClick={() => handleDeleteParticipant(p)} className="action-button"><DeleteIcon /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ParticipantManager;