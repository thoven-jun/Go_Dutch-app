// src/ProjectSettings.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ParticipantManager.css';

// --- 아이콘 SVG들 ---
const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );
const SaveIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> );
const CancelIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );
const ChevronDownIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> );
const CheckIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> );

// --- 이모지 관련 컴포넌트 및 옵션 ---
const EMOJI_OPTIONS = [ '🍔', '☕️', '🛒', '🚗', '✈️', '🏠', '🎁', '🎬', '🎵', '⚕️', '🍻', '🍰', '🛍️', '🚌', '🚢', '⛽️', '📦', '🧾', '🎉', '💡', '🍕', '🍜', '🏨', '🚄', '🚇', '🏠', '👔', '💅', '🎓', '🐶', '💰', '💳', '📈', '🔨', '💻', '📞', '📚', '⚽️', '🎨', '💊', '🍦', '🍎', '💧', '🧺', '👕', '💄', '👶', '🌿' ];
const EmojiPicker = ({ selectedEmoji, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  useEffect(() => { const handleClickOutside = (event) => { if (pickerRef.current && !pickerRef.current.contains(event.target)) { setIsOpen(false); } }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
  const handleSelect = (emoji) => { onSelect(emoji); setIsOpen(false); };
  return (
    <div className="emoji-picker" ref={pickerRef}>
      <button type="button" className="emoji-picker-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="selected-emoji">{selectedEmoji}</span>
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="emoji-picker-dropdown">
          {EMOJI_OPTIONS.map(emoji => ( <button key={emoji} type="button" className="emoji-option" onClick={() => handleSelect(emoji)}>{emoji}</button> ))}
        </div>
      )}
    </div>
  );
};


function ProjectSettings({ projects, onUpdate, showAlert, openDestructiveModal, closeDestructiveModal, onOpenDuplicateModal, apiBaseUrl, onOpenOrderModal, closeAlert }) { 
  const { projectId } = useParams();
  const project = projects.find(p => p.id === parseInt(projectId));

  const [activeTab, setActiveTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [editingParticipant, setEditingParticipant] = useState({ id: null, name: '' });
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState({ id: null, name: '', emoji: '🍔' });
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '🍔' });
  const newCategoryNameInputRef = useRef(null);
  const [isParticipantSelectionMode, setParticipantSelectionMode] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [isCategorySelectionMode, setCategorySelectionMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const canDeleteParticipant = participants.length > 2;

  useEffect(() => {
    if (project) {
      setParticipants([...(project.participants || [])].sort((a, b) => a.orderIndex - b.orderIndex));
      setCategories(project.categories || []);
    }
  }, [project, projects]);
  
  useEffect(() => {
    handleCancelEditingParticipant();
    handleCancelEditingCategory();
    setParticipantSelectionMode(false);
    setSelectedParticipants(new Set());
    setCategorySelectionMode(false);
    setSelectedCategories(new Set());
  }, [activeTab]);

  const handleAddParticipant = (e) => { e.preventDefault(); if (!newParticipant.trim()) return; const duplicates = participants.filter(p => p.name === newParticipant.trim()); if (duplicates.length > 0) { onOpenDuplicateModal(duplicates, newParticipant.trim(), projectId); setNewParticipant(''); } else { fetch(`${apiBaseUrl}/projects/${projectId}/participants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newParticipant.trim() }) }).then(() => { setNewParticipant(''); onUpdate(); }); } };
  
  const handleDeleteParticipant = (participant) => {
    if (!canDeleteParticipant) {
      showAlert('삭제 불가', '프로젝트에 참여하는 사람은 최소 2명 이상이어야 합니다.');
      return;
    }

    const isPayer = project.expenses?.some(e => e.payer_id === participant.id);
    
    // 모달에 표시될 주의사항 목록을 생성합니다.
    let consequences = ["이 작업은 되돌릴 수 없으며, 참여자는 영구적으로 삭제됩니다."];
    if (isPayer) {
      consequences.push(`'${participant.name}'님이 결제자로 등록된 지출 내역들도 함께 삭제됩니다.`);
    }
    consequences.push("참여자가 삭제되면 일부 지출 내역의 분배 방식이 '균등 부담'으로 조정될 수 있습니다.");

    // 삭제를 수행하는 비동기 함수
    const performDelete = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/participants/${participant.id}`, { method: 'DELETE' });
        if (response.ok) {
          onUpdate();
        } else {
          console.error("삭제 실패:", response.statusText);
        }
      } catch (error) {
        console.error("삭제 중 네트워크 오류:", error);
      } finally {
        closeDestructiveModal(); // 새 모달을 닫습니다.
      }
    };
    
    // 새로운 경고 모달을 엽니다.
    openDestructiveModal({
      title: `'${participant.name}' 참여자 삭제`,
      mainContent: '선택한 참여자를 정말 삭제하시겠습니까?',
      consequences: consequences,
      confirmText: '삭제',
      onConfirm: performDelete
    });
  };

  const handleStartEditingParticipant = (participant) => { setEditingParticipant({ id: participant.id, name: participant.name }); };
  const handleCancelEditingParticipant = () => { setEditingParticipant({ id: null, name: '' }); };
  const handleSaveEditingParticipant = () => { const newName = editingParticipant.name.trim(); if (!newName) return; const otherParticipants = participants.filter(p => p.id !== editingParticipant.id); const duplicates = otherParticipants.filter(p => p.name === newName); if (duplicates.length > 0) { showAlert('동명이인 발생', `'${newName}'님은 이미 참여자 목록에 있습니다.\n그래도 동명이인으로 처리하시겠습니까?`, () => { onOpenDuplicateModal(duplicates, newName, projectId, editingParticipant.id); handleCancelEditingParticipant(); }); return; } fetch(`${apiBaseUrl}/participants/${editingParticipant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }), }).then(() => { handleCancelEditingParticipant(); onUpdate(); }); };
  const handleStartEditingCategory = (category) => { setEditingCategory({ id: category.id, name: category.name, emoji: category.emoji }); };
  const handleCancelEditingCategory = () => { setEditingCategory({ id: null, name: '', emoji: '🍔' }); };
  const handleSaveEditingCategory = () => { if (!editingCategory.name.trim() || !editingCategory.emoji.trim()) { showAlert('입력 오류', '카테고리 이름과 이모지를 모두 입력해주세요.'); return; } fetch(`${apiBaseUrl}/categories/${editingCategory.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingCategory.name, emoji: editingCategory.emoji, projectId: projectId }), }).then(res => res.json()).then(() => { onUpdate(); handleCancelEditingCategory(); }); };
  const handleDeleteCategory = (categoryId) => { showAlert('카테고리 삭제', '정말 이 카테고리를 삭제하시겠습니까?', () => { fetch(`${apiBaseUrl}/categories/${categoryId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: projectId }) }).then(res => { if (!res.ok) return res.json().then(err => { throw new Error(err.error) }); onUpdate(); }).catch(err => { const message = err.message.includes("in use") ? '해당 카테고리를 사용하고 있는 지출 내역이 있어 삭제할 수 없습니다.' : '카테고리 삭제 중 오류가 발생했습니다.'; showAlert('삭제 실패', message); }); }); };
  const handleAddCategory = () => { 
    const newCategoryName = newCategory.name.trim();
    if (!newCategoryName || !newCategory.emoji.trim()) { showAlert('입력 오류', '새 카테고리의 이름과 이모지를 모두 입력해주세요.'); return; } 
    if (categories.some(c => c.name === newCategoryName)) { showAlert('중복 오류', `'${newCategoryName}' 카테고리는 이미 존재합니다.`); return; }
    fetch(`${apiBaseUrl}/projects/${projectId}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName, emoji: newCategory.emoji }), }).then(res => res.json()).then(() => { onUpdate(); setNewCategory({ name: '', emoji: '🍔' }); if(newCategoryNameInputRef.current) { newCategoryNameInputRef.current.focus(); } }); };
  const handleParticipantSelect = (id) => { setSelectedParticipants(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
  const handleCategorySelect = (id) => { setSelectedCategories(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
  const handleBulkDeleteParticipants = () => {
    if (participants.length - selectedParticipants.size < 2) {
      showAlert('삭제 불가', `선택한 ${selectedParticipants.size}명을 삭제하면 참여자가 2명 미만이 됩니다. 최소 2명의 참여자는 유지되어야 합니다.`);
      return;
    }

    const selectedPayers = project.expenses?.filter(e => selectedParticipants.has(e.payer_id));
    const hasPayers = selectedPayers && selectedPayers.length > 0;

    let consequences = ["이 작업은 되돌릴 수 없으며, 선택한 참여자는 영구적으로 삭제됩니다."];
    if (hasPayers) {
      consequences.push("결제자로 등록된 참여자를 삭제하면, 해당 지출 내역들도 함께 삭제됩니다.");
    }
    consequences.push("일부 지출 내역의 분배 방식이 '균등 부담'으로 조정될 수 있습니다.");
    
    const performBulkDelete = async () => {
      try {
        const deletePromises = Array.from(selectedParticipants).map(id => 
          fetch(`${apiBaseUrl}/participants/${id}`, { method: 'DELETE' })
        );
        await Promise.all(deletePromises);
        onUpdate();
        setParticipantSelectionMode(false);
        setSelectedParticipants(new Set());
      } catch (error) {
        console.error("일괄 삭제 중 오류 발생:", error);
      } finally {
        closeDestructiveModal(); // 이제 새 모달을 닫습니다.
      }
    };

    openDestructiveModal({
      title: `${selectedParticipants.size}명 일괄 삭제`,
      mainContent: '선택한 참여자를 정말 삭제하시겠습니까?',
      consequences: consequences,
      confirmText: '삭제',
      onConfirm: performBulkDelete
    });
  };

  const handleBulkDeleteCategories = () => { showAlert(`${selectedCategories.size}개 삭제`, '선택한 카테고리를 모두 삭제하시겠습니까?', () => { const deletePromises = Array.from(selectedParticipants).map(id => fetch(`${apiBaseUrl}/categories/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: projectId }) })); Promise.all(deletePromises).then(responses => { const failed = responses.filter(res => !res.ok); if (failed.length > 0) { showAlert('삭제 실패', '사용 중인 카테고리가 포함되어 있어 일부 항목을 삭제할 수 없습니다.'); } onUpdate(); setCategorySelectionMode(false); setSelectedCategories(new Set()); }).catch(err => console.error("일괄 삭제 실패:", err)); }); };

  if (!project) return <div>프로젝트를 불러오는 중...</div>;

  const areAllParticipantsSelected = participants.length > 0 && selectedParticipants.size === participants.length;
  const areAllCategoriesSelected = categories.length > 0 && selectedCategories.size === categories.length;

  return (
    <div className="manager-container">
      <header className="manager-header">
        <div className="header-title-group">
          <span className="project-name-breadcrumb" title={project.name}>{project.name}</span>
          <h1 className="page-title">설정</h1>
        </div>
        <Link to={`/project/${projectId}`} className="close-button">돌아가기</Link>
      </header>
      <div className="manager-content settings-layout">
        <nav className="settings-nav">
          <ul> <li><button className={activeTab === 'participants' ? 'active' : ''} onClick={() => setActiveTab('participants')}>참여자 관리</button></li> <li><button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>카테고리 관리</button></li> </ul>
        </nav>
        <div className="settings-panel">
          {activeTab === 'participants' && (
            <div className="manager-section">
              <div className="section-sticky-header">
                <div className="section-header">
                  <h3>참여자 목록 ({participants.length}명)</h3>
                  <div className="button-group">
                    {!isParticipantSelectionMode && <button onClick={() => { handleCancelEditingParticipant(); onOpenOrderModal(project); }} className="reorder-button">순서 편집</button>}
                    <button 
                      onClick={() => { handleCancelEditingParticipant(); setParticipantSelectionMode(!isParticipantSelectionMode); setSelectedParticipants(new Set()); }} 
                      className="reorder-button"
                      disabled={!canDeleteParticipant}
                      title={!canDeleteParticipant ? "참여자가 2명 이하일 때는 삭제할 수 없습니다." : ""}
                    >
                      {isParticipantSelectionMode ? '완료' : '선택'}
                    </button>
                  </div>
                </div>
                <p className="section-description">프로젝트에 참여하는 사람들의 목록입니다.</p>
              </div>
              <ul className="participant-list scrollable-list">
                {participants.map(p => (
                  <li key={p.id} className={isParticipantSelectionMode ? 'selection-item' : ''} onClick={isParticipantSelectionMode ? () => handleParticipantSelect(p.id) : undefined}>
                    <div className={`selection-checkbox ${selectedParticipants.has(p.id) ? 'selected' : ''}`}> {selectedParticipants.has(p.id) && <CheckIcon />} </div>
                    {editingParticipant.id === p.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          className="name-input"
                          value={editingParticipant.name}
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, name: e.target.value })}
                          autoFocus
                        />
                        <button onClick={handleSaveEditingParticipant} className="save-edit-button">저장</button>
                        <button onClick={handleCancelEditingParticipant} className="cancel-edit-button">취소</button>
                      </div>
                    ) : (
                      <>
                        <span className="participant-name">{p.name}</span>
                        <div className="participant-actions"> 
                          <button onClick={() => handleStartEditingParticipant(p)} className="action-button"><EditIcon /></button> 
                          <button 
                            onClick={() => handleDeleteParticipant(p)} 
                            className="action-button" 
                            disabled={!canDeleteParticipant}
                            title={!canDeleteParticipant ? "참여자가 2명 이하일 때는 삭제할 수 없습니다." : ""}
                          >
                            <DeleteIcon />
                          </button> 
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="section-sticky-footer">
                {isParticipantSelectionMode ? (
                  <div className="selection-action-bar">
                    <button className="select-all-button" onClick={() => { if (areAllParticipantsSelected) setSelectedParticipants(new Set()); else setSelectedParticipants(new Set(participants.map(p => p.id))); }}>{areAllParticipantsSelected ? '전체 해제' : '전체 선택'}</button>
                    <span className="selection-count">{selectedParticipants.size}명 선택됨</span>
                    <button className="delete-button" onClick={handleBulkDeleteParticipants} disabled={selectedParticipants.size === 0}>삭제</button>
                  </div>
                ) : ( <form onSubmit={handleAddParticipant} className="add-form"> <input type="text" value={newParticipant} onChange={e => setNewParticipant(e.target.value)} placeholder="새 참여자 이름 입력" /> <button type="submit">추가</button> </form> )}
              </div>
            </div>
          )}
          {activeTab === 'categories' && (
            <div className="manager-section">
              <div className="section-sticky-header">
                <div className="section-header"> 
                    <h3>카테고리 관리</h3> 
                    <button onClick={() => { handleCancelEditingCategory(); setCategorySelectionMode(!isCategorySelectionMode); setSelectedCategories(new Set()); }} className="reorder-button">{isCategorySelectionMode ? '완료' : '선택'}</button>
                </div>
                <p className="section-description">이 프로젝트에서 사용할 지출 카테고리를 설정합니다.</p>
              </div>
              <ul className="category-list scrollable-list">
                {categories.map(cat => (
                  <li key={cat.id} className={`category-item ${isCategorySelectionMode ? 'selection-item' : ''}`} onClick={isCategorySelectionMode ? () => handleCategorySelect(cat.id) : undefined}>
                    <div className={`selection-checkbox ${selectedCategories.has(cat.id) ? 'selected' : ''}`}> {selectedCategories.has(cat.id) && <CheckIcon />} </div>
                    {editingCategory.id === cat.id ? (
                      <div className="edit-form"> <EmojiPicker selectedEmoji={editingCategory.emoji} onSelect={(emoji) => setEditingCategory({...editingCategory, emoji})} /> <input type="text" className="name-input" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} autoFocus /> <div className="category-actions"> <button onClick={handleSaveEditingCategory} className="action-button save-button"><SaveIcon /></button> <button onClick={handleCancelEditingCategory} className="action-button cancel-button"><CancelIcon /></button> </div> </div>
                    ) : (
                      <>
                        <div className="category-info"> <span className="category-emoji">{cat.emoji}</span> <span className="category-name">{cat.name}</span> </div>
                        <div className="category-actions"> <button onClick={() => handleStartEditingCategory(cat)} className="action-button"><EditIcon /></button> <button onClick={() => handleDeleteCategory(cat.id)} className="action-button"><DeleteIcon /></button> </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="section-sticky-footer">
                {isCategorySelectionMode ? (
                   <div className="selection-action-bar">
                    <button className="select-all-button" onClick={() => { if (areAllCategoriesSelected) setSelectedCategories(new Set()); else setSelectedCategories(new Set(categories.map(c => c.id))); }}>{areAllCategoriesSelected ? '전체 해제' : '전체 선택'}</button>
                    <span className="selection-count">{selectedCategories.size}개 선택됨</span>
                    <button className="delete-button" onClick={handleBulkDeleteCategories} disabled={selectedCategories.size === 0} >삭제</button>
                  </div>
                ) : ( <div className="add-category-form"> <EmojiPicker selectedEmoji={newCategory.emoji} onSelect={(emoji) => setNewCategory({...newCategory, emoji})} /> <input type="text" className="name-input" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="새 카테고리 이름" ref={newCategoryNameInputRef} /> <button onClick={handleAddCategory} className="add-button">추가</button> </div> )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectSettings;