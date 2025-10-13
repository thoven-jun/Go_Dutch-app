import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SettlementResultView.css';

function SettlementResultView({ apiBaseUrl }) {
  const [result, setResult] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState('');
  const { projectId } = useParams();
  const [viewMode, setViewMode] = useState('transfer'); 
  const [transferMode, setTransferMode] = useState('net');

  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState('all');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // 탭이 변경될 때 필터 상태를 초기화합니다.
    setSelectedParticipant('all');
    setFilter('all');
  }, [viewMode]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/projects`)
      .then(res => res.json())
      .then(allProjects => {
        const currentProject = allProjects.find(p => p.id === parseInt(projectId));
        if (currentProject && currentProject.participants) {
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
  
  const getFilteredTransfers = () => {
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
    if (!receiptData) return <p className="receipt-placeholder">개인별 지출 내역을 불러오는 중입니다...</p>;
    if (receiptData.length === 0) return <p className="receipt-placeholder">표시할 지출 내역이 없습니다.</p>;

    const selectedReceipt = receiptData.find(r => r.participantName === selectedParticipant);

    return (
      <div className="receipt-view">
        {selectedParticipant === 'all' ? (
          <p className="receipt-placeholder">참여자를 선택하여 상세 지출 내역을 확인하세요.</p>
        ) : selectedReceipt ? (
          <div className="receipt-card">
            <header className="receipt-header">
              <h3>{selectedReceipt.participantName}님의 지출 내역</h3>
              <div className="receipt-total">
                <span>총 부담액</span>
                <strong>{selectedReceipt.totalSpent.toLocaleString()}원</strong>
              </div>
            </header>
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

  return (
    <div className="settlement-container">
      <Link to={`/project/${projectId}`} className="back-link">← 상세 페이지로 돌아가기</Link>
      <h1 className="settlement-title">정산 결과</h1>
      <div className="summary-card">
        <div><span>총 지출액:</span> <strong>{result.totalAmount.toLocaleString()}원</strong></div>
        <div><span>참여 인원:</span> <strong>{result.participantCount}명</strong></div>
      </div>

      <div className="view-mode-toggle">
        <button className={viewMode === 'transfer' ? 'active' : ''} onClick={() => setViewMode('transfer')}>송금 내역</button>
        <button className={viewMode === 'receipt' ? 'active' : ''} onClick={() => setViewMode('receipt')}>개인별 지출 내역</button>
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