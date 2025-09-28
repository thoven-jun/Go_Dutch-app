const jsonServer = require('json-server');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const fs = require('fs');

const dbTemplatePath = 'db.template.json';
const dbPath = 'db.json';

if (!fs.existsSync(dbPath)) {
  fs.copyFileSync(dbTemplatePath, dbPath);
}

const router = jsonServer.router(dbPath);

server.use(middlewares);
server.use(jsonServer.bodyParser);

const readDb = () => JSON.parse(fs.readFileSync('db.json', 'UTF-8'));
const writeDb = (data) => fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

// --- 사용자 정의 라우트 ---
// --- ✨ [추가] 새 카테고리 추가 API ---
server.post('/categories', (req, res) => {
  const db = readDb();
  const { name, emoji } = req.body;
  if (!name || !emoji) {
    return res.status(400).jsonp({ error: "Name and emoji are required." });
  }
  const maxId = Math.max(0, ...db.categories.map(c => c.id));
  const newCategory = { id: maxId + 1, name, emoji };
  db.categories.push(newCategory);
  writeDb(db);
  res.status(201).jsonp(newCategory);
});

// --- ✨ [추가] 카테고리 수정 API ---
server.patch('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, emoji } = req.body;
  const db = readDb();
  const category = db.categories.find(c => c.id === parseInt(id));
  if (category) {
    if (name) category.name = name;
    if (emoji) category.emoji = emoji;
    writeDb(db);
    res.status(200).jsonp(category);
  } else {
    res.status(404).jsonp({ error: "Category not found" });
  }
});

// --- ✨ [추가] 카테고리 삭제 API ---
server.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  const categoryId = parseInt(id);
  const db = readDb();

  // 해당 카테고리를 사용하는 지출 내역이 있는지 확인
  const isCategoryInUse = db.projects.some(p => 
    p.expenses?.some(e => e.category_id === categoryId)
  );

  if (isCategoryInUse) {
    return res.status(400).jsonp({ error: "Cannot delete category: it is currently in use by an expense." });
  }

  const categoryIndex = db.categories.findIndex(c => c.id === categoryId);
  if (categoryIndex > -1) {
    db.categories.splice(categoryIndex, 1);
    writeDb(db);
    res.status(200).jsonp({ message: 'Category deleted successfully' });
  } else {
    res.status(404).jsonp({ error: "Category not found" });
  }
});

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
    participants: (project.participants || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    expenses: (project.expenses || []).map(expense => {
      const category = categories.find(c => c.id === expense.category_id);
      return { ...expense, category };
    }),
  }));
  res.jsonp(projectsWithDetails);
});

server.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectId = parseInt(id);
  const db = readDb();

  const projectIndex = db.projects.findIndex(p => p.id === projectId);

  if (projectIndex > -1) {
    db.projects.splice(projectIndex, 1); // 프로젝트 삭제
    writeDb(db);
    res.status(200).jsonp({ message: 'Project deleted successfully' });
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
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

server.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(id));

  if (project) {
    project.name = name; // 전달받은 새 이름으로 변경
    writeDb(db);
    res.status(200).jsonp(project);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
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
    
    const newParticipant = { 
      id: maxId + 1, 
      name: name,
      orderIndex: project.participants.length 
    };
    
    project.participants.push(newParticipant);
    writeDb(db);
    res.status(201).jsonp(newParticipant);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// --- ✨ [추가] 참여자 순서 업데이트 API ---
server.post('/projects/:projectId/participants/reorder', (req, res) => {
  const { projectId } = req.params;
  const { orderedParticipantIds } = req.body; // 순서대로 정렬된 ID 배열
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project && Array.isArray(orderedParticipantIds)) {
    // ID를 키로, 참여자 객체를 값으로 하는 맵을 만들어 빠른 조회를 가능하게 함
    const participantMap = new Map(project.participants.map(p => [p.id, p]));
    
    // 프론트에서 보내준 ID 순서대로 orderIndex를 0부터 다시 부여
    orderedParticipantIds.forEach((id, index) => {
      const participant = participantMap.get(id);
      if (participant) {
        participant.orderIndex = index;
      }
    });
    
    writeDb(db);
    res.status(200).jsonp(project.participants);
  } else {
    res.status(400).jsonp({ error: "Invalid project or data" });
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
    const participantMap = new Map(participants.map(p => [p.id, p.name]));

    if (participants.length === 0) {
        return res.json({ 
            totalAmount: 0, participantCount: 0, perPersonAmount: 0, 
            netTransfers: [], grossTransfers: [] // 반환 형식 통일
        });
    }

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalOwedBy = {};
    participants.forEach(p => { totalOwedBy[p.id] = 0; });
    
    // ✨ 총액 정산을 위한 거래 내역 기록 객체
    const grossTransfersMap = new Map();

    expenses.forEach(expense => {
        const { amount, payer_id, split_method = 'equally', split_details = {}, penny_rounding_target_id, split_participants } = expense;
        
        const involvedParticipantIds = (split_participants && split_participants.length > 0)
            ? split_participants
            : participants.map(p => p.id);
        const involvedParticipants = participants.filter(p => involvedParticipantIds.includes(p.id));

        if (involvedParticipants.length === 0) return;

        // --- 각 지출 항목별 분담액 계산 (이 부분은 총액/순액 모두에게 필요) ---
        let expenseShares = {};
        involvedParticipants.forEach(p => { expenseShares[p.id] = 0 });

        if (split_method === 'equally') {
            const targetId = penny_rounding_target_id;
            if (targetId && participants.some(p => p.id === targetId)) {
                const idealShare = amount / involvedParticipants.length;
                let totalRoundedDown = 0;
                involvedParticipants.forEach(p => {
                    if (p.id !== targetId) {
                        const share = Math.floor(idealShare / 10) * 10;
                        expenseShares[p.id] = share;
                        totalRoundedDown += share;
                    }
                });
                expenseShares[targetId] = amount - totalRoundedDown;
            } else {
                const perPerson = amount / involvedParticipants.length;
                involvedParticipants.forEach(p => { expenseShares[p.id] = perPerson; });
            }
        } else if (split_method === 'amount') {
            involvedParticipants.forEach(p => { expenseShares[p.id] = Number(split_details[p.id] || 0); });
        } else if (split_method === 'percentage') {
            let totalCalculated = 0;
            const sortedParticipants = involvedParticipants.sort((a,b) => a.id - b.id);
            sortedParticipants.forEach(p => {
                const percentage = Number(split_details[p.id] || 0);
                const share = Math.floor(amount * (percentage / 100));
                expenseShares[p.id] = share;
                totalCalculated += share;
            });
            const remainder = amount - totalCalculated;
            if (remainder > 0 && payer_id) {
                expenseShares[payer_id] = (expenseShares[payer_id] || 0) + remainder;
            }
        }

        // --- 계산된 분담액을 각 정산 방식에 맞게 누적 ---
        Object.entries(expenseShares).forEach(([participantId, share]) => {
            totalOwedBy[participantId] += share; // 순액 정산을 위한 총 분담액 누적
            
            // ✨ 총액 정산을 위한 거래 기록
            if (Number(participantId) !== payer_id && share > 0) {
                const from = participantMap.get(Number(participantId));
                const to = participantMap.get(payer_id);
                const key = `${from}→${to}`;
                const currentAmount = grossTransfersMap.get(key) || 0;
                grossTransfersMap.set(key, currentAmount + share);
            }
        });
    });
    
    // --- 💰 순액 정산(Net Settlement) 계산 ---
    const totalPaidBy = {};
    participants.forEach(p => {
        totalPaidBy[p.id] = expenses.filter(e => e.payer_id === p.id).reduce((sum, e) => sum + e.amount, 0);
    });
    const balances = {};
    participants.forEach(p => { balances[p.name] = totalPaidBy[p.id] - totalOwedBy[p.id]; });
    let creditors = Object.entries(balances).filter(([,b]) => b > 0).sort((a,b) => b[1] - a[1]);
    let debtors = Object.entries(balances).filter(([,b]) => b < 0).sort((a,b) => a[1] - b[1]);
    const netTransfers = [];
    while (creditors.length > 0 && debtors.length > 0) {
        let [creditorName, creditorAmount] = creditors[0];
        let [debtorName, debtorAmount] = debtors[0];
        let transferAmount = Math.min(creditorAmount, Math.abs(debtorAmount));
        if (transferAmount > 0.01) {
            netTransfers.push({ from: debtorName, to: creditorName, amount: Math.round(transferAmount) });
        }
        creditors[0][1] -= transferAmount;
        debtors[0][1] += transferAmount;
        if (Math.abs(creditors[0][1]) < 0.01) creditors.shift();
        if (Math.abs(debtors[0][1]) < 0.01) debtors.shift();
    }
    
    // --- 💸 총액 정산(Gross Settlement) 결과 변환 ---
    const grossTransfers = Array.from(grossTransfersMap.entries()).map(([key, amount]) => {
        const [from, to] = key.split('→');
        return { from, to, amount: Math.round(amount) };
    });

    res.json({
        totalAmount,
        participantCount: participants.length,
        perPersonAmount: participants.length > 0 ? Math.round(totalAmount / participants.length) : 0,
        netTransfers,   // 순액 정산 결과
        grossTransfers  // 총액 정산 결과
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