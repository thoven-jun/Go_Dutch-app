const jsonServer = require('json-server');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const fs = require('fs');

const dbTemplatePath = 'db.template.json';
const dbPath = 'db.json';

// db.json 파일이 없으면 db.template.json을 복사해서 생성
if (!fs.existsSync(dbPath)) {
  fs.copyFileSync(dbTemplatePath, dbPath);
}

const router = jsonServer.router(dbPath);

server.use(middlewares);
// ✨ [수정] json-server.bodyParser -> jsonServer.bodyParser
server.use(jsonServer.bodyParser);

// 데이터베이스 파일을 읽고 쓰는 헬퍼 함수
const readDb = () => JSON.parse(fs.readFileSync('db.json', 'UTF-8'));
const writeDb = (data) => fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

// --- 사용자 정의 라우트 ---

// [수정] 새 프로젝트 생성 시, 기본 카테고리를 함께 생성
server.post('/projects', (req, res) => {
  const db = readDb();
  const { name, participants, expenses } = req.body;

  const allIds = [
    ...db.projects.map(p => p.id),
    ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
    ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
  ].filter(id => id != null);
  const maxId = Math.max(0, ...allIds);

  const defaultCategories = [
    { "id": 1, "name": "식비", "emoji": "🍔" },
    { "id": 2, "name": "교통비", "emoji": "🚗" },
    { "id": 3, "name": "쇼핑", "emoji": "🛍️" },
    { "id": 4, "name": "문화생활", "emoji": "🎬" },
    { "id": 5, "name": "기타", "emoji": "⚪️" }
  ];

  const newProject = {
    id: maxId + 1,
    name: name || "새 프로젝트",
    participants: participants || [],
    expenses: expenses || [],
    createdDate: new Date().toISOString(),
    categories: defaultCategories.map((cat, index) => ({...cat, id: index + 1}))
  };

  db.projects.push(newProject);
  writeDb(db);
  res.status(201).jsonp(newProject);
});

