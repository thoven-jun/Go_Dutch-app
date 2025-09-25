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

function ProjectItem({ project, onOpenRenameModal, onDeleteProject, onCloseMobileSidebar, isMenuOpen, setOpenMenuId }) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  const showMenu = (e, isKebabClick = false) => {
     e.preventDefault();
     e.stopPropagation();
     
     const menuWidth = 140;
     const screenWidth = window.innerWidth;
     const margin = 16;

     let x, y;

     if (isKebabClick) {
        const rect = e.currentTarget.getBoundingClientRect();
        x = rect.left;
        y = rect.bottom;
     } else {
        const touch = e.touches ? e.touches[0] : null;
        x = touch ? touch.clientX : e.clientX;
        y = touch ? touch.clientY : e.clientY;
     }
     
     if (x + menuWidth > screenWidth) {
        x = screenWidth - menuWidth - margin;
     }

     setMenuStyle({
        top: `${y}px`,
        left: `${x}px`,
     });
     
     setOpenMenuId(isMenuOpen ? null : project.id);
  }

  return (
    // ✨ [수정] li 태그에서 이벤트 핸들러 제거
    <li className="project-item">
      {/* ✨ [수정] onContextMenu 이벤트를 a 태그로 다시 이동 */}
      <NavLink 
        to={`/project/${project.id}`} 
        onClick={onCloseMobileSidebar}
        onContextMenu={showMenu}
      >
        {project.name}
      </NavLink>
      <div className="menu-container">
        <button className="kebab-menu-button" onClick={(e) => showMenu(e, true)}>
          <KebabMenuIcon />
        </button>
        {isMenuOpen && (
          <div className="dropdown-menu" ref={menuRef} style={menuStyle}>
            <button onClick={() => { onOpenRenameModal(project.id, project.name); setOpenMenuId(null); }}>
              <EditIcon /> 이름 변경
            </button>
            <button onClick={() => { onDeleteProject(project.id); setOpenMenuId(null); }}>
              <DeleteIcon /> 삭제
            </button>
          </div>
        )}
      </div>
    </li>
  );
}


function Sidebar({ projects, onOpenRenameModal, onDeleteProject, isCollapsed, onToggle, onOpenCreateProjectModal, onCloseMobileSidebar }) {
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
                {!isCollapsed && <div className="project-nav-header">최근 항목</div>}
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
                        />
                    ))}
                </ul>
            </nav>
        </div>
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