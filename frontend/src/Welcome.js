import React from 'react';
import './Welcome.css';

function Welcome() {
  return (
    <div className="welcome-container">
      <h1>Go Dutch에 오신 것을 환영합니다!</h1>
      <p>왼쪽 사이드바에서 프로젝트를 선택하거나, 새 프로젝트를 추가하여 정산을 시작해보세요!</p>
    </div>
  );
}

export default Welcome;