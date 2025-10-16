//* src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Welcome from './Welcome';
import ProjectDetailView from './ProjectDetailView';
import SettlementResultView from './SettlementResultView';
import RenameModal from './RenameModal';
import DuplicateNameModal from './DuplicateNameModal';
import CustomAlertModal from './CustomAlertModal';
import AddExpenseModal from './AddExpenseModal';
import EditExpenseModal from './EditExpenseModal';
import CreateProjectModal from './CreateProjectModal';
import ParticipantManager from './ParticipantManager';
import ProjectSettings from './ProjectSettings';
import Settings from './Settings';
import ParticipantOrderModal from './ParticipantOrderModal';
import DestructiveActionModal from './DestructiveActionModal';
import SelectiveImportModal from './SelectiveImportModal';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import './App.css';
import './Modals.css';
import './Header.css';

const MenuIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> );

function ProjectDetailWrapper({ projects, onUpdate, onOpenRenameModal, onOpenDuplicateModal, showAlert, closeAlert, openAddExpenseModal, openEditExpenseModal, apiBaseUrl, participantListStates, onToggleParticipants, authorizedFetch }) {
  const { projectId } = useParams();
  const list = Array.isArray(projects) ? projects : Object.values(projects || {});
  const project = list.find(p => p.id === parseInt(projectId));

  if (!project) {
    return <div>프로젝트를 로딩 중이거나, 유효하지 않은 프로젝트입니다.</div>;
  }
  const isExpanded = participantListStates[projectId] === true;

  return <ProjectDetailView
    project={project}
    onUpdate={onUpdate}
    onOpenRenameModal={onOpenRenameModal}
    onOpenDuplicateModal={onOpenDuplicateModal}
    showAlert={showAlert}
    closeAlert={closeAlert}
    openAddExpenseModal={openAddExpenseModal}
    openEditExpenseModal={openEditExpenseModal}
    apiBaseUrl={apiBaseUrl}
    isParticipantsExpanded={isExpanded}
    onToggleParticipants={() => onToggleParticipants(projectId)}
    authorizedFetch={authorizedFetch}
  />;
}

function ProjectSettingsWrapper({ projects, onUpdate, showAlert, onOpenDuplicateModal, apiBaseUrl, onOpenOrderModal, closeAlert, openDestructiveModal, closeDestructiveModal, authorizedFetch }) {
  return <ProjectSettings
    projects={projects}
    onUpdate={onUpdate}
    showAlert={showAlert}
    openDestructiveModal={openDestructiveModal}
    closeDestructiveModal={closeDestructiveModal}
    onOpenDuplicateModal={onOpenDuplicateModal}
    apiBaseUrl={apiBaseUrl}
    onOpenOrderModal={onOpenOrderModal}
    closeAlert={closeAlert}
    authorizedFetch={authorizedFetch}
  />;
}

function ParticipantManagerWrapper({ projects, onUpdate, apiBaseUrl, onOpenOrderModal }) {
    const { projectId } = useParams();
    const project = projects.find(p => p.id === parseInt(projectId));
    return <ParticipantManager
      project={project}
      onUpdate={onUpdate}
      apiBaseUrl={apiBaseUrl}
      onOpenOrderModal={onOpenOrderModal}
    />;
}

