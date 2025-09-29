import React, { useState, useEffect, useCallback } from 'react';
import FullSplitViewModal from './FullSplitViewModal';
import AccordionSection from './AccordionSection';

// --- 아이콘 SVG 및 헬퍼 함수 ---
const LockIcon = ({ isLocked }) => ( <svg width="16" height="16" viewBox="0 0 24 24" fill={isLocked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isLocked ? <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /> : <path d="M5 11H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2m-4-4a5 5 0 0 0-10 0v4h10V7z" />}</svg> );
const formatNumber = (num) => { if (num === null || num === undefined || isNaN(num)) return ''; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
const unformatNumber = (str) => { if (typeof str !== 'string' || str.trim() === '') return 0; return Number(str.replace(/,/g, '')); };

function AddExpenseModal({ isOpen, onClose, project, onUpdate, apiBaseUrl }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitMethod, setSplitMethod] = useState('equally');
  
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [validationError, setValidationError] = useState('');
  const [pennyRoundingTargetId, setPennyRoundingTargetId] = useState('');
  const [splitParticipantIds, setSplitParticipantIds] = useState(new Set());
  const [splitDetails, setSplitDetails] = useState({});
  const [splitDetailStrings, setSplitDetailStrings] = useState({});
  const [lockedParticipants, setLockedParticipants] = useState(new Set());
  const [isFullSplitViewOpen, setIsFullSplitViewOpen] = useState(false);
  const [openSection, setOpenSection] = useState('basic');

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const participants = project?.participants || [];
  const categories = project?.categories || []; // ✨

  const handleToggleSection = (sectionName) => {
    setOpenSection(prevSection => (prevSection === sectionName ? null : sectionName));
  };

  const setDefaultSplits = useCallback((method) => {
    const totalAmount = unformatNumber(amount);
    if ((method === 'amount' && !totalAmount) || participants.length === 0) {
      setSplitDetails({}); setSplitDetailStrings({}); return;
    }
    let newDetails = {};
    let newDetailStrings = {};

    if (method === 'amount') {
      const baseAmount = Math.floor(totalAmount / participants.length);
      const remainder = totalAmount % participants.length;
      participants.forEach((p, index) => {
        newDetails[p.id] = baseAmount + (index < remainder ? 1 : 0);
        newDetailStrings[p.id] = formatNumber(newDetails[p.id]);
      });
    } else if (method === 'percentage') {
      const basePercentage = Math.floor(100 / participants.length);
      const remainder = 100 % participants.length;
      participants.forEach((p, index) => {
        const finalPercentage = basePercentage + (index < remainder ? 1 : 0);
        newDetails[p.id] = finalPercentage;
        newDetailStrings[p.id] = String(finalPercentage);
      });
    }
    setSplitDetails(newDetails);
    setSplitDetailStrings(newDetailStrings);
  }, [amount, participants]);

  const rebalanceAmounts = useCallback((updatedDetails, focusedParticipantId = null) => {
    const totalAmount = unformatNumber(amount);
    if (!totalAmount || participants.length === 0) return { newDetails: updatedDetails, newStrings: {} };
    const unlockedParticipants = participants.filter(p => !lockedParticipants.has(p.id) && p.id !== focusedParticipantId);
    if (unlockedParticipants.length === 0) return { newDetails: updatedDetails, newStrings: {} };
    let currentTotal = 0;
    participants.forEach(p => { if (lockedParticipants.has(p.id) || p.id === focusedParticipantId) { currentTotal += Math.round(Number(updatedDetails[p.id] || 0)); } });
    const remainingAmount = totalAmount - currentTotal;
    const newDetails = { ...updatedDetails };
    const newStrings = {};
    if (remainingAmount >= 0 && unlockedParticipants.length > 0) {
      const baseShare = Math.floor(remainingAmount / unlockedParticipants.length);
      const remainder = remainingAmount % unlockedParticipants.length;
      unlockedParticipants.forEach((p, index) => {
        const share = baseShare + (index < remainder ? 1 : 0);
        newDetails[p.id] = share;
        newStrings[p.id] = formatNumber(share);
      });
    }
    return { newDetails, newStrings };
  }, [amount, participants, lockedParticipants]);

  const rebalancePercentages = useCallback((updatedDetails, focusedParticipantId = null) => {
    const unlockedParticipants = participants.filter(p => !lockedParticipants.has(p.id) && p.id !== focusedParticipantId);
    if (unlockedParticipants.length === 0) return { newDetails: updatedDetails, newStrings: {} };
    let currentTotal = 0;
    participants.forEach(p => { if (lockedParticipants.has(p.id) || p.id === focusedParticipantId) { currentTotal += Number(updatedDetails[p.id] || 0); } });
    const remainingPercentage = 100 - currentTotal;
    const newDetails = { ...updatedDetails };
    const newStrings = {};
    if (unlockedParticipants.length > 0) {
        const share = remainingPercentage / unlockedParticipants.length;
        unlockedParticipants.forEach(p => {
            newDetails[p.id] = share;
            newStrings[p.id] = share.toFixed(1).replace(/\.0$/, '');
        });
    }
    return { newDetails, newStrings };
  }, [participants, lockedParticipants]);

  useEffect(() => {
    if (isOpen) {
      // ✨ [수정] 카테고리 API 호출 로직 삭제, project.categories에서 기본값 설정
      if (categories.length > 0) {
        setSelectedCategory(categories[0].id);
      }
      setDesc(''); setAmount('0'); setPayerId(''); setSplitMethod('equally');
      setSplitDetails({}); setSplitDetailStrings({}); setValidationError('');
      setLockedParticipants(new Set());
      setPennyRoundingTargetId('');
      setOpenSection('basic');
      if (project?.participants) {
        setSplitParticipantIds(new Set(project.participants.map(p => p.id)));
      }
    }
  }, [isOpen, project, categories]); // ✨ 의존성 배열에 categories 추가

  const handleSplitMethodChange = (method) => {
    setSplitMethod(method);
    setLockedParticipants(new Set());
    setDefaultSplits(method);
  }

  useEffect(() => {
    if (isOpen && (splitMethod === 'amount' || splitMethod === 'percentage')) {
        setDefaultSplits(splitMethod);
    }
  }, [amount, isOpen, splitMethod, setDefaultSplits]);

  const handleSplitDetailChange = (participantId, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, '');
    let newDetails = { ...splitDetails };
    let newStrings = { ...splitDetailStrings, [participantId]: cleanedValue };

    if (splitMethod === 'amount') {
        const numValue = unformatNumber(cleanedValue);
        newDetails[participantId] = numValue;
        newStrings[participantId] = formatNumber(numValue);
        const { newDetails: rebalancedDetails, newStrings: rebalancedStrings } = rebalanceAmounts(newDetails, participantId);
        newDetails = rebalancedDetails;
        Object.assign(newStrings, rebalancedStrings);
    } else if (splitMethod === 'percentage') {
        // ✨ [핵심 수정] 100을 초과하는 값을 입력하면 100으로 자동 수정하는 로직
        let numValue = parseFloat(cleanedValue) || 0;
        if (numValue > 100) {
            numValue = 100;
            newStrings[participantId] = '100'; // 화면에 보이는 값도 100으로 수정
        }
        newDetails[participantId] = numValue;
        
        const { newDetails: rebalancedDetails, newStrings: rebalancedStrings } = rebalancePercentages(newDetails, participantId);
        newDetails = rebalancedDetails;
        Object.assign(newStrings, rebalancedStrings);
    }
    
    setSplitDetails(newDetails);
    setSplitDetailStrings(newStrings);
  };
  
  const handleSplitDetailBlur = (participantId) => { if (splitMethod === 'percentage') { const value = parseFloat(splitDetailStrings[participantId]) || 0; setSplitDetailStrings(prev => ({ ...prev, [participantId]: String(value).replace(/\.0$/, '') })); } };
  const toggleLock = (participantId) => { setLockedParticipants(prev => { const newSet = new Set(prev); if (newSet.has(participantId)) newSet.delete(participantId); else newSet.add(participantId); return newSet; }); };
  const handleParticipantSelectionChange = (participantId) => { setSplitParticipantIds(prev => { const newSet = new Set(prev); if (newSet.has(participantId)) newSet.delete(participantId); else newSet.add(participantId); return newSet; }); };
  const handleSelectAllToggle = () => { if (splitParticipantIds.size === participants.length) { setSplitParticipantIds(new Set()); } else { setSplitParticipantIds(new Set(participants.map(p => p.id))); } };

  const handleAddExpense = () => {
    setValidationError('');
    const totalAmount = unformatNumber(amount);
    if (!desc.trim() || !totalAmount || !payerId || !project?.id) { setValidationError('모든 항목(내용, 금액, 결제자)을 입력해주세요.'); return; }
    if (splitMethod === 'equally' && splitParticipantIds.size === 0) { setValidationError('비용을 분담할 참여자를 한 명 이상 선택해주세요.'); return; }
    if (splitMethod === 'amount') { const splitSum = Object.values(splitDetails).reduce((sum, val) => sum + Number(val || 0), 0); if (Math.abs(splitSum - totalAmount) > 0.01) { setValidationError(`금액의 합계(${formatNumber(Math.round(splitSum))}원)가 총 지출액(${formatNumber(totalAmount)}원)과 일치하지 않습니다.`); return; }
    } else if (splitMethod === 'percentage') { const splitSum = Object.values(splitDetails).reduce((sum, val) => sum + Number(val || 0), 0); if (Math.abs(100 - splitSum) > 0.1) { setValidationError(`비율의 합계(${splitSum.toFixed(1)}%)가 100%가 되어야 합니다.`); return; } }
    fetch(`${apiBaseUrl}/projects/${project.id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desc, amount: totalAmount, payer_id: Number(payerId), split_method: splitMethod, split_details: splitDetails, category_id: Number(selectedCategory), locked_participant_ids: Array.from(lockedParticipants), split_participants: splitMethod === 'equally' ? Array.from(splitParticipantIds) : [], penny_rounding_target_id: pennyRoundingTargetId ? Number(pennyRoundingTargetId) : null })
    }).then(res => { if (!res.ok) throw new Error("Server response was not ok"); onUpdate(); onClose(); }).catch(error => console.error("Failed to add expense:", error));
  };
  
  if (!isOpen) return null;

  const areAllSelected = participants.length > 0 && splitParticipantIds.size === participants.length;
  
  const renderSplitError = () => {
    const renderError = (total, sum, diff, unit) => (
      // ✨ [수정] 총액/합계와 오차를 별도의 div로 그룹화
      <div className="split-error-details">
        <div className="split-error-details-main">
          <span>총액: {formatNumber(total)}{unit}</span>
          <span>합계: {formatNumber(sum)}{unit}</span>
        </div>
        <div className="split-error-details-diff">
          <span className="difference">오차: {formatNumber(diff)}{unit}</span>
        </div>
      </div>
    );

    if (splitMethod === 'amount') {
      const totalAmount = unformatNumber(amount);
      if (totalAmount > 0) {
        const splitSum = Object.values(splitDetails).reduce((s, v) => s + Number(v || 0), 0);
        const difference = totalAmount - splitSum;
        if (difference !== 0) {
          return renderError(totalAmount, splitSum, difference, '원');
        }
      }
    } else if (splitMethod === 'percentage') {
      const splitSum = Object.values(splitDetails).reduce((s, v) => s + Number(v || 0), 0);
      const difference = (100 - splitSum).toFixed(1);
      if (Math.abs(difference) > 0.01) {
        return renderError('100', splitSum.toFixed(1), difference, '%');
      }
    }
    return null;
  };

  const payerName = participants.find(p => p.id === Number(payerId))?.name || '선택';
  const splitMethodText = splitMethod === 'equally' ? '균등 부담' : (splitMethod === 'amount' ? '금액 지정' : '비율 지정');
  const roundingTargetName = participants.find(p => p.id === Number(pennyRoundingTargetId))?.name;

  const desktopLayout = (
    <div className="expense-form">
      <div className="form-item-full"><input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="지출 내용" autoFocus /></div>
      <div className="form-item-half form-group"><label htmlFor="category-select-add">카테고리</label><select id="category-select-add" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>{categories.map(c => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}</select></div>
      <div className="form-item-half floating-label-group"><input id="expense-amount-modal" type="text" value={amount} onChange={e => setAmount(e.target.value)} onBlur={e => setAmount(formatNumber(unformatNumber(e.target.value)))} onFocus={e => {const numValue = unformatNumber(e.target.value); setAmount(numValue === 0 ? '' : String(numValue)); }} placeholder=" " inputMode="numeric"/><label htmlFor="expense-amount-modal">금액</label><span className="unit">원</span></div>
      <div className="form-item-full form-group"><label htmlFor="payer-select-add">결제자</label><select id="payer-select-add" value={payerId} onChange={e => setPayerId(e.target.value)}><option value="" disabled>선택</option>{participants.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      <div className="form-item-full split-method-selector"><button type="button" className={splitMethod === 'equally' ? 'active' : ''} onClick={() => handleSplitMethodChange('equally')}>균등 부담</button><button type="button" className={splitMethod === 'amount' ? 'active' : ''} onClick={() => handleSplitMethodChange('amount')}>금액 지정</button><button type="button" className={splitMethod === 'percentage' ? 'active' : ''} onClick={() => handleSplitMethodChange('percentage')}>비율 지정</button></div>
      {splitMethod === 'equally' && (
          <>
            <div className="form-item-full split-participants-section">
              <div className="split-participants-header"><h4>분담할 참여자</h4><button type="button" onClick={handleSelectAllToggle} className="select-all-button">{areAllSelected ? '전체 해제' : '전체 선택'}</button></div>
              <div className="participant-checkbox-list">{participants.map(p => (<label key={p.id} className="participant-checkbox"><input type="checkbox" checked={splitParticipantIds.has(p.id)} onChange={() => handleParticipantSelectionChange(p.id)} /><span>{p.name}</span></label>))}</div>
            </div>
            <div className="form-item-full">
              <div className="form-group"><label htmlFor="penny-rounding-select-add">10원 미만 단위 몰아주기</label><select id="penny-rounding-select-add" value={pennyRoundingTargetId} onChange={e => setPennyRoundingTargetId(e.target.value)}><option value="">기능 사용 안함</option>{participants.filter(p => splitParticipantIds.has(p.id)).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
            </div>
          </>
      )}
      {(splitMethod === 'amount' || splitMethod === 'percentage') && (
        <div className="form-item-full">
          <div className="split-details-section">
            <div className="split-participants-header"><h4>{splitMethod === 'amount' ? '분담할 금액' : '분담할 비율'}</h4><button type="button" className="select-all-button" onClick={() => setIsFullSplitViewOpen(true)}>전체보기</button></div>
            <div className="split-detail-list">{participants.map(p => (<div key={p.id} className="split-detail-row"><label htmlFor={`split-detail-add-${p.id}`}>{p.name}</label><div className="input-with-unit"><input id={`split-detail-add-${p.id}`} type="text" value={splitDetailStrings[p.id] || ''} onChange={e => handleSplitDetailChange(p.id, e.target.value)} onBlur={() => handleSplitDetailBlur(p.id)} placeholder="0" inputMode="numeric" disabled={lockedParticipants.has(p.id)} /><span>{splitMethod === 'amount' ? '원' : '%'}</span></div><button type="button" className={`lock-button ${lockedParticipants.has(p.id) ? 'locked' : ''}`} onClick={() => toggleLock(p.id)} title={lockedParticipants.has(p.id) ? '금액 잠금 해제' : '금액 잠금'}><LockIcon isLocked={lockedParticipants.has(p.id)} /></button></div>))}</div>
          </div>
          {renderSplitError()}
        </div>
      )}
    </div>
  );

  const mobileLayout = (
    <div className="expense-form">
      <AccordionSection 
        title="기본 정보" 
        subtitle={`${desc || '내용'}, ${amount === '0' || amount === '' ? '0' : formatNumber(unformatNumber(amount))}원 / 결제: ${payerName}`} 
        isOpen={openSection === 'basic'} 
        onToggle={() => handleToggleSection('basic')}
      >
        <div className="form-item-full"><input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="지출 내용" autoFocus /></div>
        <div className="form-item-half form-group"><label htmlFor="category-select-add">카테고리</label><select id="category-select-add" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>{categories.map(c => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}</select></div>
        <div className="form-item-half floating-label-group">
          <input 
            id="expense-amount-modal" 
            type="text" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            onBlur={e => setAmount(formatNumber(unformatNumber(e.target.value)))} 
            onFocus={e => {
              const numValue = unformatNumber(e.target.value);
              setAmount(numValue === 0 ? '' : String(numValue));
            }}
            placeholder=" " 
            inputMode="numeric" 
          />
          <label htmlFor="expense-amount-modal">금액</label>
          <span className="unit">원</span>
        </div>
        <div className="form-item-full form-group"><label htmlFor="payer-select-add">결제자</label><select id="payer-select-add" value={payerId} onChange={e => setPayerId(e.target.value)}><option value="" disabled>선택</option>{participants.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </AccordionSection>

      <AccordionSection title="분배 방식" subtitle={splitMethodText} isOpen={openSection === 'split'} onToggle={() => handleToggleSection('split')}>
        <div className="form-item-full split-method-selector"><button type="button" className={splitMethod === 'equally' ? 'active' : ''} onClick={() => handleSplitMethodChange('equally')}>균등 부담</button><button type="button" className={splitMethod === 'amount' ? 'active' : ''} onClick={() => handleSplitMethodChange('amount')}>금액 지정</button><button type="button" className={splitMethod === 'percentage' ? 'active' : ''} onClick={() => handleSplitMethodChange('percentage')}>비율 지정</button></div>
        {splitMethod === 'equally' && (
          <div className="form-item-full split-participants-section">
            <div className="split-participants-header"><h4>분담할 참여자</h4><button type="button" onClick={handleSelectAllToggle} className="select-all-button">{areAllSelected ? '전체 해제' : '전체 선택'}</button></div>
            <div className="participant-checkbox-list">{participants.map(p => (<label key={p.id} className="participant-checkbox"><input type="checkbox" checked={splitParticipantIds.has(p.id)} onChange={() => handleParticipantSelectionChange(p.id)} /><span>{p.name}</span></label>))}</div>
          </div>
        )}
        {(splitMethod === 'amount' || splitMethod === 'percentage') && (
          <div className="form-item-full">
            <div className="split-details-section">
              <div className="split-participants-header"><h4>{splitMethod === 'amount' ? '분담할 금액' : '분담할 비율'}</h4><button type="button" className="select-all-button" onClick={() => setIsFullSplitViewOpen(true)}>전체보기</button></div>
              <div className="split-detail-list">{participants.map(p => (<div key={p.id} className="split-detail-row"><label htmlFor={`split-detail-add-${p.id}`}>{p.name}</label><div className="input-with-unit"><input id={`split-detail-add-${p.id}`} type="text" value={splitDetailStrings[p.id] || ''} onChange={e => handleSplitDetailChange(p.id, e.target.value)} onBlur={() => handleSplitDetailBlur(p.id)} placeholder="0" inputMode="numeric" disabled={lockedParticipants.has(p.id)} /><span>{splitMethod === 'amount' ? '원' : '%'}</span></div><button type="button" className={`lock-button ${lockedParticipants.has(p.id) ? 'locked' : ''}`} onClick={() => toggleLock(p.id)} title={lockedParticipants.has(p.id) ? '금액 잠금 해제' : '금액 잠금'}><LockIcon isLocked={lockedParticipants.has(p.id)} /></button></div>))}</div>
            </div>
          </div>
        )}
        {renderSplitError()}
      </AccordionSection>

      <AccordionSection
        title="추가 옵션"
        subtitle={roundingTargetName ? `10원 미만 몰아주기: ${roundingTargetName}` : '선택 안함'}
        isOpen={openSection === 'options'}
        onToggle={() => handleToggleSection('options')}
        // ✨ [핵심 수정] 아래 disabled 속성을 추가합니다.
        disabled={isMobile && (splitMethod === 'amount' || splitMethod === 'percentage')}
      >
        <div className="form-item-full">
          <div className="form-group">
            <label htmlFor="penny-rounding-select-add">10원 미만 단위 몰아주기</label>
            <select id="penny-rounding-select-add" value={pennyRoundingTargetId} onChange={e => setPennyRoundingTargetId(e.target.value)}>
              <option value="">기능 사용 안함</option>{participants.filter(p => splitMethod === 'equally' ? splitParticipantIds.has(p.id) : true).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
          </div>
        </div>
      </AccordionSection>
    </div>
  );

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content add-expense-modal" onClick={e => e.stopPropagation()}>
          <h2>지출 항목 추가</h2>
          {isMobile ? mobileLayout : desktopLayout}
          <div className="modal-footer">{validationError && <p className="error-message">{validationError}</p>}<div className="modal-buttons"><button type="button" className="cancel-button" onClick={onClose}>취소</button><button type="button" className="confirm-button" onClick={handleAddExpense}>추가</button></div></div>
        </div>
      </div>
      <FullSplitViewModal isOpen={isFullSplitViewOpen} onClose={() => setIsFullSplitViewOpen(false)} participants={participants} splitMethod={splitMethod} splitDetailStrings={splitDetailStrings} lockedParticipants={lockedParticipants} handleSplitDetailChange={handleSplitDetailChange} handleSplitDetailBlur={handleSplitDetailBlur} toggleLock={toggleLock} renderSplitError={renderSplitError}  />
    </>
  );
}
export default AddExpenseModal;