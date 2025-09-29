import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ParticipantManager.css';

function ParticipantManager({ project, onUpdate, apiBaseUrl, onOpenOrderModal }) {

  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (project?.participants) {
      const sorted = [...project.participants].sort((a, b) => a.orderIndex - b.orderIndex);
      setParticipants(sorted);
    }
  }, [project]);

  if (!project) {
    return <div>프로젝트를 불러오는 중...</div>;
  }

  return (
    <div className="manager-container">
      <header className="manager-header">
        <h1>{project.name} 참여자</h1>
        <Link to={`/project/${project.id}`} className="close-button">돌아가기</Link>
      </header>

      <div className="manager-content">
        <div className="manager-section">
          <div className="section-header">
            <h3>참여자 목록 ({participants.length}명)</h3>
            <div className="button-group">
                <button onClick={() => onOpenOrderModal(project)} className="reorder-button">순서 편집</button>
                <Link to={`/project/${project.id}/settings`} className="reorder-button">
                    참여자/카테고리 관리
                </Link>
            </div>
          </div>
          <p className="section-description">프로젝트에 참여하는 사람들의 목록입니다. 참여자를 추가하거나 수정하려면 '관리' 페이지로 이동하세요.</p>
          <ul className="participant-list simple">
            {participants.map(p => (
              <li key={p.id}>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
export default ParticipantManager;