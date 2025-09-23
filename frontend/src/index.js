// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';
// import './RenameModal.css'; // 삭제
// import './DuplicateNameModal.css'; // 삭제
// import './CustomAlertModal.css'; // 삭제
// import './AddExpenseModal.css'; // 삭제
import './Modals.css'; // <-- 이 파일 하나만 추가
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);