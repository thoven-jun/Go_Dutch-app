import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SettlementResultView.css';

function SettlementResultView({ apiBaseUrl }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { projectId } = useParams();

  useEffect(() => {
    // API 주소에서 '/api' 제거
    fetch(`${apiBaseUrl}/projects/${projectId}/settlement`)
      .then(res => {
        if (!res.ok) {
          throw new Error('정산 데이터를 불러오는 데 실패했습니다.');
        }
        return res.json();
      })
      .then(data => setResult(data))
      .catch(err => {
        console.error(err);
        setError('정산 결과를 계산하는 중 오류가 발생했습니다.');
      });
  }, [projectId, apiBaseUrl]);

  if (error) {
    return <div className="settlement-container">{error}</div>;
  }

  if (!result) {
    return <div className="settlement-container">정산 결과를 계산하는 중입니다...</div>;
  }

  return (
    <div className="settlement-container">
      <Link to={`/project/${projectId}`} className="back-link">← 상세 페이지로 돌아가기</Link>
      <h1 className="settlement-title">정산 결과</h1>

      <div className="summary-card">
        <div><span>총 지출액:</span> <strong>{result.totalAmount.toLocaleString()}원</strong></div>
        <div><span>참여 인원:</span> <strong>{result.participantCount}명</strong></div>
        <div><span>1인당 부담액:</span> <strong>{result.perPersonAmount.toLocaleString()}원</strong></div>
      </div>

      <div className="transfer-section">
        <h2>💸 송금할 내역</h2>
        {result.transfers.length > 0 ? (
          <ul className="transfer-list">
            {result.transfers.map((t, index) => (
              <li key={index} className="transfer-item">
                <span className="from">{t.from}</span>
                <span className="arrow">→</span>
                <span className="to">{t.to}</span>
                <span className="amount">{t.amount.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>정산할 내역이 없습니다. (모든 비용이 0원이거나 정산이 완료되었습니다.)</p>
        )}
      </div>
    </div>
  );
}

export default SettlementResultView;