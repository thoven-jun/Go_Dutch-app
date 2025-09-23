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

function ProjectItem({ project, onOpenRenameModal, onDeleteProject }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef, buttonRef]);

  const handleMenuToggle = () => {
    if (!isMenuOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({
          top: `${rect.top}px`,
          left: `${rect.right + 8}px`,
        });
      }
    }
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <li className="project-item">
      <NavLink to={`/project/${project.id}`}>{project.name}</NavLink>
      <div className="menu-container">
        <button className="kebab-menu-button" ref={buttonRef} onClick={handleMenuToggle}>
          <KebabMenuIcon />
        </button>
        {isMenuOpen && (
          <div className="dropdown-menu" ref={menuRef} style={menuStyle}>
            <button onClick={() => { onOpenRenameModal(project.id, project.name); setIsMenuOpen(false); }}>
              <EditIcon /> 이름 변경
            </button>
            <button onClick={() => { onDeleteProject(project.id); setIsMenuOpen(false); }}>
              <DeleteIcon /> 삭제
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function Sidebar({ projects, onAddProject, onOpenRenameModal, onDeleteProject, isCollapsed, onToggle, onOpenCreateProjectModal }) {
  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
            <button onClick={onToggle} className="menu-toggle-button">
                <SidebarToggleIcon isCollapsed={isCollapsed} />
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
                        />
                    ))}
                </ul>
            </nav>
        </div>
        <div className="sidebar-footer">
            <Link to="#" className="footer-link">
                <SettingsIcon />
                {!isCollapsed && <span className="footer-text">설정</span>}
            </Link>
        </div>
    </div>
  );
}

export default Sidebar;