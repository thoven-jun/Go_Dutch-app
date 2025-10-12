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

server.post('/projects', (req, res) => {
  const db = readDb();
  const { name, participants, expenses, type = 'general', startDate = null, endDate = null } = req.body;

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
    type, startDate, endDate,
    participants: participants || [],
    expenses: expenses || [],
    createdDate: new Date().toISOString(),
    categories: defaultCategories.map((cat, index) => ({...cat, id: index + 1})),
    ...(type === 'gathering' && { rounds: [] }) // 회식/모임 유형일 때만 rounds 추가
  };

  db.projects.push(newProject);
  writeDb(db);
  res.status(201).jsonp(newProject);
});

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

server.patch('/categories/:id', (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { name, emoji, projectId } = req.body;
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

server.delete('/categories/:id', (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { projectId } = req.body;
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

server.patch('/participants/:id/name', (req, res) => {
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
    res.status(200).jsonp({ name });
  } else {
    res.status(404).jsonp({ error: "Participant not found" });
  }
});

server.patch('/participants/:id/attendance', (req, res) => {
  const { id } = req.params;
  const { attendance } = req.body;
  const db = readDb();
  let participantFound = false;
  for (const project of db.projects) {
    const participant = project.participants?.find(p => p.id === parseInt(id));
    if (participant) {
      participant.attendance = attendance;
      participantFound = true;
      break;
    }
  }
  if (participantFound) {
    writeDb(db);
    res.status(200).jsonp({ attendance });
  } else {
    res.status(404).jsonp({ error: "Participant not found" });
  }
});

server.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(id));

  if (project) {
    if (name) {
      project.name = name;
    }
    if (project.type === 'travel') {
      const oldStartDate = new Date(project.startDate);
      const oldEndDate = new Date(project.endDate);
      const newStartDate = startDate ? new Date(startDate) : null;
      const newEndDate = endDate ? new Date(endDate) : null;

      if ((newStartDate && newStartDate > oldStartDate) || (newEndDate && newEndDate < oldEndDate)) {
        const expensesToCheck = project.expenses || [];
        const hasExpensesInRemovedDates = expensesToCheck.some(expense => {
          const expenseDate = new Date(expense.eventDate);
          if (newStartDate && expenseDate < newStartDate) return true;
          if (newEndDate && expenseDate > newEndDate) return true;
          return false;
        });
        if (hasExpensesInRemovedDates) {
          return res.status(400).jsonp({ error: "삭제될 날짜에 지출 내역이 존재하여 기간을 수정할 수 없습니다." });
        }
      }
      if(startDate) project.startDate = startDate;
      if(endDate) project.endDate = endDate;
    }

    writeDb(db);
    res.status(200).jsonp(project);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

server.patch('/projects/:projectId/rounds', (req, res) => {
    const { projectId } = req.params;
    const { rounds } = req.body;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
        const oldRounds = new Set(project.rounds || []);
        const newRounds = new Set(rounds || []);
        
        const deletedRounds = [...oldRounds].filter(r => !newRounds.has(r));
        
        const expensesInDeletedRounds = project.expenses.filter(e => deletedRounds.includes(e.round));
        if (expensesInDeletedRounds.length > 0) {
            const usedRounds = [...new Set(expensesInDeletedRounds.map(e => e.round))];
            return res.status(400).jsonp({ error: `${usedRounds.join(', ')}차는 지출 내역에서 사용 중이므로 삭제할 수 없습니다.` });
        }

        project.rounds = rounds.sort((a,b) => a-b);
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
    
    let initialAttendance = [];
    if (project.type === 'travel' && project.startDate && project.endDate) {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      let current = new Date(start);
      while (current <= end) {
        initialAttendance.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
    
    const newParticipant = { 
      id: maxId + 1, 
      name: name, 
      orderIndex: project.participants.length,
      attendance: initialAttendance
    };

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
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const participantNameMap = new Map(participants.map(p => [p.id, p.name]));

    if (participants.length === 0) {
        return res.json({ totalAmount: 0, participantCount: 0, perPersonAmount: 0, netTransfers: [], grossTransfers: [] });
    }

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalOwedBy = {};
    participants.forEach(p => { totalOwedBy[p.id] = 0; });

    const grossTransfersMap = new Map();

    expenses.forEach(expense => {
        const { amount, payer_id, split_method = 'equally', split_details = {}, penny_rounding_target_id, split_participants, eventDate, round } = expense;
        
        let involvedParticipantIds;
        if (split_participants && split_participants.length > 0) {
            involvedParticipantIds = split_participants;
        } 
        else if (project.type === 'travel' && eventDate) {
            involvedParticipantIds = participants.filter(p => p.attendance?.includes(eventDate)).map(p => p.id);
        } else if (project.type === 'gathering' && round) {
            involvedParticipantIds = participants.filter(p => p.attendance?.includes(round)).map(p => p.id);
        }
        else {
            involvedParticipantIds = participants.map(p => p.id);
        }

        const involvedParticipants = participants.filter(p => involvedParticipantIds.includes(p.id));

        if (involvedParticipants.length === 0) return;

        let expenseShares = {};
        involvedParticipants.forEach(p => { expenseShares[p.id] = 0 });

        if (split_method === 'equally') {
            const targetId = penny_rounding_target_id;
            if (targetId && involvedParticipants.some(p => p.id === targetId)) {
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
                const from = participantNameMap.get(Number(participantId));
                const to = participantNameMap.get(payer_id);
                if (from && to) {
                    const key = `${from}→${to}`;
                    const currentAmount = grossTransfersMap.get(key) || 0;
                    grossTransfersMap.set(key, currentAmount + share);
                }
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
      
      // 1. 해당 참여자가 '결제자'인 지출 내역을 삭제
      project.expenses = project.expenses?.filter(e => e.payer_id !== participantId) || [];

      // 2. 남은 지출 내역들을 순회하며 해당 참여자 정보 정리
      project.expenses?.forEach(expense => {
        // 2-1. '균등 분배'의 분담 목록에서 제거
        if (expense.split_participants?.includes(participantId)) {
          expense.split_participants = expense.split_participants.filter(id => id !== participantId);
        }
        // 2-2. '금액/비율 지정'의 상세 정보에서 제거
        if (expense.split_details && expense.split_details[participantId] !== undefined) {
          delete expense.split_details[participantId];
          // ✨ 중요: 상세 분배 정보가 변경되었으므로, 데이터 정합성을 위해 균등 분배로 초기화
          expense.split_method = 'equally'; 
          expense.split_participants = Object.keys(expense.split_details).map(Number);
          expense.locked_participant_ids = [];
        }
      });

      // 3. 참여자 목록에서 최종적으로 삭제
      project.participants.splice(participantIndex, 1);
    }
  });

  if (participantFound) {
    writeDb(db);
    res.status(200).jsonp({ message: 'Participant deleted successfully' });
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