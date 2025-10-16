// src/SettlementResultView.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SettlementResultView.css';

const ShareIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> );
const MoneyUpIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#367BF5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> );
const MoneyDownIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF4D4D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> );

function SettlementResultView({ apiBaseUrl }) {
  const [result, setResult] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState('');
  const { projectId } = useParams();
  const [viewMode, setViewMode] = useState('transfer'); 
  const [transferMode, setTransferMode] = useState('net');

  const [participants, setParticipants] = useState([]);
  const [project, setProject] = useState(null); // --- [추가] 프로젝트 정보 상태
  const [selectedParticipant, setSelectedParticipant] = useState('all');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setSelectedParticipant('all');
    setFilter('all');
  }, [viewMode]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/projects`)
      .then(res => res.json())
      .then(allProjects => {
        const currentProject = allProjects.find(p => p.id === parseInt(projectId));
        if (currentProject) {
          setProject(currentProject); // --- [추가] 프로젝트 정보 저장
          setParticipants(currentProject.participants);
        }
      });

    fetch(`${apiBaseUrl}/projects/${projectId}/settlement`)
      .then(res => res.json())
      .then(data => setResult(data))
      .catch(err => {
        console.error(err);
        setError('정산 결과를 계산하는 중 오류가 발생했습니다.');
      });

    fetch(`${apiBaseUrl}/projects/${projectId}/receipt`)
      .then(res => res.json())
      .then(data => setReceiptData(data))
      .catch(err => console.error("Error fetching receipt data:", err));
  }, [projectId, apiBaseUrl]);

  // --- ▼▼▼ [신설] 공유하기 기능 구현 ▼▼▼ ---
  const handleShare = async () => {
    if (!result || !project) return;

    const transfersText = result.netTransfers
      .map(t => `- ${t.from} → ${t.to}: ${t.amount.toLocaleString()}원`)
      .join('\n');

    const shareText = `[${project.name} 정산 결과]\n\n` +
                      `총 지출액: ${result.totalAmount.toLocaleString()}원\n` +
                      `참여 인원: ${result.participantCount}명\n\n` +
                      `[송금 내역]\n` +
                      `${transfersText || '정산할 내역이 없습니다.'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${project.name} 정산 결과`,
          text: shareText,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우는 오류로 취급하지 않음
        if (error.name !== 'AbortError') {
          console.error('공유 기능 에러:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('정산 결과가 클립보드에 복사되었습니다.');
      } catch (error) {
        console.error('클립보드 복사 실패:', error);
        alert('클립보드 복사에 실패했습니다.');
      }
    }
  };
  
  const getFilteredTransfers = () => {
    // ... (기존과 동일)
    if (!result) return [];
    const sourceTransfers = transferMode === 'net' ? result.netTransfers : result.grossTransfers;
    
    if (selectedParticipant === 'all') {
      return sourceTransfers;
    }

    if (filter === 'all') {
      return sourceTransfers.filter(t => t.from === selectedParticipant || t.to === selectedParticipant);
    }
    if (filter === 'toPay') {
      return sourceTransfers.filter(t => t.from === selectedParticipant);
    }
    if (filter === 'toReceive') {
      return sourceTransfers.filter(t => t.to === selectedParticipant);
    }
    return [];
  };

  const renderReceiptView = () => {
    // ... (기존과 동일)
    if (!receiptData || !result) return <p className="receipt-placeholder">개인별 지출 내역을 불러오는 중입니다...</p>;
    if (receiptData.length === 0) return <p className="receipt-placeholder">표시할 지출 내역이 없습니다.</p>;

    const selectedReceipt = receiptData.find(r => r.participantName === selectedParticipant);
    const selectedParticipantData = result.balances && result.balances.find(b => b.name === selectedParticipant);

    return (
      <div className="receipt-view">
        {selectedParticipant === 'all' ? (
          <p className="receipt-placeholder">참여자를 선택하여 상세 지출 내역을 확인하세요.</p>
        ) : selectedReceipt && selectedParticipantData ? (
          <div className="receipt-card">
            <header className="receipt-header">
              <h3>{selectedReceipt.participantName}님의 정산 현황</h3>
              <div className="receipt-dashboard">
                <div className="dashboard-item">
                  <span>총 결제 금액</span>
                  <strong>{selectedParticipantData.totalPaid.toLocaleString()}원</strong>
                </div>
                <div className="dashboard-item">
                  <span>총 부담 금액</span>
                  <strong>{selectedReceipt.totalSpent.toLocaleString()}원</strong>
                </div>
                <div className="dashboard-item final-balance">
                  <span>최종 정산 금액</span>
                  <strong className={selectedParticipantData.balance > 0 ? 'to-receive' : 'to-pay'}>
                    {selectedParticipantData.balance > 0 ? '+' : ''}{Math.round(selectedParticipantData.balance).toLocaleString()}원
                  </strong>
                </div>
              </div>
            </header>
            <h4 className="expense-details-header">지출 내역 상세</h4>
            <div className="receipt-expense-list">
              {selectedReceipt.spentByCategory.length > 0 ? (
                selectedReceipt.spentByCategory.map(categoryGroup => (
                  <div key={categoryGroup.categoryId} className="receipt-category-group">
                    <div className="receipt-category-header">
                      <span className="receipt-category-icon">{categoryGroup.categoryEmoji}</span>
                      <span className="receipt-category-name">{categoryGroup.categoryName}</span>
                      <span className="receipt-category-total">{categoryGroup.totalAmount.toLocaleString()}원</span>
                    </div>
                    <ul>
                      {categoryGroup.expenseDetails.map(detail => (
                        <li key={detail.expenseId}>
                          <div className="receipt-expense-info">
                            <span className="receipt-expense-desc">{detail.expenseDesc}</span>
                            <span className="receipt-expense-payer">(결제: {detail.payerName})</span>
                          </div>
                          <div className="receipt-expense-share">
                            {detail.yourShare.toLocaleString()}원
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="no-transfer-message" style={{padding: '20px'}}>지출 내역이 없습니다.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="receipt-placeholder">선택한 참여자의 지출 내역이 없습니다.</p>
        )}
      </div>
    );
  };

  if (error) return <div className="settlement-container">{error}</div>;
  if (!result) return <div className="settlement-container">정산 결과를 계산하는 중입니다...</div>;

  const transfersToDisplay = getFilteredTransfers();
  const sectionTitle = transferMode === 'net' ? '💸 최소 송금 (순액 정산)' : '🧾 모든 거래 (총액 정산)';
  const toPayTransfers = (result.netTransfers).filter(t => t.from === selectedParticipant);
  const toReceiveTransfers = (result.netTransfers).filter(t => t.to === selectedParticipant);
  
  const totalToPay = toPayTransfers.reduce((sum, t) => sum + t.amount, 0);
  const totalToReceive = toReceiveTransfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="settlement-container">
      <div className="settlement-header">
        <Link to={`/project/${projectId}`} className="back-link">← 상세 페이지로 돌아가기</Link>
        {/* --- ▼▼▼ [수정] onClick 핸들러 연결 ▼▼▼ --- */}
        <button className="share-button" onClick={handleShare}><ShareIcon /> 공유하기</button>
        {/* --- ▲▲▲ [수정] 완료 ▲▲▲ --- */}
      </div>
      <h1 className="settlement-title">정산 결과</h1>

      <div className="summary-grid">
        <div className="summary-card">
          <span>총 지출액</span>
          <strong>{result.totalAmount.toLocaleString()}원</strong>
        </div>
        <div className="summary-card">
          <span>참여 인원</span>
          <strong>{result.participantCount}명</strong>
        </div>
      </div>
      
      <div className="view-mode-toggle">
        <button className={viewMode === 'transfer' ? 'active' : ''} onClick={() => setViewMode('transfer')}>송금 내역</button>
        <button className={viewMode === 'receipt' ? 'active' : ''} onClick={() => setViewMode('receipt')}>개인별 내역</button>
      </div>

      {viewMode === 'transfer' && (
        <>
          <div className="sub-view-mode-toggle">
            <button className={transferMode === 'net' ? 'active' : ''} onClick={() => setTransferMode('net')}>순액 정산</button>
            <button className={transferMode === 'gross' ? 'active' : ''} onClick={() => setTransferMode('gross')}>총액 정산</button>
          </div>
          <div className="perspective-filter">
            <div className="participant-select-wrapper">
              <select value={selectedParticipant} onChange={e => setSelectedParticipant(e.target.value)}>
                <option value="all">전체 참여자 기준</option>
                {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            {selectedParticipant !== 'all' && (
              <div className="filter-buttons">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button>
                <button className={filter === 'toPay' ? 'active' : ''} onClick={() => setFilter('toPay')}>보낼 돈</button>
                <button className={filter === 'toReceive' ? 'active' : ''} onClick={() => setFilter('toReceive')}>받을 돈</button>
              </div>
            )}
          </div>
        </>
      )}
      
      {viewMode === 'receipt' && (
         <div className="perspective-filter">
            <div className="participant-select-wrapper">
              <select value={selectedParticipant} onChange={e => setSelectedParticipant(e.target.value)}>
                <option value="all">참여자 선택</option>
                {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
         </div>
      )}
      
      <div className="transfer-section">
        {viewMode === 'transfer' ? (
          <>
            <h2>{sectionTitle}</h2>
            {selectedParticipant !== 'all' && (
              <div className="transaction-summary">
                <div className="transaction-card to-receive">
                  <div className="card-header">
                    <MoneyUpIcon />
                    <span>받을 돈</span>
                  </div>
                  <strong>{totalToReceive.toLocaleString()}원</strong>
                </div>
                <div className="transaction-card to-pay">
                  <div className="card-header">
                    <MoneyDownIcon />
                    <span>보낼 돈</span>
                  </div>
                  <strong>{totalToPay.toLocaleString()}원</strong>
                </div>
              </div>
            )}

            {selectedParticipant !== 'all' && filter === 'toPay' && (
              <GroupedTransferList title="내가 보낼 돈" transfers={toPayTransfers} type="toPay" />
            )}
            {selectedParticipant !== 'all' && filter === 'toReceive' && (
              <GroupedTransferList title="내가 받을 돈" transfers={toReceiveTransfers} type="toReceive" />
            )}
            
            {(selectedParticipant === 'all' || filter === 'all') && (
                transfersToDisplay.length > 0 ? (
                  <ul className="transfer-list">
                    {transfersToDisplay.map((t, index) => <TransferListItem key={index} transfer={t} />)}
                  </ul>
                ) : <p className="no-transfer-message">정산할 내역이 없습니다.</p>
            )}
          </>
        ) : (
          renderReceiptView()
        )}
      </div>
    </div>
  );
}

const TransferListItem = ({ transfer }) => (
  // ... (기존과 동일)
  <li className="transfer-list-item">
    <div className="participant-info from">
      <span className="avatar from">{transfer.from.charAt(0)}</span>
      <span className="name">{transfer.from}</span>
    </div>
    <span className="arrow">→</span>
    <div className="participant-info to">
      <span className="avatar to">{transfer.to.charAt(0)}</span>
      <span className="name">{transfer.to}</span>
    </div>
    <span className="amount">{transfer.amount.toLocaleString()}원</span>
  </li>
);

const GroupedTransferList = ({ title, transfers, type }) => {
  // ... (기존과 동일)
  if (transfers.length === 0) {
    return <p className="no-transfer-message">{type === 'toPay' ? '보낼 돈이 없습니다.' : '받을 돈이 없습니다.'}</p>;
  }
  const total = transfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grouped-list">
      <h3 className="grouped-list-title">{title}<span>총 {total.toLocaleString()}원</span></h3>
      <ul>
        {transfers.map((t, index) => {
          const displayName = type === 'toPay' ? t.to : t.from;
          return (
            <li key={index}>
              <span className="arrow">{type === 'toPay' ? '→' : '←'}</span>
              <div className="participant-info">
                <span className="name">{displayName}</span>
              </div>
              <span className="amount">{t.amount.toLocaleString()}원</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SettlementResultView;