// [수정] 프로젝트 목록을 가져올 때, 각 프로젝트의 카테고리를 기준으로 지출 내역과 연결
server.get('/projects', (req, res) => {
  const db = readDb();
  const projectsWithDetails = db.projects.map(project => {
    const projectCategories = project.categories || [];
    return {
      ...project,
      participants: (project.participants || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
      expenses: (project.expenses || []).map(expense => {
        const category = projectCategories.find(c => c.id === expense.category_id);
        return { ...expense, category };
      }),
    }
  });
  res.jsonp(projectsWithDetails);
});

// --- ✨ 프로젝트별 카테고리 관리 API ---

// 특정 프로젝트의 카테고리 목록 가져오기
server.get('/projects/:projectId/categories', (req, res) => {
  const { projectId } = req.params;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));
  if (project) {
    res.jsonp(project.categories || []);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// 특정 프로젝트에 카테고리 추가
server.post('/projects/:projectId/categories', (req, res) => {
  const { projectId } = req.params;
  const { name, emoji } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    project.categories = project.categories || [];
    const maxId = Math.max(0, ...project.categories.map(c => c.id));
    const newCategory = { id: maxId + 1, name, emoji };
    project.categories.push(newCategory);
    writeDb(db);
    res.status(201).jsonp(newCategory);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// 카테고리 수정 (ID를 이용해 전체 프로젝트에서 검색)
server.patch('/categories/:id', (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { name, emoji, projectId } = req.body; // projectId 힌트를 받음
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
      const category = project.categories.find(c => c.id === categoryId);
      if (category) {
        if (name) category.name = name;
        if (emoji) category.emoji = emoji;
        writeDb(db);
        return res.status(200).jsonp(category);
      }
    }
    // 만약 projectId 힌트가 없거나 못찾았을 경우 전체 탐색 (느릴 수 있음)
    for (const p of db.projects) {
        const category = p.categories?.find(c => c.id === categoryId);
        if (category) {
            if (name) category.name = name;
            if (emoji) category.emoji = emoji;
            writeDb(db);
            return res.status(200).jsonp(category);
        }
    }
    res.status(404).jsonp({ error: "Category not found in any project" });
});

// 카테고리 삭제 (ID를 이용해 전체 프로젝트에서 검색)
server.delete('/categories/:id', (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { projectId } = req.body; // projectId 힌트를 받음
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
        const isCategoryInUse = project.expenses?.some(e => e.category_id === categoryId);
        if (isCategoryInUse) {
            return res.status(400).jsonp({ error: "Cannot delete category: it is currently in use by an expense." });
        }
        const categoryIndex = project.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex > -1) {
            project.categories.splice(categoryIndex, 1);
            writeDb(db);
            return res.status(200).jsonp({ message: 'Category deleted successfully' });
        }
    }
    res.status(404).jsonp({ error: "Category not found in the specified project" });
});


// --- 기존 프로젝트, 참여자, 지출 관련 API ---

server.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectId = parseInt(id);
  const db = readDb();
  const projectIndex = db.projects.findIndex(p => p.id === projectId);
  if (projectIndex > -1) {
    db.projects.splice(projectIndex, 1);
    writeDb(db);
    res.status(200).jsonp({ message: 'Project deleted successfully' });
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
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

server.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(id));
  if (project) {
    project.name = name;
    writeDb(db);
    res.status(200).jsonp(project);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

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
    const newParticipant = { id: maxId + 1, name: name, orderIndex: project.participants.length };
    project.participants.push(newParticipant);
    writeDb(db);
    res.status(201).jsonp(newParticipant);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

server.post('/projects/:projectId/participants/reorder', (req, res) => {
  const { projectId } = req.params;
  const { orderedParticipantIds } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));
  if (project && Array.isArray(orderedParticipantIds)) {
    const participantMap = new Map(project.participants.map(p => [p.id, p]));
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

server.get('/projects/:projectId/settlement', (req, res) => {
    const { projectId } = req.params;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));
    if (!project) return res.status(404).jsonp({ error: 'Project not found' });

    const participants = project.participants || [];
    const expenses = project.expenses || [];
    const participantMap = new Map(participants.map(p => [p.id, p.name]));

    if (participants.length === 0) {
        return res.json({ totalAmount: 0, participantCount: 0, perPersonAmount: 0, netTransfers: [], grossTransfers: [] });
    }

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalOwedBy = {};
    participants.forEach(p => { totalOwedBy[p.id] = 0; });

    const grossTransfersMap = new Map();

    expenses.forEach(expense => {
        const { amount, payer_id, split_method = 'equally', split_details = {}, penny_rounding_target_id, split_participants } = expense;
        const involvedParticipantIds = (split_participants && split_participants.length > 0) ? split_participants : participants.map(p => p.id);
        const involvedParticipants = participants.filter(p => involvedParticipantIds.includes(p.id));

        if (involvedParticipants.length === 0) return;

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

        Object.entries(expenseShares).forEach(([participantId, share]) => {
            totalOwedBy[participantId] += share;
            if (Number(participantId) !== payer_id && share > 0) {
                const from = participantMap.get(Number(participantId));
                const to = participantMap.get(payer_id);
                const key = `${from}→${to}`;
                const currentAmount = grossTransfersMap.get(key) || 0;
                grossTransfersMap.set(key, currentAmount + share);
            }
        });
    });

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

    const grossTransfers = Array.from(grossTransfersMap.entries()).map(([key, amount]) => {
        const [from, to] = key.split('→');
        return { from, to, amount: Math.round(amount) };
    });

    res.json({
        totalAmount,
        participantCount: participants.length,
        perPersonAmount: participants.length > 0 ? Math.round(totalAmount / participants.length) : 0,
        netTransfers,
        grossTransfers
    });
});

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
      project.expenses[expenseIndex] = { ...project.expenses[expenseIndex], ...updatedData };
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