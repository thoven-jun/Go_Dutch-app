import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
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
import ParticipantOrderModal from './ParticipantOrderModal';
import './App.css';

const MenuIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> );

// ProjectDetailView Wrapper 수정
function ProjectDetailWrapper({ projects, onUpdate, onOpenDuplicateModal, showAlert, closeAlert, openAddExpenseModal, openEditExpenseModal, apiBaseUrl, participantListStates, onToggleParticipants }) {
  const { projectId } = useParams();
  const list = Array.isArray(projects) ? projects : Object.values(projects || {});
  const project = list.find(p => p.id === parseInt(projectId));
  
  if (!project) {
    return <div>프로젝트를 로딩 중이거나, 유효하지 않은 프로젝트입니다.</div>;
  }

  // ✨ 전달받은 participantListStates를 사용하여 현재 프로젝트의 확장 상태를 결정합니다.
  const isExpanded = participantListStates[projectId] !== false;

  return <ProjectDetailView 
    project={project} 
    onUpdate={onUpdate}
    onOpenDuplicateModal={onOpenDuplicateModal} 
    showAlert={showAlert}
    closeAlert={closeAlert}
    openAddExpenseModal={openAddExpenseModal}
    openEditExpenseModal={openEditExpenseModal}
    apiBaseUrl={apiBaseUrl}
    // ✨ 계산된 상태와, projectId가 적용된 핸들러를 전달합니다.
    isParticipantsExpanded={isExpanded} 
    onToggleParticipants={() => onToggleParticipants(projectId)}
  />;
}

// ParticipantManager Wrapper (기존과 동일)
function ParticipantManagerWrapper({ projects, onUpdate, showAlert, onOpenDuplicateModal, closeAlert, apiBaseUrl, onOpenOrderModal }) {
  return <ParticipantManager 
    projects={projects} 
    onUpdate={onUpdate} 
    showAlert={showAlert} 
    onOpenDuplicateModal={onOpenDuplicateModal} 
    closeAlert={closeAlert} 
    apiBaseUrl={apiBaseUrl}
    onOpenOrderModal={onOpenOrderModal}
  />;
}

function AppContent() {
  const apiBaseUrl = (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}` : 'http://localhost:3001');

  const [projects, setProjects] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [renameModalInfo, setRenameModalInfo] = useState({ isOpen: false, projectId: null, currentName: '' });
  const [duplicateModalInfo, setDuplicateModalInfo] = useState({ isOpen: false, duplicates: [], newName: '', projectId: null, editingParticipantId: null });
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [addExpenseModalInfo, setAddExpenseModalInfo] = useState({ isOpen: false, project: null });
  const [editExpenseModalInfo, setEditExpenseModalInfo] = useState({ isOpen: false, project: null, expense: null });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [orderModalInfo, setOrderModalInfo] = useState({ isOpen: false, project: null });
  const [participantListStates, setParticipantListStates] = useState({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState(new Set());

  const navigate = useNavigate();

  const handleToggleParticipants = (projectId) => {
    setParticipantListStates(prevStates => ({
      ...prevStates,
      [projectId]: prevStates[projectId] === false ? true : false
    }));
  };

  const openOrderModal = (project) => setOrderModalInfo({ isOpen: true, project });
  const closeOrderModal = () => setOrderModalInfo({ isOpen: false, project: null });

  // ... (showAlert, closeAlert, Modal 핸들러, fetchProjects 등 다른 함수들은 기존과 동일)
  const showAlert = (title, message, onConfirm = null) => {
    setAlertInfo({ isOpen: true, title, message, onConfirm });
  };
  
  const closeAlert = () => {
    setAlertInfo({ isOpen: false, title: '', message: '', onConfirm: null });
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

  const fetchProjects = useCallback(() => {
    fetch(`${apiBaseUrl}/projects`)
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(error => console.error("Error fetching projects:", error));
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = (projectName, participantNames) => {
    let newProjectData;
    fetch(`${apiBaseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, participants: [], expenses: [] })
    })
    .then(res => res.json())
    .then(newProject => {
      newProjectData = newProject;
      if (participantNames && participantNames.length > 0) {
        const addParticipantPromises = participantNames.map(name => {
          return fetch(`${apiBaseUrl}/projects/${newProject.id}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      navigate(`/project/${newProjectData.id}`);
    })
    .catch(error => console.error("Error creating project:", error));
  };

  const handleUpdateProject = (projectId, newName) => {
    fetch(`${apiBaseUrl}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    }).then(() => {
      fetchProjects();
      setRenameModalInfo({ isOpen: false, projectId: null, currentName: '' });
    });
  };

  const handleDeleteProject = (projectId) => {
    showAlert('프로젝트 삭제', '정말 이 프로젝트를 삭제하시겠습니까?\n관련된 모든 참여자와 지출 내역이 함께 삭제됩니다.', () => {
      fetch(`${apiBaseUrl}/projects/${projectId}`, {
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
        return fetch(`${apiBaseUrl}/participants/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });
      }
      return Promise.resolve();
    });

    let finalPromise;
    if (editingParticipantId) {
      finalPromise = fetch(`${apiBaseUrl}/participants/${editingParticipantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedNames['new'] }),
      });
    } else {
      finalPromise = fetch(`${apiBaseUrl}/projects/${projectId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleUpdateExpense = (expenseId, updatedData, apiBaseUrl) => {
    fetch(`${apiBaseUrl}/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    }).then(res => {
      if (!res.ok) throw new Error("Server response was not ok");
      fetchProjects();
      closeEditExpenseModal();
    }).catch(error => console.error("Failed to update expense:", error));
  };

  // ✨ [2/4] 선택된 프로젝트를 토글하는 핸들러
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

  // ✨ [3/4] 선택 모드를 활성화/비활성화하고 선택 목록을 초기화하는 함수
  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev);
    setSelectedProjects(new Set()); // 모드를 바꿀 때 선택 상태 초기화
  };

  // ✨ [4/4] 선택된 프로젝트들을 일괄 삭제하는 함수
  const handleBulkDelete = () => {
    showAlert(
      `${selectedProjects.size}개 항목 삭제`,
      '선택한 모든 프로젝트와 관련 데이터를 영구적으로 삭제하시겠습니까?',
      () => {
        const deletePromises = Array.from(selectedProjects).map(projectId =>
          fetch(`${apiBaseUrl}/projects/${projectId}`, { method: 'DELETE' })
        );

        Promise.all(deletePromises)
          .then(() => {
            fetchProjects();
            toggleSelectionMode(); // 삭제 후 선택 모드 종료
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

  return (
    <>
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
        <Sidebar
          projects={projects}
          onAddProject={handleCreateProject}
          onOpenRenameModal={handleOpenRenameModal}
          onDeleteProject={handleDeleteProject}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenCreateProjectModal={openCreateProjectModal}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          isSelectionMode={isSelectionMode}
          selectedProjects={selectedProjects}
          onToggleSelectionMode={toggleSelectionMode}
          onProjectSelect={handleProjectSelect}
          onBulkDelete={handleBulkDelete}
        />
        
        <main className="main-content">
          <header className="main-header">
            {/* ✨ [추가] 모바일에서만 보이는 햄버거 메뉴 버튼 */}
            <button className="hamburger-menu" onClick={() => setIsMobileSidebarOpen(true)}>
              <MenuIcon />
            </button>
            <h1>Go Dutch</h1>
          </header>
          <div className="content-area">
              <Routes>
                  <Route path="/" element={<Welcome />} />
                  <Route 
                    path="/project/:projectId" 
                    element={<ProjectDetailWrapper 
                      projects={projects} 
                      onUpdate={fetchProjects} 
                      onOpenDuplicateModal={handleOpenDuplicateModal}
                      showAlert={showAlert} 
                      closeAlert={closeAlert}
                      openAddExpenseModal={openAddExpenseModal}                    
                      openEditExpenseModal={openEditExpenseModal}
                      // ✨ 상태 객체와 핸들러를 props로 전달합니다.
                      participantListStates={participantListStates}
                      onToggleParticipants={handleToggleParticipants}
                      apiBaseUrl={apiBaseUrl}
                    />} 
                  />
                  <Route
                    path="/project/:projectId/participants"
                    element={<ParticipantManagerWrapper
                      projects={projects}
                      onUpdate={fetchProjects}
                      showAlert={showAlert}
                      onOpenDuplicateModal={handleOpenDuplicateModal}
                      closeAlert={closeAlert}
                      apiBaseUrl={apiBaseUrl}
                      onOpenOrderModal={openOrderModal}
                    />}
                  />
                  <Route 
                    path="/project/:projectId/settlement" 
                    element={<SettlementResultView apiBaseUrl={apiBaseUrl} />}
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
      />
      <EditExpenseModal
        isOpen={editExpenseModalInfo.isOpen}
        onClose={closeEditExpenseModal}
        project={editExpenseModalInfo.project}
        expense={editExpenseModalInfo.expense}
        onSave={(...args) => handleUpdateExpense(...args, apiBaseUrl)}
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
      />
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;