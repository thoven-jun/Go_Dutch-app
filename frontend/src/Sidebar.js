import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import './Sidebar.css';

// --- 아이콘 SVG들 ---
const KebabMenuIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );
const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const NewChatIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"></path></svg> );
const SettingsIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> );
const SidebarToggleIcon = ({ isCollapsed }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1={isCollapsed ? "8" : "3"} y1={isCollapsed ? "12" : "12"} x2={isCollapsed ? "16" : "12"} y2={isCollapsed ? "12" : "12"} /></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );
const ArchiveIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg> );

function ProjectItem({ project, onOpenRenameModal, onDeleteProject, onCloseMobileSidebar, isMenuOpen, setOpenMenuId, isSelectionMode, selectedProjects, onProjectSelect }) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  const isSelected = selectedProjects.has(project.id);
  
  // ✨ [1/3] 롱 프레스를 위한 타이머와 터치 위치를 저장할 ref 추가
  const longPressTimer = useRef();
  const touchCoords = useRef({ x: 0, y: 0 });
  const isLongPress = useRef(false);

  const showMenu = (e, isKebabClick = false) => {
     e.preventDefault();
     e.stopPropagation();
     
     const menuWidth = 140;
     const screenWidth = window.innerWidth;
     const margin = 16;
     let x, y;

     if (isKebabClick) {
      const rect = e.currentTarget.getBoundingClientRect();
      x = rect.left; y = rect.bottom;
    } else {
      // 롱 프레스 시 저장해둔 터치 좌표를 사용
      x = touchCoords.current.x;
      y = touchCoords.current.y;
    }
     
     if (x + menuWidth > screenWidth) {
      x = screenWidth - menuWidth - margin;
    }
    setMenuStyle({ top: `${y}px`, left: `${x}px` });
    setOpenMenuId(project.id);
  };

  // ✨ [수정] 항목 클릭/탭 핸들러
  const handleItemClick = (e) => {
    if (isSelectionMode) {
      e.preventDefault();
      onProjectSelect(project.id);
    } else {
      // ✨ 롱 프레스 후 손가락을 뗄 때 링크 이동을 막음
      if (isLongPress.current) {
        e.preventDefault();
        isLongPress.current = false; // 플래그 초기화
        return;
      }
      onCloseMobileSidebar();
    }
  };

  // ✨ [2/3] 롱 프레스를 감지하는 터치 이벤트 핸들러 추가
  const handleTouchStart = (e) => {
    if (isSelectionMode) return; // 선택 모드에서는 작동 안 함

    // 터치 시작 위치 저장
    touchCoords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isLongPress.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true; // 롱 프레스로 판정
      showMenu(e);
    }, 500); // 500ms (0.5초)
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };
  
  // 스크롤 시 롱 프레스 취소
  const handleTouchMove = () => {
      clearTimeout(longPressTimer.current);
  };

  // ✨ [수정] 꾹 누르기/우클릭 핸들러
  const handleContextMenu = (e) => {
    // 선택 모드가 아닐 때만 보조 메뉴를 띄움
    if (!isSelectionMode) {
      showMenu(e);
    } else {
      e.preventDefault(); // 선택 모드에서는 기본 메뉴 방지
    }
  };

  return (
    <li className={`project-item ${isSelected ? 'selected' : ''}`}>
      {isSelectionMode && (
        <div className="selection-checkbox" onClick={(e) => { e.stopPropagation(); onProjectSelect(project.id); }}>
          {isSelected && <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>}
        </div>
      )}
      <NavLink 
        to={`/project/${project.id}`} 
        onClick={handleItemClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        // 데스크탑 우클릭을 위해 onContextMenu는 유지
        onContextMenu={(e) => {
            touchCoords.current = { x: e.clientX, y: e.clientY };
            showMenu(e);
        }}
      >
        {project.name}
      </NavLink>

      {/* ✨ [수정] 선택 모드가 아닐 때만 케밥 메뉴 버튼 표시 */}
      {!isSelectionMode && (
        <div className="menu-container">
          <button className="kebab-menu-button" onClick={(e) => showMenu(e, true)}>
            <KebabMenuIcon />
          </button>
          {isMenuOpen && (
            <div className="dropdown-menu" ref={menuRef} style={menuStyle}>
              <button onClick={() => { onOpenRenameModal(project.id, project.name); setOpenMenuId(null); }}>
                <EditIcon /> 이름 변경
              </button>
              <button onClick={() => { /* 기능은 추후 추가 */ setOpenMenuId(null); }}>
                <ArchiveIcon /> 보관
              </button>
              <button onClick={() => { onDeleteProject(project.id); setOpenMenuId(null); }}>
                <DeleteIcon /> 삭제
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}


function Sidebar({ projects, onOpenRenameModal, onDeleteProject, isCollapsed, onToggle, onOpenCreateProjectModal, onCloseMobileSidebar, isSelectionMode, selectedProjects, onToggleSelectionMode, onProjectSelect, onBulkDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.menu-container') && !e.target.closest('.dropdown-menu')) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [openMenuId]);

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header desktop-header">
            <button onClick={onToggle} className="menu-toggle-button">
                <SidebarToggleIcon isCollapsed={isCollapsed} />
            </button>
        </div>
        <div className="sidebar-header mobile-header">
            <h1 className="mobile-sidebar-title">Go Dutch</h1>
            <button onClick={onCloseMobileSidebar} className="menu-toggle-button">
                <CloseIcon />
            </button>
        </div>
        <div className="sidebar-content">
            <div className="new-project-section">
                <button className="new-project-button" onClick={onOpenCreateProjectModal}>
                    <NewChatIcon />
                    {!isCollapsed && <span className="new-project-text">새로운 정산</span>}
                </button>
            </div>
            <nav className="project-nav">
                <div className="project-nav-header">
                {!isCollapsed && <span>최근 항목</span>}
                  <button className="selection-mode-button" onClick={onToggleSelectionMode}>
                    {isSelectionMode ? '완료' : '선택'}
                  </button>
                </div>
                <ul>
                    {(Array.isArray(projects) ? projects : Object.values(projects || {})).map(project => (
                        <ProjectItem
                            key={project.id}
                            project={project}
                            onOpenRenameModal={onOpenRenameModal}
                            onDeleteProject={onDeleteProject}
                            onCloseMobileSidebar={onCloseMobileSidebar}
                            isMenuOpen={openMenuId === project.id}
                            setOpenMenuId={setOpenMenuId}
                            isSelectionMode={isSelectionMode}
                            selectedProjects={selectedProjects}
                            onProjectSelect={onProjectSelect}
                        />
                    ))}
                </ul>
            </nav>
        </div>

        {selectedProjects.size > 0 && (
          <div className="selection-action-bar">
            <span className="selection-count">{selectedProjects.size}개 선택됨</span>
            <div className="selection-actions">
              <button className="action-button-delete" onClick={onBulkDelete}>삭제</button>
              <button className="action-button-archive">보관</button>
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <Link to="#" className="footer-link" onClick={onCloseMobileSidebar}>
            <SettingsIcon />
            {!isCollapsed && <span className="footer-text">설정</span>}
          </Link>
        </div>
    </div>
  );
}

export default Sidebar;