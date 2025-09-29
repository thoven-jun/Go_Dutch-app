import React, { useState, useEffect, useRef } from 'react';
import './Settings.css';

const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );
const SaveIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> );
const CancelIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );
const ChevronDownIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> );

const EMOJI_OPTIONS = [
  '🍔', '☕️', '🛒', '🚗', '✈️', '🏠', '🎁', '🎬', '🎵', '⚕️',
  '🍻', '🍰', '🛍️', '🚌', '🚢', '⛽️', '📦', '🧾', '🎉', '💡',
  '🍕', '🍜', '🏨', '🚄', '🚇', '🏠', '👔', '💅', '🎓', '🐶',
  '💰', '💳', '📈', '🔨', '💻', '📞', '📚', '⚽️', '🎨', '💊',
  '🍦', '🍎', '💧', '🧺', '👕', '💄', '👶', '🌿'
];

// --- ✨ [추가] 이모지 피커 컴포넌트 ---
const EmojiPicker = ({ selectedEmoji, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="emoji-picker" ref={pickerRef}>
      <button type="button" className="emoji-picker-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="selected-emoji">{selectedEmoji}</span>
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="emoji-picker-dropdown">
          {EMOJI_OPTIONS.map(emoji => (
            <button key={emoji} type="button" className="emoji-option" onClick={() => handleSelect(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function Settings({ apiBaseUrl, showAlert, onUpdate }) {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState({ id: null, name: '', emoji: '🍔' });
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '🍔' });
  const newCategoryNameInputRef = useRef(null);

  const fetchCategories = () => {
    fetch(`${apiBaseUrl}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data.sort((a, b) => a.id - b.id)))
      .catch(error => console.error("Error fetching categories:", error));
  };

  useEffect(() => {
    fetchCategories();
  }, [apiBaseUrl]);

  const handleStartEditing = (category) => {
    setEditing({ id: category.id, name: category.name, emoji: category.emoji });
  };

  const handleCancelEditing = () => {
    setEditing({ id: null, name: '', emoji: '' });
  };

  const handleSaveEditing = () => {
    if (!editing.name.trim() || !editing.emoji.trim()) {
      showAlert('입력 오류', '카테고리 이름과 이모지를 모두 입력해주세요.');
      return;
    }
    fetch(`${apiBaseUrl}/categories/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, emoji: editing.emoji }),
    })
    .then(res => res.json())
    .then(() => {
      fetchCategories();
      onUpdate();
      handleCancelEditing();
    });
  };

  const handleDeleteCategory = (categoryId) => {
    showAlert(
      '카테고리 삭제',
      '정말 이 카테고리를 삭제하시겠습니까?',
      () => {
        fetch(`${apiBaseUrl}/categories/${categoryId}`, { method: 'DELETE' })
          .then(res => {
            if (!res.ok) {
              return res.json().then(err => { throw new Error(err.error) });
            }
            fetchCategories();
            onUpdate();  
          })
          .catch(err => {
            const message = err.message.includes("in use")
              ? '해당 카테고리를 사용하고 있는 지출 내역이 있어 삭제할 수 없습니다.'
              : '카테고리 삭제 중 오류가 발생했습니다.';
            showAlert('삭제 실패', message);
          });
      }
    );
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim() || !newCategory.emoji.trim()) {
      showAlert('입력 오류', '새 카테고리의 이름과 이모지를 모두 입력해주세요.');
      return;
    }
    fetch(`${apiBaseUrl}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    })
    .then(res => res.json())
    .then(() => {
      fetchCategories();
      onUpdate();
      setNewCategory({ name: '', emoji: '' });
      if(newCategoryNameInputRef.current) {
        newCategoryNameInputRef.current.focus();
      }
    });
  };

   return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>설정</h1>
      </header>
      <div className="settings-content">
        <section className="settings-section">
          <h2>카테고리 관리</h2>
          <p className="section-description">지출 내역에 사용될 카테고리를 관리합니다.</p>
          <ul className="category-list">
            {categories.map(cat => (
              <li key={cat.id} className="category-item">
                {editing.id === cat.id ? (
                  <div className="edit-form">
                    {/* ✨ [수정] 텍스트 입력창 -> 이모지 피커 */}
                    <EmojiPicker 
                      selectedEmoji={editing.emoji}
                      onSelect={(emoji) => setEditing({...editing, emoji})}
                    />
                    <input
                      type="text"
                      className="name-input"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      autoFocus
                    />
                    <div className="category-actions">
                      <button onClick={handleSaveEditing} className="action-button save-button"><SaveIcon /></button>
                      <button onClick={handleCancelEditing} className="action-button cancel-button"><CancelIcon /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="category-info">
                      <span className="category-emoji">{cat.emoji}</span>
                      <span className="category-name">{cat.name}</span>
                    </div>
                    <div className="category-actions">
                      <button onClick={() => handleStartEditing(cat)} className="action-button"><EditIcon /></button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="action-button"><DeleteIcon /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="add-category-form">
            {/* ✨ [수정] 텍스트 입력창 -> 이모지 피커 */}
            <EmojiPicker 
              selectedEmoji={newCategory.emoji}
              onSelect={(emoji) => setNewCategory({...newCategory, emoji})}
            />
            <input
              type="text"
              className="name-input"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="새 카테고리 이름"
              ref={newCategoryNameInputRef}
            />
            <button onClick={handleAddCategory} className="add-button">추가</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;