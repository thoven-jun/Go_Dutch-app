import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ProjectDetailView.css';

const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const projectTypeMap = {
  general: '일반',
  travel: '여행',
  gathering: '회식/모임'
};

const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const ChevronIcon = ({ isExpanded }) => ( <svg className={`chevron-icon ${isExpanded ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> );
const ManageIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H4"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );
const InfoIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> );
const SettingsIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> );
const MoreIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg> );

const groupAndSortExpenses = (expenses, projectType, projectStartDate, projectRounds) => {
  if (projectType === 'general' || !projectType) {
    return { '전체': expenses };
  }
  
  const roundNameMap = new Map((projectRounds || []).map(r => [r.number, r.name]));

  const grouped = expenses.reduce((acc, expense) => {
    let key = '미분류';
    if (projectType === 'travel') {
      if (expense.eventDate) {
        const date = new Date(expense.eventDate);
        const startDate = new Date(projectStartDate);
        const diffTime = Math.abs(date - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        key = `${diffDays}일차 (${date.toLocaleDateString()})`;
      } else {
        key = '날짜 미지정';
      }
    } else if (projectType === 'gathering') {
      const roundNum = expense.round;
      if (roundNum) {
        const roundName = roundNameMap.get(roundNum);
        key = roundName ? `${roundNum}차: ${roundName}` : `${roundNum}차`;
      } else {
        key = '회차 미지정';
      }
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(expense);
    return acc;
  }, {});
  
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '미분류' || a === '날짜 미지정' || a === '회차 미지정') return 1;
    if (b === '미분류' || b === '날짜 미지정' || b === '회차 미지정') return -1;
    
    if (projectType === 'travel') {
      const dayA = parseInt(a.split('일차')[0]);
      const dayB = parseInt(b.split('일차')[0]);
      return dayA - dayB;
    } else if (projectType === 'gathering') {
      const roundA = parseInt(a.split('차')[0]);
      const roundB = parseInt(b.split('차')[0]);
      return roundA - roundB;
    }
    return 0;
  });

  const sortedGrouped = {};
  for (const key of sortedKeys) {
    sortedGrouped[key] = grouped[key];
  }
  return sortedGrouped;
};

function ProjectDetailView({ project, onUpdate, onOpenRenameModal, showAlert, closeAlert, openAddExpenseModal, openEditExpenseModal, apiBaseUrl, isParticipantsExpanded, onToggleParticipants }) {

  const [disableTransition, setDisableTransition] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setDisableTransition(true);
    const timer = setTimeout(() => setDisableTransition(false), 50);
    return () => clearTimeout(timer);
  }, [project.id]);

  const handleDeleteExpense = (expenseId) => {
    showAlert('지출 내역 삭제', '정말 이 지출 내역을 삭제하시겠습니까?', () => {
      fetch(`${apiBaseUrl}/expenses/${expenseId}`, { method: 'DELETE' })
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
    return <div>프로젝트를 선택해주세요.</div>;
  }

  const totalAmount = project.expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonAmount = project.participants.length > 0 ? Math.round(totalAmount / project.participants.length) : 0;
  const participants = [...(project.participants || [])].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  const groupedExpenses = groupAndSortExpenses(project.expenses || [], project.type, project.startDate, project.rounds);

  const renderExpenseGroups = () => {
    return Object.entries(groupedExpenses).map(([groupTitle, expensesInGroup]) => {
      if (project.type === 'general' || !project.type) {
        return (
          <ul key="all-expenses" className="item-list expense-list">
            {expensesInGroup.map(e => renderExpenseItem(e))}
          </ul>
        );
      }
      const groupTotal = expensesInGroup.reduce((sum, e) => sum + e.amount, 0);
      return (
        <div key={groupTitle} className="expense-group">
          <div className="expense-group-header">
            <span>{groupTitle}</span>
            <span className="group-total">{formatNumber(groupTotal)}원</span>
          </div>
          <ul className="item-list">
            {expensesInGroup.map(e => renderExpenseItem(e))}
          </ul>
        </div>
      );
    });
  };

  const renderExpenseItem = (e) => {
    const payer = participants.find(p => p.id === e.payer_id);
    let splitCount = 0;
    if (e.split_method === 'equally') {
      splitCount = e.split_participants?.length > 0 ? e.split_participants.length : participants.length;
    } else {
      splitCount = Object.keys(e.split_details || {}).length;
    }

    return (
      <li key={e.id} className="expense-item" onClick={() => openEditExpenseModal(project, e)}>
        <div className="expense-item-info">
          <div className="expense-item-icon">{e.category?.emoji || '⚪️'}</div>
          <div className="expense-item-desc">{e.desc}</div>
        </div>
        <div className="expense-item-details">
          <div className="expense-item-amount">{formatNumber(e.amount)}원</div>
          <div className="expense-item-payer">
            <span className="payer-label">결제:</span>
            <span className="payer-name">{payer ? payer.name : '알 수 없음'}</span>
            {splitCount > 0 && <span className="split-count">({splitCount}명)</span>}
          </div>
        </div>
        <div className="expense-item-actions">
          <button 
            onClick={(event) => {
              event.stopPropagation(); 
              handleDeleteExpense(e.id);
            }} 
            className="action-button"
          >
            <DeleteIcon />
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="detail-container">
      <header className="detail-header">
        <div className="detail-title-group">
          <h2 className="detail-title" title={project.name}>{project.name}</h2>
          {project.type && <span className="project-type-badge">{projectTypeMap[project.type]}</span>}
        </div>
        
        <div className="header-actions">
          <div className="more-menu-container" ref={menuRef}>
            <button className="more-menu-button" title="더보기" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <MoreIcon />
            </button>
            {isMenuOpen && (
              <div className="header-dropdown-menu">
                <button onClick={() => { onOpenRenameModal(project.id, project.name); setIsMenuOpen(false); }}>
                  <EditIcon /> 이름 변경
                </button>
                <Link to={`/project/${project.id}/settings`} onClick={() => setIsMenuOpen(false)}>
                  <SettingsIcon /> 설정
                </Link>
              </div>
            )}
          </div>
          <Link to={`/project/${project.id}/settlement`} className="settle-button">
            정산하기
          </Link>
        </div>
      </header>
      
      <div className="content-body">
        <div className="detail-section participant-section">
          <button 
            className="section-header collapsible" 
            onClick={onToggleParticipants}
          >
            <div className="section-title-group">
              <h2>참여자 ({participants.length}명)</h2>
              <Link to={`/project/${project.id}/settings#participants`} className="manage-icon-button" onClick={e => e.stopPropagation()}>
                <ManageIcon />
              </Link>
            </div>
            <ChevronIcon isExpanded={isParticipantsExpanded} />
          </button>
          
          <div className={`participant-list-container ${isParticipantsExpanded ? 'expanded' : ''} ${disableTransition ? 'no-transition' : ''}`}>
            <ul className="item-list participant-list-items">
              {participants.map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          </div>
        </div>

        <div className="detail-section expense-section">
          <div className="section-header">
            <h2>지출 내역 ({project.expenses.length}건)</h2>
            <button 
              className="add-expense-button" 
              onClick={() => openAddExpenseModal(project)}
            >
              지출 항목 추가
            </button>
          </div>
          <div className="expense-list">
            {renderExpenseGroups()}
          </div>
        </div>
      </div>

      <footer className="detail-footer">
        <div className="summary-item">
          <span>총 지출액</span>
          <strong>{formatNumber(totalAmount)}원</strong>
        </div>
        <div className="summary-item">
          <div className="summary-label-group">
            <span>1인당 부담 금액</span>
            <div className="tooltip-container">
              <InfoIcon />
              <div className="tooltip">
                '1인당 부담액'은 총 지출액 기준 단순 참고 값입니다.<br/>*분배 옵션 미적용
              </div>
            </div>
          </div>
          <strong>{formatNumber(perPersonAmount)}원</strong>
        </div>
      </footer>
    </div>
  );
}

export default ProjectDetailView;