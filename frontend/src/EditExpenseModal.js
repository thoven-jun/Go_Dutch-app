import React, { useState, useEffect, useCallback } from 'react';

// --- 아이콘 SVG 및 헬퍼 함수 (AddExpenseModal과 동일) ---
const LockIcon = ({ isLocked }) => ( <svg width="16" height="16" viewBox="0 0 24 24" fill={isLocked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isLocked ? <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /> : <path d="M5 11H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2m-4-4a5 5 0 0 0-10 0v4h10V7z" />}</svg> );
const formatNumber = (num) => { if (num === null || num === undefined || isNaN(num)) return ''; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
const unformatNumber = (str) => { if (typeof str !== 'string' || str.trim() === '') return 0; return Number(str.replace(/,/g, '')); };
const formatPercentage = (num) => { if (num === null || num === undefined || isNaN(num)) return ''; return String(Math.round(num * 10) / 10); };


function EditExpenseModal({ isOpen, onClose, project, expense, onSave }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitMethod, setSplitMethod] = useState('equally');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [validationError, setValidationError] = useState('');

  // --- ✨ [추가] 10원 몰아주기 상태 변수 ---
  const [pennyRoundingTargetId, setPennyRoundingTargetId] = useState('');

  const [splitDetails, setSplitDetails] = useState({});
  const [splitDetailStrings, setSplitDetailStrings] = useState({});
  const [lockedParticipants, setLockedParticipants] = useState(new Set());

  const participants = project?.participants || [];

  const setDefaultSplits = useCallback((method) => {
    const totalAmount = unformatNumber(amount);
    if ((method === 'amount' && !totalAmount) || participants.length === 0) {
        setSplitDetails({}); setSplitDetailStrings({}); return;
    };
    let newDetails = {};
    let newDetailStrings = {};
    if (method === 'amount') {
      const baseAmount = Math.floor(totalAmount / participants.length);
      let remainder = totalAmount % participants.length;
      const targetId = payerId ? Number(payerId) : (participants[0]?.id || null);
      participants.forEach(p => { newDetails[p.id] = baseAmount; });
      if (targetId && newDetails[targetId] !== undefined) { newDetails[targetId] += remainder; }
      participants.forEach(p => { newDetailStrings[p.id] = formatNumber(newDetails[p.id]); });
    } else if (method === 'percentage') {
      const basePercentage = Math.floor(100 / participants.length);
      const remainder = 100 % participants.length;
      const targetId = payerId ? Number(payerId) : (participants[0]?.id || null);
      participants.forEach(p => { newDetails[p.id] = basePercentage; });
      if (targetId && newDetails[targetId] !== undefined) { newDetails[targetId] += remainder; }
      participants.forEach(p => { newDetailStrings[p.id] = String(newDetails[p.id]); });
    }
    setSplitDetails(newDetails);
    setSplitDetailStrings(newDetailStrings);
  }, [amount, participants, payerId]);

  const rebalancePercentages = useCallback((focusedParticipantId = null) => {
    const unlockedParticipants = participants.filter(p => !lockedParticipants.has(p.id) && p.id !== focusedParticipantId);
    if (unlockedParticipants.length === 0) return;
    let currentTotal = 0;
    participants.forEach(p => { if (lockedParticipants.has(p.id) || p.id === focusedParticipantId) { currentTotal += Number(splitDetails[p.id] || 0); } });
    const remainingPercentage = 100 - currentTotal;
    const baseShare = Math.floor(remainingPercentage / unlockedParticipants.length);
    const remainder = remainingPercentage % unlockedParticipants.length;
    
    setSplitDetails(prev => { const newDetails = { ...prev }; unlockedParticipants.forEach((p, i) => { newDetails[p.id] = baseShare + (i < remainder ? 1 : 0); }); return newDetails; });
    setSplitDetailStrings(prev => { const newStrings = { ...prev }; unlockedParticipants.forEach((p, i) => { newStrings[p.id] = String(baseShare + (i < remainder ? 1 : 0)); }); return newStrings; });
  }, [participants, lockedParticipants, splitDetails]);
  const rebalanceAmounts = useCallback((focusedParticipantId = null) => {
    const totalAmount = unformatNumber(amount);
    if (!totalAmount || participants.length === 0) return;
    const unlockedParticipants = participants.filter(p => !lockedParticipants.has(p.id) && p.id !== focusedParticipantId);
    if (unlockedParticipants.length === 0) return;
    let currentTotal = 0;
    participants.forEach(p => { if (lockedParticipants.has(p.id) || p.id === focusedParticipantId) { currentTotal += Math.round(Number(splitDetails[p.id] || 0)); } });
    const remainingAmount = totalAmount - currentTotal;
    if(remainingAmount < 0) return;
    const baseShare = Math.floor(remainingAmount / unlockedParticipants.length);
    const remainder = remainingAmount % unlockedParticipants.length;
    
    setSplitDetails(prev => { const newDetails = { ...prev }; unlockedParticipants.forEach((p, index) => { newDetails[p.id] = baseShare + (index < remainder ? 1 : 0); }); return newDetails; });
    setSplitDetailStrings(prev => { const newStrings = { ...prev }; unlockedParticipants.forEach((p, index) => { newStrings[p.id] = formatNumber(baseShare + (index < remainder ? 1 : 0)); }); return newStrings; });
  }, [amount, participants, lockedParticipants, splitDetails]);

  useEffect(() => {
    if (isOpen && expense) {
      fetch(`${apiBaseUrl}/categories`).then(res => res.json()).then(data => setCategories(data));
      setDesc(expense.desc);
      setAmount(formatNumber(expense.amount));
      setPayerId(expense.payer_id || ''); 
      setSplitMethod(expense.split_method || 'equally');
      setSelectedCategory(expense.category_id || '');
      setValidationError('');
      const initialDetails = expense.split_details || {};
      setSplitDetails(initialDetails);
      const initialStrings = {};
      const method = expense.split_method || 'equally';
      if (method !== 'equally') {
        participants.forEach(p => {
            const value = initialDetails[p.id];
            if (value !== undefined) {
            initialStrings[p.id] = method === 'amount' ? formatNumber(value) : String(value);
            }
        });
      }
      setSplitDetailStrings(initialStrings);
      setLockedParticipants(new Set(expense.locked_participant_ids || []));
      setPennyRoundingTargetId(expense.penny_rounding_target_id || '');
    }
  }, [isOpen, expense, participants]);
  
  const handleSplitMethodChange = (method) => {
      setSplitMethod(method);
      setLockedParticipants(new Set());
      setDefaultSplits(method);
  }
  
  useEffect(() => {
    if (isOpen && (splitMethod === 'amount' || splitMethod === 'percentage') && lockedParticipants.size === 0) {
        setDefaultSplits(splitMethod);
    }
  }, [amount, payerId, isOpen, splitMethod, setDefaultSplits, lockedParticipants.size]);

  const handleSplitDetailChange = (participantId, value) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    if (splitMethod === 'amount') {
        setSplitDetails(prev => ({ ...prev, [participantId]: unformatNumber(cleanedValue) }));
        setSplitDetailStrings(prev => ({ ...prev, [participantId]: formatNumber(unformatNumber(cleanedValue)) }));
    } else if (splitMethod === 'percentage') {
        const numericValue = Math.min(100, Number(cleanedValue) || 0);
        setSplitDetails(prev => ({ ...prev, [participantId]: numericValue }));
        setSplitDetailStrings(prev => ({ ...prev, [participantId]: String(numericValue) }));
    }
  };
  const handleSplitDetailBlur = (participantId) => {
      if (splitMethod === 'amount') rebalanceAmounts(participantId);
      else if (splitMethod === 'percentage') rebalancePercentages(participantId);
  };
  
  const toggleLock = (participantId) => { setLockedParticipants(prev => { const newSet = new Set(prev); if (newSet.has(participantId)) newSet.delete(participantId); else newSet.add(participantId); return newSet; }); };

  const handleSaveExpense = () => {
    const totalAmount = unformatNumber(amount);
    if (!desc.trim() || !totalAmount || !payerId || !project?.id) {
        setValidationError('모든 항목(내용, 금액, 결제자)을 입력해주세요.');
        return;
    }
     if (splitMethod === 'amount') {
        const splitSum = Object.values(splitDetails).reduce((sum, val) => sum + Number(val || 0), 0);
        if (Math.abs(splitSum - totalAmount) > 0.01) {
            setValidationError(`금액의 합계(${formatNumber(Math.round(splitSum))}원)가 총 지출액(${formatNumber(totalAmount)}원)과 일치하지 않습니다.`);
            return;
        }
    } else if (splitMethod === 'percentage') {
        const splitSum = Object.values(splitDetails).reduce((sum, val) => sum + Number(val || 0), 0);
        if (splitSum !== 100) {
            setValidationError(`비율의 합계(${splitSum}%)가 100%가 되어야 합니다.`);
            return;
        }
    }
    const updatedExpenseData = {
      desc, amount: totalAmount, payer_id: Number(payerId),
      split_method: splitMethod, split_details: splitDetails,
      category_id: Number(selectedCategory),
      locked_participant_ids: Array.from(lockedParticipants),
      // --- ✨ [추가] 몰아주기 대상 ID 전송 ---
      penny_rounding_target_id: pennyRoundingTargetId ? Number(pennyRoundingTargetId) : null
    };
    onSave(expense.id, updatedExpenseData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content add-expense-modal" onClick={e => e.stopPropagation()}>
        <h2>지출 항목 수정</h2>
        <div className="expense-form">
          <div className="form-item-full"><input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="지출 내용" autoFocus /></div>
          <div className="form-item-half form-group"><label htmlFor="category-select-edit">카테고리</label><select id="category-select-edit" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>{categories.map(c => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}</select></div>
          <div className="form-item-half floating-label-group"><input id="expense-amount-edit-modal" type="text" value={amount} onChange={e => setAmount(e.target.value)} onBlur={e => setAmount(formatNumber(unformatNumber(e.target.value)))} onFocus={e => setAmount(String(unformatNumber(e.target.value)))} placeholder=" " inputMode="numeric" /><label htmlFor="expense-amount-edit-modal">금액</label><span className="unit">원</span></div>
          <div className="form-item-full form-group"><label htmlFor="payer-select-edit">결제자</label><select id="payer-select-edit" value={payerId} onChange={e => setPayerId(e.target.value)}><option value="" disabled>선택</option>{participants.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
          <div className="form-item-full split-method-selector">
            <button type="button" className={splitMethod === 'equally' ? 'active' : ''} onClick={() => handleSplitMethodChange('equally')}>균등 부담</button>
            <button type="button" className={splitMethod === 'amount' ? 'active' : ''} onClick={() => handleSplitMethodChange('amount')}>금액 지정</button>
            <button type="button" className={splitMethod === 'percentage' ? 'active' : ''} onClick={() => handleSplitMethodChange('percentage')}>비율 지정</button>
          </div>
          {splitMethod === 'equally' && (
            <div className="form-item-full">
              <div className="form-group">
                <label htmlFor="penny-rounding-select-edit">10원 미만 단위 몰아주기</label>
                <select 
                  id="penny-rounding-select-edit" 
                  value={pennyRoundingTargetId} 
                  onChange={e => setPennyRoundingTargetId(e.target.value)}
                >
                  <option value="">기능 사용 안함</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">{validationError && <p className="error-message">{validationError}</p>}<div className="modal-buttons"><button type="button" className="cancel-button" onClick={onClose}>취소</button><button type="button" className="confirm-button" onClick={handleSaveExpense}>저장</button></div></div>
      </div>
    </div>
  );
}
export default EditExpenseModal;