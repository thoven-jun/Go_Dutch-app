// src/AccordionSection.js

import React from 'react';

const ChevronIcon = ({ isExpanded }) => (
  <svg className={`chevron-icon ${isExpanded ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// ✨ [1/2] disabled prop 추가 (기본값은 false)
function AccordionSection({ title, subtitle, isOpen, onToggle, children, disabled = false }) {
  return (
    // ✨ [2/2] disabled 상태일 때 CSS 클래스를 추가하고, 버튼을 비활성화
    <div className={`accordion-section ${disabled ? 'disabled' : ''}`}>
      <button 
        type="button" 
        className="accordion-header" 
        onClick={!disabled ? onToggle : undefined} 
        disabled={disabled}
      >
        <div className="accordion-title-group">
          <span className="accordion-title">{title}</span>
          {subtitle && <span className="accordion-subtitle">{subtitle}</span>}
        </div>
        <ChevronIcon isExpanded={isOpen} />
      </button>
      <div className={`accordion-content-wrapper ${isOpen && !disabled ? 'expanded' : ''}`}>
        <div className="accordion-content">
          <div className="accordion-content-inner">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccordionSection;