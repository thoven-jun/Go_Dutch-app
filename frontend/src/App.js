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
import './App.css';

// ProjectDetailView Wrapper
function ProjectDetailWrapper({ projects, onUpdate, onOpenDuplicateModal, showAlert, closeAlert, openAddExpenseModal, isParticipantsExpanded, onToggleParticipants, openEditExpenseModal, apiBaseUrl }) {
  const { projectId } = useParams();
  const list = Array.isArray(projects) ? projects : Object.values(projects || {});
  const project = list.find(p => p.id === parseInt(projectId));
  
  return <ProjectDetailView 
    project={project} 
    onUpdate={onUpdate}
    onOpenDuplicateModal={onOpenDuplicateModal} 
    showAlert={showAlert}
    closeAlert={closeAlert}
    openAddExpenseModal={openAddExpenseModal}
    isParticipantsExpanded={isParticipantsExpanded}
    onToggleParticipants={onToggleParticipants}
    openEditExpenseModal={openEditExpenseModal}
    apiBaseUrl={apiBaseUrl}
  />;
}

// ParticipantManager Wrapper
function ParticipantManagerWrapper({ projects, onUpdate, showAlert, onOpenDuplicateModal, closeAlert }) {
  return <ParticipantManager 
    projects={projects} 
    onUpdate={onUpdate} 
    showAlert={showAlert} 
    onOpenDuplicateModal={onOpenDuplicateModal} 
    closeAlert={closeAlert} 
  />;
}

function AppContent() {
  const API_BASE_URL = (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}` : 'http://localhost:3001');

  const [projects, setProjects] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [renameModalInfo, setRenameModalInfo] = useState({ isOpen: false, projectId: null, currentName: '' });
  
  const [duplicateModalInfo, setDuplicateModalInfo] = useState({ 
    isOpen: false, 
    duplicates: [], 
    newName: '', 
    projectId: null, 
    editingParticipantId: null 
  });
  
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [addExpenseModalInfo, setAddExpenseModalInfo] = useState({ isOpen: false, project: null });
  const [editExpenseModalInfo, setEditExpenseModalInfo] = useState({ isOpen: false, project: null, expense: null });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(true);
  const toggleParticipantsList = () => setIsParticipantsExpanded(prev => !prev);

  const navigate = useNavigate();

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
    fetch(`${API_BASE_URL}/projects`)
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(error => console.error("Error fetching projects:", error));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = (projectName, participantNames) => {
    let newProjectData;
    fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, participants: [], expenses: [] })
    })
    .then(res => res.json())
    .then(newProject => {
      newProjectData = newProject;
      if (participantNames && participantNames.length > 0) {
        const addParticipantPromises = participantNames.map(name => {
          return fetch(`${API_BASE_URL}/projects/${newProject.id}/participants`, {
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
    fetch(`${API_BASE_URL}/projects/${projectId}`, {
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
      fetch(`${API_BASE_URL}/projects/${projectId}`, {
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
        return fetch(`${API_BASE_URL}/participants/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });
      }
      return Promise.resolve();
    });

    let finalPromise;
    if (editingParticipantId) {
      finalPromise = fetch(`${API_BASE_URL}/participants/${editingParticipantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedNames['new'] }),
      });
    } else {
      finalPromise = fetch(`${API_BASE_URL}/projects/${projectId}/participants`, {
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


  // 1. 지출 항목 업데이트를 처리하는 함수입니다.
  // 이 함수는 서버에 수정된 데이터를 보내고, 성공하면 전체 프로젝트 목록을 다시 불러온 뒤 모달을 닫습니다.
  const handleUpdateExpense = (expenseId, updatedData, apiBaseUrl) => {
    fetch(`${apiBaseUrl}/expenses/${expenseId}`, { // ✨ 수정
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    }).then(res => {
      if (!res.ok) throw new Error("Server response was not ok");
      fetchProjects(); // 2. 데이터 업데이트 후 목록 새로고침
      closeEditExpenseModal(); // 3. 수정 모달 닫기
    }).catch(error => console.error("Failed to update expense:", error));
  };

  return (
    <>
      <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          projects={projects}
          onAddProject={handleCreateProject}
          onOpenRenameModal={handleOpenRenameModal}
          onDeleteProject={handleDeleteProject}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenCreateProjectModal={openCreateProjectModal}
        />
        
        <main className="main-content">
          <header className="main-header"><h1>Go Dutch</h1></header>
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
                      isParticipantsExpanded={isParticipantsExpanded}
                      onToggleParticipants={toggleParticipantsList}
                      openEditExpenseModal={openEditExpenseModal}
                      apiBaseUrl={API_BASE_URL}
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
                      apiBaseUrl={API_BASE_URL} // ✨ 추가
                    />}
                  />
                  <Route 
                    path="/project/:projectId/settlement" 
                    element={<SettlementResultView apiBaseUrl={API_BASE_URL} />} // ✨ 추가
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
        apiBaseUrl={API_BASE_URL}
      />
      
      {/* 4. 'onSave' prop에 위에서 정의한 'handleUpdateExpense' 함수를 정확히 연결합니다. */}
      {/* 이 부분이 '저장' 버튼 기능의 핵심입니다. */}
      <EditExpenseModal
        isOpen={editExpenseModalInfo.isOpen}
        onClose={closeEditExpenseModal}
        project={editExpenseModalInfo.project}
        expense={editExpenseModalInfo.expense}
        onSave={(...args) => handleUpdateExpense(...args, API_BASE_URL)}
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={closeCreateProjectModal}
        onCreateProject={handleCreateProject}
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