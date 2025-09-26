import React from 'react';

const ChevronIcon = ({ isExpanded }) => (
  <svg className={`chevron-icon ${isExpanded ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

function AccordionSection({ title, subtitle, isOpen, onToggle, children }) {
  return (
    <div className="accordion-section">
      <button type="button" className="accordion-header" onClick={onToggle}>
        <div className="accordion-title-group">
          <span className="accordion-title">{title}</span>
          {subtitle && <span className="accordion-subtitle">{subtitle}</span>}
        </div>
        <ChevronIcon isExpanded={isOpen} />
      </button>
      {/* ✨ [핵심 수정] 애니메이션을 위한 grid wrapper div 추가 */}
      <div className={`accordion-content-wrapper ${isOpen ? 'expanded' : ''}`}>
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