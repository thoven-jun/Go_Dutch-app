import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import './Sidebar.css';

// --- 아이콘 SVG들 ---
const KebabMenuIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg> );
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> );
const DeleteIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const NewChatIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"></path></svg> );
const SettingsIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> );
const FooterSettingsIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> );
const SidebarToggleIcon = ({ isCollapsed }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1={isCollapsed ? "8" : "3"} y1={isCollapsed ? "12" : "12"} x2={isCollapsed ? "16" : "12"} y2={isCollapsed ? "12" : "12"} /></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );
const ArchiveIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg> );

const projectTypeMap = {
  travel: '여행',
  gathering: '회식/모임'
};

function ProjectItem({ project, onOpenRenameModal, onDeleteProject, onCloseMobileSidebar, isMenuOpen, setOpenMenuId, isSelectionMode, selectedProjects, onProjectSelect }) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  const isSelected = selectedProjects.has(project.id);
  const navigate = useNavigate();

  const toggleMenu = (e) => {
     e.preventDefault();
     e.stopPropagation();
     if (isMenuOpen) {
        setOpenMenuId(null);
        return;
     }
     const rect = e.currentTarget.getBoundingClientRect();
     const menuWidth = 140;
     const screenWidth = window.innerWidth;
     const margin = 16;
     let x = rect.left;
     let y = rect.bottom;
     if (x + menuWidth > screenWidth) {
        x = screenWidth - menuWidth - margin;
     }
     setMenuStyle({ top: `${y}px`, left: `${x}px` });
     setOpenMenuId(project.id);
  }

  const handleItemClick = (e) => {
    if (isSelectionMode) {
      e.preventDefault();
      onProjectSelect(project.id);
    } else {
      onCloseMobileSidebar();
    }
  };

  return (
    <li className={`project-item ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selection-mode-active' : ''}`}>    
      <div className="selection-checkbox" onClick={(e) => { e.stopPropagation(); onProjectSelect(project.id); }}>
        {isSelected && <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>}
      </div>
      
      <NavLink to={`/project/${project.id}`} onClick={handleItemClick}>
        <span className="project-name-text">{project.name}</span>
        {project.type && project.type !== 'general' && (
          <span className="project-type-badge-sidebar">{projectTypeMap[project.type]}</span>
        )}
      </NavLink>

      {!isSelectionMode && (
        <div className="menu-container">
          <button className="kebab-menu-button" onClick={toggleMenu}>
            <KebabMenuIcon />
          </button>
          {isMenuOpen && (
            <div className="dropdown-menu" ref={menuRef} style={menuStyle}>
              <button onClick={() => { onOpenRenameModal(project.id, project.name); setOpenMenuId(null); }}>
                <EditIcon /> 이름 변경
              </button>
              <button onClick={() => { navigate(`/project/${project.id}/settings`); setOpenMenuId(null); }}>
                <SettingsIcon /> 설정
              </button>
              <button onClick={() => { setOpenMenuId(null); }}>
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
          <Link to="/settings" className="footer-link" onClick={onCloseMobileSidebar}>
            <FooterSettingsIcon />
            {!isCollapsed && <span className="footer-text">설정</span>}
          </Link>
        </div>
    </div>
  );
}

export default Sidebar;