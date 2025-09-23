const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const fs = require('fs');

server.use(middlewares);
server.use(jsonServer.bodyParser);

const readDb = () => JSON.parse(fs.readFileSync('db.json', 'UTF-8'));
const writeDb = (data) => fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

// --- 사용자 정의 라우트 ---

server.get('/projects', (req, res) => {
  const db = readDb();
  const categories = db.categories || [];
  
  const projectsWithDetails = db.projects.map(project => ({
    ...project,
    participants: project.participants || [],
    expenses: (project.expenses || []).map(expense => {
      const category = categories.find(c => c.id === expense.category_id);
      return { ...expense, category };
    }),
  }));
  res.jsonp(projectsWithDetails);
});

server.patch('/participants/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const db = readDb();
  let participantFound = false;
  for (const project of db.projects) {
    const participant = project.participants?.find(p => p.id === parseInt(id));
    if (participant) {
      participant.name = name;
      participantFound = true;
      break;
    }
  }
  if (participantFound) {
    writeDb(db);
    res.status(200).jsonp(req.body);
  } else {
    res.status(404).jsonp({ error: "Participant not found" });
  }
});

// 2. 특정 프로젝트에 참여자 추가 (POST /projects/:projectId/participants)
server.post('/projects/:projectId/participants', (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    project.participants = project.participants || [];
    const allParticipantIds = db.projects.flatMap(p => p.participants || []).map(pt => pt.id);
    const allProjectIds = db.projects.map(p => p.id);
    const maxId = Math.max(0, ...allParticipantIds, ...allProjectIds);
    
    const newParticipant = { id: maxId + 1, name: name };
    project.participants.push(newParticipant);
    writeDb(db);
    res.status(201).jsonp(newParticipant);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

server.post('/projects/:projectId/expenses', (req, res) => {
  const { projectId } = req.params;
  const newExpenseData = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    project.expenses = project.expenses || [];
    const allIds = [
      ...db.projects.map(p => p.id),
      ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
      ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
    ].filter(id => id != null);
    const maxId = Math.max(0, ...allIds);
    const expenseWithId = {
      ...newExpenseData,
      id: maxId + 1
    };
    project.expenses.push(expenseWithId);
    writeDb(db);
    res.status(201).jsonp(expenseWithId);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});


// 4. 정산 결과 계산 (GET /projects/:projectId/settlement)
server.get('/projects/:projectId/settlement', (req, res) => {
    const { projectId } = req.params;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));
    if (!project) return res.status(404).jsonp({ error: 'Project not found' });
    const participants = project.participants || [];
    const expenses = project.expenses || [];
    if (participants.length === 0) {
        return res.json({ totalAmount: 0, participantCount: 0, perPersonAmount: 0, transfers: [] });
    }
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalOwedBy = {};
    participants.forEach(p => { totalOwedBy[p.id] = 0; });
    expenses.forEach(expense => {
        const splitMethod = expense.split_method || 'equally';
        const amount = expense.amount;
        const details = expense.split_details || {};
        const involvedParticipants = splitMethod === 'equally' ? participants : participants.filter(p => details[p.id] && Number(details[p.id]) > 0);
        if (involvedParticipants.length === 0 && splitMethod === 'equally') {} 
        else if (splitMethod === 'equally') {
            const perPerson = amount / involvedParticipants.length;
            involvedParticipants.forEach(p => { totalOwedBy[p.id] += perPerson; });
        } else if (splitMethod === 'amount') {
            involvedParticipants.forEach(p => { totalOwedBy[p.id] += Number(details[p.id] || 0); });
        } else if (splitMethod === 'percentage') {
            involvedParticipants.forEach(p => {
                const percentage = Number(details[p.id] || 0);
                totalOwedBy[p.id] += amount * (percentage / 100);
            });
        }
    });
    let totalPaidBy = {};
    participants.forEach(p => {
        totalPaidBy[p.id] = expenses.filter(e => e.payer_id === p.id).reduce((sum, e) => sum + e.amount, 0);
    });
    let balances = {};
    participants.forEach(p => { balances[p.name] = totalPaidBy[p.id] - totalOwedBy[p.id]; });
    let creditors = Object.entries(balances).filter(([,b]) => b > 0).sort((a,b) => b[1] - a[1]);
    let debtors = Object.entries(balances).filter(([,b]) => b < 0).sort((a,b) => a[1] - b[1]);
    let transfers = [];
    while (creditors.length > 0 && debtors.length > 0) {
        let creditor = creditors[0];
        let debtor = debtors[0];
        let transferAmount = Math.min(creditor[1], Math.abs(debtor[1]));
        if (transferAmount > 0.01) {
            transfers.push({ from: debtor[0], to: creditor[0], amount: Math.round(transferAmount) });
        }
        creditor[1] -= transferAmount;
        debtor[1] += transferAmount;
        if (Math.abs(creditor[1]) < 0.01) creditors.shift();
        if (Math.abs(debtor[1]) < 0.01) debtors.shift();
    }
    res.json({
        totalAmount,
        participantCount: participants.length,
        perPersonAmount: participants.length > 0 ? Math.round(totalAmount / participants.length) : 0,
        transfers
    });
});

// 5. 특정 참여자 삭제 (DELETE /participants/:id)
server.delete('/participants/:id', (req, res) => {
  const { id } = req.params;
  const participantId = parseInt(id);
  const db = readDb();
  let participantFound = false;

  db.projects.forEach(project => {
    const participantIndex = project.participants?.findIndex(p => p.id === participantId);
    
    if (participantIndex > -1) {
      participantFound = true;
      
      // Payer 여부 확인
      const isPayer = project.expenses?.some(e => e.payer_id === participantId);

      if (isPayer) {
        // Payer일 경우: 관련 지출 내역을 "모두" 삭제
        project.expenses = project.expenses.filter(e => e.payer_id !== participantId);
      }
      
      // Non-Payer일 경우 (또는 Payer였지만 관련 지출이 모두 삭제된 후)
      // 남은 지출 내역들에서 해당 참여자 정보 정리
      project.expenses?.forEach(expense => {
        if (expense.split_method !== 'equally' && expense.split_details?.[participantId]) {
          // 맞춤 분배에서 참여자 정보를 삭제하고, 균등 분배로 초기화
          delete expense.split_details[participantId];
          expense.split_method = 'equally';
          expense.split_details = {}; // 상세 내역 초기화
          expense.locked_participant_ids = []; // 잠금 초기화
        }
      });

      // 최종적으로 참여자 목록에서 삭제
      project.participants.splice(participantIndex, 1);
    }
  });

  if (participantFound) {
    writeDb(db);
    res.status(200).jsonp({});
  } else {
    res.status(404).jsonp({ error: "Participant not found" });
  }
});

// 6. 특정 지출 내역 삭제 (DELETE /expenses/:id)
server.delete('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  let expenseFound = false;
  db.projects.forEach(project => {
    const expenseIndex = project.expenses?.findIndex(e => e.id === parseInt(id));
    if (expenseIndex > -1) {
      project.expenses.splice(expenseIndex, 1);
      expenseFound = true;
    }
  });

  if (expenseFound) {
    writeDb(db);
    res.status(200).jsonp({});
  } else {
    res.status(404).jsonp({ error: "Expense not found" });
  }
});

server.patch('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const db = readDb();
  let expenseFound = false;

  for (const project of db.projects) {
    const expenseIndex = project.expenses?.findIndex(e => e.id === parseInt(id));
    if (expenseIndex > -1) {
      project.expenses[expenseIndex] = { 
        ...project.expenses[expenseIndex], 
        ...updatedData 
      };
      expenseFound = true;
      break; 
    }
  }

  if (expenseFound) {
    writeDb(db);
    res.status(200).jsonp(updatedData);
  } else {
    res.status(404).jsonp({ error: "Expense not found" });
  }
});

// 나머지 요청들은 기본 json-server 라우터를 사용합니다.
server.use(router);

server.listen(3001, () => {
  console.log('JSON Server with custom routes is running on port 3001');
});