// src/SelectiveImportModal.js

import React, { useState, useEffect } from 'react';
import './SelectiveImportModal.css';

const CheckIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> );

const projectTypeMap = {
  general: '일반',
  travel: '여행',
  gathering: '회식/모임'
};

function SelectiveImportModal({ isOpen, onClose, projects, onConfirmImport }) {
  const [selectedProjects, setSelectedProjects] = useState(new Set());

  useEffect(() => {
    if (isOpen && projects.length > 0) {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  }, [isOpen, projects]);

  if (!isOpen) {
    return null;
  }

  const handleSelectProject = (projectId) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleConfirm = () => {
    const projectsToImport = projects.filter(p => selectedProjects.has(p.id));
    onConfirmImport(projectsToImport);
  };

  const areAllSelected = projects.length > 0 && selectedProjects.size === projects.length;

  return (
    <div className="modal-overlay">
      <div className="modal-content import-modal" onClick={e => e.stopPropagation()}>
        <h2>프로젝트 가져오기</h2>
        <p>가져올 프로젝트를 선택하세요. 선택한 항목만 현재 데이터에 추가됩니다.</p>
        
        <div className="import-list-container">
          <ul className="import-project-list">
            {projects.map(project => (
              <li key={project.id} onClick={() => handleSelectProject(project.id)}>
                <div className={`selection-checkbox ${selectedProjects.has(project.id) ? 'selected' : ''}`}>
                  {selectedProjects.has(project.id) && <CheckIcon />}
                </div>
                <div className="import-project-info">
                  <span className="import-project-name">{project.name}</span>
                  {/* ▼▼▼▼▼ [수정] 여행 기간, 회차 정보 표시 코드 삭제 ▼▼▼▼▼ */}
                  <div className="import-project-details">
                    <span>{projectTypeMap[project.type] || '일반'}</span>
                    <span>참여자 {project.participants?.length || 0}명</span>
                    <span>지출 {project.expenses?.length || 0}건</span>
                  </div>
                  {/* ▲▲▲▲▲ [수정] 완료 ▲▲▲▲▲ */}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="modal-footer">
          <div className="select-all-container">
            <button className="select-all-button" onClick={handleSelectAll}>
              {areAllSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>취소</button>
            <button type="button" className="confirm-button" onClick={handleConfirm} disabled={selectedProjects.size === 0}>
              {selectedProjects.size}개 가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectiveImportModal;