import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectDetailView.css';

// --- 숫자 서식 헬퍼 함수 ---
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// --- 아이콘 SVG들 ---
const ExpenseIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> );
const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const ChevronIcon = ({ isExpanded }) => ( <svg className={`chevron-icon ${isExpanded ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> );
const ManageIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H4"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );


// ✨ openEditExpenseModal prop 추가
function ProjectDetailView({ project, onUpdate, showAlert, closeAlert, openAddExpenseModal, isParticipantsExpanded, onToggleParticipants, openEditExpenseModal }) { 
  
  const handleDeleteExpense = (expenseId) => {
    showAlert('지출 내역 삭제', '정말 이 지출 내역을 삭제하시겠습니까?', () => {
      fetch(`http://localhost:3001/expenses/${expenseId}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Server response was not ok');
          onUpdate();
          closeAlert();
        })
        .catch(err => {
          console.error('Failed to delete expense:', err);
          closeAlert();
        });
    });
  };

  if (!project) {
    return <div>프로젝트를 로딩 중이거나, 존재하지 않는 프로젝트입니다. 사이드바에서 다른 프로젝트를 선택해주세요.</div>;
  }

  const participants = project.participants || [];
  const expenses = project.expenses || [];

  return (
    <div className="detail-container">
      <header className="detail-header">
        <h2 className="detail-title">{project.name}</h2>
        <Link to={`/project/${project.id}/settlement`} className="settle-button">
          정산하기
        </Link>
      </header>
      
      {/* --- ✨ [수정] 스크롤 영역을 제어할 새로운 content-body div 추가 --- */}
      <div className="content-body">
        <div className="detail-section participant-section">
          <button 
            className="section-header collapsible" 
            onClick={onToggleParticipants}
          >
            <div className="section-title-group">
              <h2>참여자 ({project.participants.length}명)</h2>
              <Link to={`/project/${project.id}/participants`} className="manage-icon-button" onClick={e => e.stopPropagation()}>
                <ManageIcon />
              </Link>
            </div>
            <ChevronIcon isExpanded={isParticipantsExpanded} />
          </button>
          
          <div className={`participant-list-container ${isParticipantsExpanded ? 'expanded' : ''}`}>
            <ul className="item-list participant-list-items">
              {participants.map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          </div>
        </div>

        <div className="detail-section expense-section">
          <div className="section-header">
            <h2>지출 내역 ({expenses.length}건)</h2>
            <button 
              className="add-expense-button" 
              onClick={() => openAddExpenseModal(project)}
            >
              지출 항목 추가
            </button>
          </div>
          <ul className="item-list expense-list">
            {expenses.map((e) => {
              const payer = participants.find(p => p.id === e.payer_id);
              return (
                <li key={e.id} className="expense-item">
                  <div className="expense-item-info">
                    <div className="expense-item-icon">{e.category?.emoji || '⚪️'}</div>
                    <div className="expense-item-desc">{e.desc}</div>
                  </div>
                  <div className="expense-item-details">
                    <div className="expense-item-amount">{formatNumber(e.amount)}원</div>
                    <div className="expense-item-payer">결제: {payer ? payer.name : '알 수 없음'}</div>
                  </div>
                  <div className="expense-item-actions">
                    <button onClick={() => openEditExpenseModal(project, e)} className="action-button"><EditIcon /></button>
                    <button onClick={() => handleDeleteExpense(e.id)} className="action-button"><DeleteIcon /></button>                  
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetailView;