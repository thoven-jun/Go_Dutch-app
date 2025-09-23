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

server.post('/projects', (req, res) => {
  const db = readDb();
  const { name, participants, expenses } = req.body;

  const allIds = [
    ...db.projects.map(p => p.id),
    ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
    ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
  ].filter(id => id != null);
  const maxId = Math.max(0, ...allIds);

  const newProject = {
    id: maxId + 1,
    name: name || "새 프로젝트",
    participants: participants || [],
    expenses: expenses || [],
    createdDate: new Date().toISOString()
  };

  db.projects.push(newProject);
  writeDb(db);
  res.status(201).jsonp(newProject);
});

server.get('/categories', (req, res) => {
  const db = readDb();
  res.jsonp(db.categories || []);
});

// 프로젝트 목록을 가져올 때 항상 참여자와 지출 내역을 포함하여 반환
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

// 참여자 이름 수정
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

// 프로젝트에 참여자 추가
server.post('/projects/:projectId/participants', (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    project.participants = project.participants || [];
    const allIds = [
      ...db.projects.map(p => p.id),
      ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
      ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
    ].filter(id => id != null);
    const maxId = Math.max(0, ...allIds);
    
    const newParticipant = { id: maxId + 1, name: name };
    project.participants.push(newParticipant);
    writeDb(db);
    res.status(201).jsonp(newParticipant);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// --- ✨ [수정] 지출 내역 추가 API (몰아주기 대상 ID 포함) ---
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

    const expenseWithId = { ...newExpenseData, id: maxId + 1 };
    project.expenses.push(expenseWithId);
    writeDb(db);
    res.status(201).jsonp(expenseWithId);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// --- ✨ [수정] 정산 결과 계산 API (몰아주기 로직 추가) ---
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
        // ✨ 1. expense 객체에서 split_participants 속성을 가져옵니다.
        const { amount, split_method = 'equally', split_details = {}, penny_rounding_target_id, split_participants } = expense;

        // ✨ 2. 비용 분담에 참여할 사람 목록을 결정합니다.
        //    - split_participants가 있으면 그 목록을 사용하고,
        //    - 없으면 기존처럼 프로젝트 전체 참여자를 대상으로 합니다.
        const involvedParticipantIds = (split_participants && split_participants.length > 0)
            ? split_participants
            : participants.map(p => p.id);
        
        const involvedParticipants = participants.filter(p => involvedParticipantIds.includes(p.id));

        if (involvedParticipants.length === 0) return;

        if (split_method === 'equally') {
            const targetId = penny_rounding_target_id;
            if (targetId && participants.some(p => p.id === targetId)) {
                // '몰아주기' 기능 사용 시
                const idealShare = amount / involvedParticipants.length;
                let totalRoundedDown = 0;
                involvedParticipants.forEach(p => {
                    if (p.id !== targetId) {
                        const share = Math.floor(idealShare / 10) * 10;
                        totalOwedBy[p.id] += share;
                        totalRoundedDown += share;
                    }
                });
                totalOwedBy[targetId] += amount - totalRoundedDown;
            } else {
                // ✨ 수정된 'involvedParticipants' 목록을 사용하여 1/N 계산을 수행합니다.
                const perPerson = amount / involvedParticipants.length;
                involvedParticipants.forEach(p => { totalOwedBy[p.id] += perPerson; });
            }
        } else if (split_method === 'amount') {
            involvedParticipants.forEach(p => { totalOwedBy[p.id] += Number(split_details[p.id] || 0); });
            const amountParticipants = participants.filter(p => split_details[p.id] && Number(split_details[p.id]) > 0);
            amountParticipants.forEach(p => { totalOwedBy[p.id] += Number(split_details[p.id] || 0); });
        } else if (split_method === 'percentage') {
            const percentageParticipants = participants.filter(p => split_details[p.id] && Number(split_details[p.id]) > 0);
            let totalCalculated = 0;
            const sortedParticipants = involvedParticipants.sort((a,b) => a.id - b.id); // 계산 일관성을 위한 정렬
            sortedParticipants.forEach(p => {
                const percentage = Number(split_details[p.id] || 0);
                const share = Math.floor(amount * (percentage / 100));
                totalOwedBy[p.id] += share;
                totalCalculated += share;
            });
            // 1% 단위 오차 보정
            const remainder = amount - totalCalculated;
            if (remainder > 0 && expense.payer_id) {
                totalOwedBy[expense.payer_id] += remainder;
            }
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

// 참여자 삭제
server.delete('/participants/:id', (req, res) => {
  const { id } = req.params;
  const participantId = parseInt(id);
  const db = readDb();
  let participantFound = false;

  db.projects.forEach(project => {
    const participantIndex = project.participants?.findIndex(p => p.id === participantId);
    
    if (participantIndex > -1) {
      participantFound = true;
      const isPayer = project.expenses?.some(e => e.payer_id === participantId);

      if (isPayer) {
        project.expenses = project.expenses.filter(e => e.payer_id !== participantId);
      }
      
      project.expenses?.forEach(expense => {
        if (expense.split_method !== 'equally' && expense.split_details?.[participantId]) {
          delete expense.split_details[participantId];
          expense.split_method = 'equally';
          expense.split_details = {};
          expense.locked_participant_ids = [];
        }
      });

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

// 지출 내역 삭제
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

// --- ✨ [수정] 지출 내역 수정 API (몰아주기 대상 ID 포함) ---
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


const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`JSON Server with custom routes is running on port ${port}`);
});