function ProtectedRoute({ isLoggedIn, children }) {
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function MainLayout({ onLogout }) {
  const apiBaseUrl = (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}` : 'http://localhost:3001');

  const [projects, setProjects] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [renameModalInfo, setRenameModalInfo] = useState({ isOpen: false, projectId: null, currentName: '' });
  const [duplicateModalInfo, setDuplicateModalInfo] = useState({ isOpen: false, duplicates: [], newName: '', projectId: null, editingParticipantId: null });
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [destructiveModalInfo, setDestructiveModalInfo] = useState({ isOpen: false, title: '', mainContent: '', consequences: [], confirmText: '', onConfirm: null, requiresPassword: false, errorMessage: '' });
  const [addExpenseModalInfo, setAddExpenseModalInfo] = useState({ isOpen: false, project: null });
  const [editExpenseModalInfo, setEditExpenseModalInfo] = useState({ isOpen: false, project: null, expense: null });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [orderModalInfo, setOrderModalInfo] = useState({ isOpen: false, project: null });
  const [importModalInfo, setImportModalInfo] = useState({ isOpen: false, projects: [] });
  const [participantListStates, setParticipantListStates] = useState({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const navigate = useNavigate();

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

  const [userInfo, setUserInfo] = useState(null); // 사용자 정보 state
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 드롭다운 메뉴 state
  const menuRef = useRef(null); // 드롭다운 외부 클릭 감지를 위한 ref
  
  const authorizedFetch = useCallback((url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };
    return fetch(url, { ...options, headers }).then(res => {
      if (res.status === 401) {
        onLogout();
      }
      return res;
    });
  }, [onLogout]);

  const updateUserInfo = useCallback(() => {
    authorizedFetch(`${apiBaseUrl}/auth/me`)
      .then(res => res.json())
      .then(data => setUserInfo(data))
      .catch(error => console.error("Error fetching user info:", error));
  }, [apiBaseUrl, authorizedFetch]);

  const fetchProjectsAndUser = useCallback(() => {
    authorizedFetch(`${apiBaseUrl}/projects`)
      .then(res => res.json())
      .then(data => setProjects(data || []))
      .catch(error => console.error("Error fetching projects:", error));

    authorizedFetch(`${apiBaseUrl}/auth/me`)
      .then(res => res.json())
      .then(data => setUserInfo(data))
      .catch(error => console.error("Error fetching user info:", error));
  }, [apiBaseUrl, authorizedFetch]);

  useEffect(() => {
    fetchProjectsAndUser();
  }, [fetchProjectsAndUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProjects = useCallback(() => {
    authorizedFetch(`${apiBaseUrl}/projects`)
      .then(res => res.json())
      .then(data => setProjects(data || []))
      .catch(error => console.error("Error fetching projects:", error));
  }, [apiBaseUrl, authorizedFetch]);
  
  useEffect(() => {
    fetchProjects();
    updateUserInfo(); // 페이지 로드 시 프로젝트와 사용자 정보를 각각 불러옴
  }, [fetchProjects, updateUserInfo]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleParticipants = (projectId) => {
    setParticipantListStates(prevStates => ({
      ...prevStates,
      [projectId]: prevStates[projectId] === false ? true : false
    }));
  };

  const openOrderModal = (project) => setOrderModalInfo({ isOpen: true, project });
  const closeOrderModal = () => setOrderModalInfo({ isOpen: false, project: null });

  const showAlert = (title, message, onConfirm = null) => {
    setAlertInfo({ isOpen: true, title, message, onConfirm });
  };

  const closeAlert = () => {
    setAlertInfo({ isOpen: false, title: '', message: '', onConfirm: null });
  };

  const openDestructiveModal = ({ title, mainContent, consequences, confirmText, onConfirm, requiresPassword = false, errorMessage = '' }) => {
    setDestructiveModalInfo({ isOpen: true, title, mainContent, consequences, confirmText, onConfirm, requiresPassword, errorMessage });
  };
  
  const closeDestructiveModal = () => {
    setDestructiveModalInfo({ isOpen: false, title: '', mainContent: '', consequences: [], confirmText: '', onConfirm: null, requiresPassword: false, errorMessage: '' });
  };

  const openImportModal = (projectsFromFile) => {
    setImportModalInfo({ isOpen: true, projects: projectsFromFile });
  };
  const closeImportModal = () => {
    setImportModalInfo({ isOpen: false, projects: [] });
  };

  const openAddExpenseModal = (project) => {
    setAddExpenseModalInfo({ isOpen: true, project: project });
  };
  const closeAddExpenseModal = () => {
    setAddExpenseModalInfo({ isOpen: false, project: null });
  };

  const openEditExpenseModal = (project, expense) => setEditExpenseModalInfo({ isOpen: true, project, expense });
  const closeEditExpenseModal = () => setEditExpenseModalInfo({ isOpen: false, project: null, expense: null });

  const openCreateProjectModal = () => setIsCreateProjectModalOpen(true);
  const closeCreateProjectModal = () => setIsCreateProjectModalOpen(false);

  const handleCreateProject = (projectData) => {
    let newProjectResponse;
    authorizedFetch(`${apiBaseUrl}/projects`, {
        method: 'POST',
        body: JSON.stringify(projectData)
    })
    .then(res => res.json())
    .then(newProject => {
        newProjectResponse = newProject;
        const participantNames = projectData.participants;
        if (participantNames && participantNames.length > 0) {
            const addParticipantPromises = participantNames.map(name => {
                return authorizedFetch(`${apiBaseUrl}/projects/${newProject.id}/participants`, {
                    method: 'POST',
                    body: JSON.stringify({ name: name })
                });
            });
            return Promise.all(addParticipantPromises);
        }
        return Promise.resolve();
    })
    .then(() => {
        fetchProjects();
        closeCreateProjectModal();
        navigate(`/project/${newProjectResponse.id}`);
    })
    .catch(error => console.error("Error creating project:", error));
  };

  const handleUpdateProject = (projectId, newName) => {
    authorizedFetch(`${apiBaseUrl}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName })
    }).then(() => {
      fetchProjects();
      setRenameModalInfo({ isOpen: false, projectId: null, currentName: '' });
    });
  };

  const handleDeleteProject = (projectId) => {
    showAlert('프로젝트 삭제', '정말 이 프로젝트를 삭제하시겠습니까?\n관련된 모든 참여자와 지출 내역이 함께 삭제됩니다.', () => {
      authorizedFetch(`${apiBaseUrl}/projects/${projectId}`, {
        method: 'DELETE',
      }).then(res => {
        if (res.ok) {
          navigate('/');
          fetchProjects();
        }
        closeAlert();
      });
    });
  };

  const handleOpenRenameModal = (projectId, currentName) => {
    setRenameModalInfo({ isOpen: true, projectId, currentName });
  };

  const handleOpenDuplicateModal = (duplicates, newName, projectId, editingParticipantId = null) => {
    setDuplicateModalInfo({
      isOpen: true,
      duplicates,
      newName,
      projectId,
      editingParticipantId
    });
  };

  const handleResolveDuplicates = (updatedNames) => {
    const { projectId, duplicates, editingParticipantId } = duplicateModalInfo;

    const updatePromises = duplicates.map(p => {
      const newName = updatedNames[p.id];
      if (p.name !== newName) {
        return authorizedFetch(`${apiBaseUrl}/participants/${p.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: newName }),
        });
      }
      return Promise.resolve();
    });

    let finalPromise;
    if (editingParticipantId) {
      finalPromise = authorizedFetch(`${apiBaseUrl}/participants/${editingParticipantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: updatedNames['new'] }),
      });
    } else {
      finalPromise = authorizedFetch(`${apiBaseUrl}/projects/${projectId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ name: updatedNames['new'] }),
      });
    }

    Promise.all([...updatePromises, finalPromise]).then(() => {
      fetchProjects();
      setDuplicateModalInfo({ isOpen: false, duplicates: [], newName: '', projectId: null, editingParticipantId: null });
    });
  };

  const fullCloseDuplicateModal = () => {
    setDuplicateModalInfo({ isOpen: false, duplicates: [], newName: '', projectId: null, editingParticipantId: null });
  };

  const handleUpdateExpense = (expenseId, updatedData) => {
    authorizedFetch(`${apiBaseUrl}/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedData)
    }).then(res => {
      if (!res.ok) throw new Error("Server response was not ok");
      fetchProjects();
      closeEditExpenseModal();
    }).catch(error => console.error("Failed to update expense:", error));
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProjects(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(projectId)) {
        newSelected.delete(projectId);
      } else {
        newSelected.add(projectId);
      }
      return newSelected;
    });
  };

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedProjects(new Set());
  }, [])

  const handleCloseMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
    if (isSelectionMode) {
      toggleSelectionMode();
    }
  };

  const handleBulkDelete = () => {
    showAlert(
      `${selectedProjects.size}개 항목 삭제`,
      '선택한 모든 프로젝트와 관련 데이터를 영구적으로 삭제하시겠습니까?',
      () => {
        const deletePromises = Array.from(selectedProjects).map(projectId =>
          authorizedFetch(`${apiBaseUrl}/projects/${projectId}`, { method: 'DELETE' })
        );

        Promise.all(deletePromises)
          .then(() => {
            fetchProjects();
            toggleSelectionMode();
            navigate('/');
            closeAlert();
          })
          .catch(err => {
            console.error('Failed to delete projects:', err);
            closeAlert();
          });
      }
    );
  };

  useEffect(() => {
    if (isSidebarCollapsed && isSelectionMode) {
      toggleSelectionMode();
    }
  }, [isSidebarCollapsed, isSelectionMode, toggleSelectionMode]);

  return (
    <>
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <Sidebar
          projects={projects}
          onOpenRenameModal={handleOpenRenameModal}
          onDeleteProject={handleDeleteProject}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenCreateProjectModal={openCreateProjectModal}
          onCloseMobileSidebar={handleCloseMobileSidebar}
          isSelectionMode={isSelectionMode}
          selectedProjects={selectedProjects}
          onToggleSelectionMode={toggleSelectionMode}
          onProjectSelect={handleProjectSelect}
          onBulkDelete={handleBulkDelete}
          onLogout={onLogout}
        />

        <main className="main-content">
          <header className="main-header">
            <div className="header-left">
              <button className="hamburger-menu" onClick={() => setIsMobileSidebarOpen(true)}>
                <MenuIcon />
              </button>
              <Link to="/" className="main-logo-link">
                  <h1>Go Dutch</h1>
              </Link>
            </div>
            <div className="header-right" ref={menuRef}>
              {userInfo && (
                <button className="account-thumbnail" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {userInfo.name.charAt(0)}
                </button>
              )}
              {isMenuOpen && (
                <div className="header-dropdown-menu">
                  <div className="user-info">
                    <strong>{userInfo.name}</strong>
                    <span>{userInfo.email}</span>
                  </div>
                  <hr/>
                  <Link to="/settings" onClick={() => setIsMenuOpen(false)}>계정 관리</Link>
                  <button onClick={() => { onLogout(); setIsMenuOpen(false); }}>로그아웃</button>
                </div>
              )}
            </div>
          </header>
          <div className="content-area">
              <Routes>
                  <Route path="/" element={<Welcome />} />
                  <Route
                    path="/project/:projectId"
                    element={<ProjectDetailWrapper
                      projects={projects}
                      onUpdate={fetchProjects}
                      onOpenRenameModal={handleOpenRenameModal}
                      onOpenDuplicateModal={handleOpenDuplicateModal}
                      showAlert={showAlert}
                      closeAlert={closeAlert}
                      openAddExpenseModal={openAddExpenseModal}
                      openEditExpenseModal={openEditExpenseModal}
                      participantListStates={participantListStates}
                      onToggleParticipants={handleToggleParticipants}
                      apiBaseUrl={apiBaseUrl}
                      authorizedFetch={authorizedFetch}
                    />}
                  />
                  <Route
                    path="/project/:projectId/participants"
                    element={<ParticipantManagerWrapper
                      projects={projects}
                      onUpdate={fetchProjects}
                      apiBaseUrl={apiBaseUrl}
                      onOpenOrderModal={openOrderModal}
                    />}
                  />
                  <Route
                    path="/project/:projectId/settings"
                    element={<ProjectSettingsWrapper
                      projects={projects}
                      onUpdate={fetchProjects}
                      showAlert={showAlert}
                      onOpenDuplicateModal={handleOpenDuplicateModal}
                      apiBaseUrl={apiBaseUrl}
                      onOpenOrderModal={openOrderModal}
                      closeAlert={closeAlert}
                      openDestructiveModal={openDestructiveModal}
                      closeDestructiveModal={closeDestructiveModal}
                      authorizedFetch={authorizedFetch}
                    />}
                  />
                  <Route 
                    path="/settings" 
                    element={<Settings 
                                apiBaseUrl={apiBaseUrl} 
                                showAlert={showAlert}
                                onUpdate={fetchProjects}
                                openDestructiveModal={openDestructiveModal}
                                closeDestructiveModal={closeDestructiveModal}
                                openImportModal={openImportModal}
                                authorizedFetch={authorizedFetch}
                                onUserUpdate={updateUserInfo}
                                onLogout={onLogout} // onLogout prop 전달
                             />} 
                  />
                  <Route
                    path="/project/:projectId/settlement"
                    element={<SettlementResultView apiBaseUrl={apiBaseUrl} authorizedFetch={authorizedFetch} />}
                  />
                </Routes>
          </div>
        </main>
      </div>

      <RenameModal
        isOpen={renameModalInfo.isOpen}
        onClose={() => setRenameModalInfo({ isOpen: false })}
        onRename={(newName) => handleUpdateProject(renameModalInfo.projectId, newName)}
        currentName={renameModalInfo.currentName}
      />
      <DuplicateNameModal
        isOpen={duplicateModalInfo.isOpen}
        onClose={fullCloseDuplicateModal}
        onSave={handleResolveDuplicates}
        duplicates={duplicateModalInfo.duplicates}
        newName={duplicateModalInfo.newName}
        editingParticipantId={duplicateModalInfo.editingParticipantId}
      />
      <CustomAlertModal
        isOpen={alertInfo.isOpen}
        onClose={closeAlert}
        title={alertInfo.title}
        message={alertInfo.message}
        onConfirm={alertInfo.onConfirm}
      />
      <AddExpenseModal
        isOpen={addExpenseModalInfo.isOpen}
        onClose={closeAddExpenseModal}
        project={addExpenseModalInfo.project}
        onUpdate={fetchProjects}
        apiBaseUrl={apiBaseUrl}
        authorizedFetch={authorizedFetch}
      />
      <EditExpenseModal
        isOpen={editExpenseModalInfo.isOpen}
        onClose={closeEditExpenseModal}
        project={editExpenseModalInfo.project}
        expense={editExpenseModalInfo.expense}
        onSave={handleUpdateExpense}
        apiBaseUrl={apiBaseUrl}
      />
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={closeCreateProjectModal}
        onCreateProject={handleCreateProject}
      />
      <ParticipantOrderModal
        isOpen={orderModalInfo.isOpen}
        onClose={closeOrderModal}
        project={orderModalInfo.project}
        onSave={fetchProjects}
        apiBaseUrl={apiBaseUrl}
        authorizedFetch={authorizedFetch}
      />
      <SelectiveImportModal 
        isOpen={importModalInfo.isOpen}
        onClose={closeImportModal}
        projects={importModalInfo.projects}
        onConfirmImport={(projectsToImport) => {
          authorizedFetch(`${apiBaseUrl}/import/selective`, {
            method: 'POST',
            body: JSON.stringify(projectsToImport)
          })
          .then(res => {
            if (!res.ok) throw new Error('데이터 가져오기 실패');
            return res.json();
          })
          .then(() => {
            fetchProjects();
            closeImportModal();
            showAlert('가져오기 성공', '선택한 프로젝트를 성공적으로 가져왔습니다.');
          })
          .catch(err => {
            console.error(err);
            showAlert('오류', '데이터를 가져오는 중 오류가 발생했습니다.');
          });
        }}
      />
      <DestructiveActionModal
        isOpen={destructiveModalInfo.isOpen}
        onClose={closeDestructiveModal}
        onConfirm={destructiveModalInfo.onConfirm}
        title={destructiveModalInfo.title}
        mainContent={destructiveModalInfo.mainContent}
        consequences={destructiveModalInfo.consequences}
        confirmText={destructiveModalInfo.confirmText}
        requiresPassword={destructiveModalInfo.requiresPassword}
        errorMessage={destructiveModalInfo.errorMessage}
      />
    </>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));
  const apiBaseUrl = (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}` : 'http://localhost:3001');

  const handleLoginSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
  };
  
  return (
    <Routes>
      <Route path="/login" element={<Login apiBaseUrl={apiBaseUrl} onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/register" element={<Register apiBaseUrl={apiBaseUrl} />} />
      <Route path="/verify-email" element={<VerifyEmail apiBaseUrl={apiBaseUrl} onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/*" element={
        <ProtectedRoute isLoggedIn={isLoggedIn}>
          <MainLayout onLogout={handleLogout} />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;