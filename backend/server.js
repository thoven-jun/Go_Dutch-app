// 제미나이용 백엔드/server.js

const jsonServer = require('json-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const fs = require('fs');

const SECRET_KEY = process.env.JWT_SECRET; // 실제 서비스에서는 더 복잡한 키를 사용해야 합니다.
const expiresIn = '1h';

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

// --- 인증 관련 함수 ---
const createToken = (payload) => jwt.sign(payload, SECRET_KEY, { expiresIn });
const verifyToken = (token) => jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ? decode : null);
const isAuthenticated = ({ email, password }) => {
  const db = readDb();
  const user = db.users.find(u => u.email === email);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
};

// --- ▼▼▼ 회원가입 API (/auth/register) ▼▼▼ ---
server.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  const db = readDb();

  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const maxId = Math.max(0, ...db.users.map(u => u.id));
  const newUser = {
    id: maxId + 1,
    email,
    password: hashedPassword,
    name
  };

  db.users.push(newUser);
  writeDb(db);

  const token = createToken({ email: newUser.email, userId: newUser.id });
  res.status(201).json({ accessToken: token });
});

// --- ▼▼▼ 로그인 API (/auth/login) ▼▼▼ ---
server.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!isAuthenticated({ email, password })) {
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }
  const db = readDb();
  const user = db.users.find(u => u.email === email);
  const token = createToken({ email: user.email, userId: user.id });
  res.status(200).json({ accessToken: token });
});

// --- ▼▼▼ 모든 API에 인증 미들웨어 추가 ▼▼▼ ---
server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    return res.status(401).json({ message: '권한이 없습니다.' });
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = verifyToken(token);
    if (decodedToken) {
      req.user = decodedToken;
      next();
    } else {
      res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
  } catch (err) {
    res.status(401).json({ message: '토큰 처리 중 오류가 발생했습니다.' });
  }
});

// --- ▼▼▼ [신설] 데이터 내보내기 API (기본 /db 라우트 오버라이드) ▼▼▼ ---
server.get('/db', (req, res) => {
  const { userId } = req.user;
  const db = readDb();
  
  // 현재 사용자의 프로젝트만 필터링
  const userProjects = db.projects.filter(p => p.userId === userId);

  // 사용자의 데이터만 포함하는 새로운 db 객체 생성
  const userDb = {
    users: db.users.filter(u => u.id === userId), // 선택적으로 사용자 정보 포함
    projects: userProjects,
    categories: db.categories // 카테고리는 공통 데이터로 유지
  };
  
  res.jsonp(userDb);
});


// --- ▼▼▼ 선택적 데이터 가져오기 API 수정 ▼▼▼ ---
server.post('/import/selective', (req, res) => {
  const { userId } = req.user;
  const projectsToImport = req.body;
  if (!Array.isArray(projectsToImport) || projectsToImport.length === 0) {
    return res.status(400).jsonp({ error: '가져올 프로젝트 데이터가 없습니다.' });
  }

  const db = readDb();
  const userProjects = db.projects.filter(p => p.userId === userId);
  
  const allIds = [
    ...db.projects.map(p => p.id),
    ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
    ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
  ].filter(id => id != null);
  let maxId = Math.max(0, ...allIds);

  const generateNewId = () => ++maxId;

  projectsToImport.forEach(project => {
    let newName = project.name;
    const existingNames = new Set(userProjects.map(p => p.name));
    if (existingNames.has(newName)) {
      let counter = 1;
      let suffixedName = `${newName} (가져옴)`;
      while (existingNames.has(suffixedName)) {
        counter++;
        suffixedName = `${newName} (가져옴 ${counter})`;
      }
      newName = suffixedName;
    }
    project.name = newName;
    project.userId = userId; // [보안 수정] 가져온 프로젝트에 현재 사용자 ID 할당

    const oldToNewParticipantIdMap = new Map();
    
    if (project.participants) {
      project.participants.forEach(p => {
        const oldId = p.id;
        const newId = generateNewId();
        p.id = newId;
        oldToNewParticipantIdMap.set(oldId, newId);
      });
    }

    if (project.expenses) {
      project.expenses.forEach(e => {
        e.id = generateNewId();
        if (e.payer_id) e.payer_id = oldToNewParticipantIdMap.get(e.payer_id) || e.payer_id;
        if (e.split_participants) e.split_participants = e.split_participants.map(id => oldToNewParticipantIdMap.get(id) || id);
        if (e.split_details) {
          const newDetails = {};
          for (const oldId in e.split_details) {
            const newId = oldToNewParticipantIdMap.get(parseInt(oldId));
            if (newId) newDetails[newId] = e.split_details[oldId];
          }
          e.split_details = newDetails;
        }
      });
    }

    project.id = generateNewId();
    db.projects.push(project);
  });

  writeDb(db);
  res.status(200).jsonp({ message: '선택한 프로젝트를 성공적으로 가져왔습니다.' });
});

// --- 사용자 정의 라우트 ---

server.post('/projects', (req, res) => {
  const db = readDb();
  const { name, type = 'general', startDate = null, endDate = null, rounds = [] } = req.body;
  const { userId } = req.user;

  const allIds = [
    ...db.projects.map(p => p.id),
    ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []),
    ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || [])
  ].filter(id => id != null);
  const maxId = Math.max(0, ...allIds);

  const defaultCategorySet = {
    food: { "name": "식비", "emoji": "🍔", "isDeletable": false },
    transport: { "name": "교통비", "emoji": "🚗", "isDeletable": false },
    lodging: { "name": "숙박", "emoji": "🏨", "isDeletable": false },
    shopping: { "name": "쇼핑", "emoji": "🛍️", "isDeletable": true },
    culture: { "name": "문화생활", "emoji": "🎬", "isDeletable": true },
    misc: { "name": "기타", "emoji": "⚪️", "isDeletable": true }
  };

  let projectCategories = [];
  
  if (type === 'travel') {
    projectCategories = [ defaultCategorySet.food, defaultCategorySet.lodging, defaultCategorySet.transport, defaultCategorySet.shopping, defaultCategorySet.culture, defaultCategorySet.misc ];
  } else {
    projectCategories = [ defaultCategorySet.food, defaultCategorySet.transport, defaultCategorySet.shopping, defaultCategorySet.culture, defaultCategorySet.misc ];
  }
  
  const finalCategories = projectCategories.map((cat, index) => ({ id: index + 1, ...cat }));

  const newProject = {
    id: maxId + 1,
    userId,
    name: name || "새 프로젝트",
    type, startDate, endDate,
    participants: [],
    expenses: [],
    createdDate: new Date().toISOString(),
    categories: finalCategories,
    ...(type === 'gathering' && { rounds: rounds })
  };

  db.projects.push(newProject);
  writeDb(db);
  res.status(201).jsonp(newProject);
});

// [보안 수정]
server.get('/projects', (req, res) => {
  const db = readDb();
  const { userId } = req.user;

  const userProjects = db.projects.filter(p => p.userId === userId);
  
  const projectsWithDetails = userProjects.map(project => {
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

// [보안 수정]
server.get('/projects/:projectId/categories', (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    res.jsonp(project.categories || []);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// [보안 수정]
server.post('/projects/:projectId/categories', (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const { name, emoji } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    project.categories = project.categories || [];
    const maxId = Math.max(0, ...project.categories.map(c => c.id));
    const newCategory = { id: maxId + 1, name, emoji, isDeletable: true };
    project.categories.push(newCategory);
    writeDb(db);
    res.status(201).jsonp(newCategory);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// [보안 수정]
server.patch('/categories/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const categoryId = parseInt(id);
    const { name, emoji, projectId } = req.body;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
      if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
      const category = project.categories.find(c => c.id === categoryId);
      if (category) {
        if (name) category.name = name;
        if (emoji) category.emoji = emoji;
        writeDb(db);
        return res.status(200).jsonp(category);
      }
    }
    res.status(404).jsonp({ error: "Category not found in the specified project" });
});

// [보안 수정]
server.delete('/categories/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const categoryId = parseInt(id);
    const { projectId } = req.body;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
        if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

        const categoryToDelete = project.categories.find(c => c.id === categoryId);
        if (categoryToDelete && categoryToDelete.isDeletable === false) {
            return res.status(400).jsonp({ error: `'${categoryToDelete.name}' 카테고리는 삭제할 수 없습니다.` });
        }
        
        const isCategoryInUse = project.expenses?.some(e => e.category_id === categoryId);
        if (isCategoryInUse) {
            return res.status(400).jsonp({ error: "해당 카테고리를 사용하고 있는 지출 내역이 있어 삭제할 수 없습니다." });
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

// [보안 수정]
server.patch('/participants/:id/name', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { name } = req.body;
  const db = readDb();
  let participantFound = false;
  for (const project of db.projects) {
    const participant = project.participants?.find(p => p.id === parseInt(id));
    if (participant) {
      if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
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

// [보안 수정]
server.patch('/participants/:id/attendance', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { attendance } = req.body;
  const db = readDb();
  let participantFound = false;
  for (const project of db.projects) {
    const participant = project.participants?.find(p => p.id === parseInt(id));
    if (participant) {
      if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
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

// [보안 수정] - 완료
server.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { name, startDate, endDate } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(id));

  if (project) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    if (name) project.name = name;
    if (project.type === 'travel') {
      const oldStartDate = new Date(project.startDate);
      const oldEndDate = new Date(project.endDate);
      const newStartDate = startDate ? new Date(startDate) : null;
      const newEndDate = endDate ? new Date(endDate) : null;

      if ((newStartDate && newStartDate > oldStartDate) || (newEndDate && newEndDate < oldEndDate)) {
        const hasExpensesInRemovedDates = (project.expenses || []).some(expense => {
          const expenseDate = new Date(expense.eventDate);
          if (newStartDate && expenseDate < newStartDate) return true;
          if (newEndDate && expenseDate > newEndDate) return true;
          return false;
        });
        if (hasExpensesInRemovedDates) return res.status(400).jsonp({ error: "삭제될 날짜에 지출 내역이 존재하여 기간을 수정할 수 없습니다." });
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

// [보안 수정] - 완료
server.delete('/projects/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const db = readDb();
    const projectIndex = db.projects.findIndex(p => p.id === parseInt(id));

    if (projectIndex === -1) return res.status(404).jsonp({ error: "Project not found" });

    if (db.projects[projectIndex].userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

    db.projects.splice(projectIndex, 1);
    writeDb(db);
    res.status(200).jsonp({ message: 'Project deleted successfully' });
});

// [보안 수정]
server.patch('/projects/:projectId/rounds', (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.user;
    const { rounds } = req.body;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (project) {
        if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
        const oldRoundNumbers = new Set((project.rounds || []).map(r => r.number));
        const newRoundNumbers = new Set((rounds || []).map(r => r.number));
        const deletedRoundNumbers = [...oldRoundNumbers].filter(rNum => !newRoundNumbers.has(rNum));
        const expensesInDeletedRounds = project.expenses.filter(e => deletedRoundNumbers.includes(e.round));

        if (expensesInDeletedRounds.length > 0) {
            const usedRounds = [...new Set(expensesInDeletedRounds.map(e => e.round))];
            return res.status(400).jsonp({ error: `${usedRounds.join(', ')}차는 지출 내역에서 사용 중이므로 삭제할 수 없습니다.` });
        }
        project.rounds = rounds.sort((a,b) => a.number - b.number);
        writeDb(db);
        res.status(200).jsonp(project);
    } else {
        res.status(404).jsonp({ error: "Project not found" });
    }
});

// [보안 수정] - 완료
server.post('/projects/:projectId/participants', (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const { name } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));
  if (project) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    
    project.participants = project.participants || [];
    const allIds = [ ...db.projects.map(p => p.id), ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []), ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || []) ].filter(id => id != null);
    const maxId = Math.max(0, ...allIds);
    
    let initialAttendance = [];
    if (project.type === 'travel' && project.startDate && project.endDate) {
      let current = new Date(project.startDate);
      const end = new Date(project.endDate);
      while (current <= end) {
        initialAttendance.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
    
    const newParticipant = { id: maxId + 1, name: name, orderIndex: project.participants.length, attendance: initialAttendance };
    project.participants.push(newParticipant);
    writeDb(db);
    res.status(201).jsonp(newParticipant);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// [보안 수정]
server.post('/projects/:projectId/participants/reorder', (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const { orderedParticipantIds } = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project && Array.isArray(orderedParticipantIds)) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    const participantMap = new Map(project.participants.map(p => [p.id, p]));
    orderedParticipantIds.forEach((id, index) => {
      const participant = participantMap.get(id);
      if (participant) participant.orderIndex = index;
    });
    writeDb(db);
    res.status(200).jsonp(project.participants);
  } else {
    res.status(400).jsonp({ error: "Invalid project or data" });
  }
});

// [보안 수정]
server.post('/projects/:projectId/expenses', (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.user;
  const newExpenseData = req.body;
  const db = readDb();
  const project = db.projects.find(p => p.id === parseInt(projectId));

  if (project) {
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
    project.expenses = project.expenses || [];
    const allIds = [ ...db.projects.map(p => p.id), ...db.projects.flatMap(p => p.participants?.map(pt => pt.id) || []), ...db.projects.flatMap(p => p.expenses?.map(e => e.id) || []) ].filter(id => id != null);
    const maxId = Math.max(0, ...allIds);
    const expenseWithId = { ...newExpenseData, id: maxId + 1 };
    project.expenses.push(expenseWithId);
    writeDb(db);
    res.status(201).jsonp(expenseWithId);
  } else {
    res.status(404).jsonp({ error: "Project not found" });
  }
});

// [보안 수정]
server.get('/projects/:projectId/settlement', (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.user;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (!project) return res.status(404).jsonp({ error: 'Project not found' });
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

    const participants = project.participants || [];
    if (participants.length === 0) return res.json({ totalAmount: 0, participantCount: 0, perPersonAmount: 0, netTransfers: [], grossTransfers: [], balances: [] });

    const expenses = project.expenses || [];
    const participantNameMap = new Map(participants.map(p => [p.id, p.name]));
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    let totalOwedBy = {};
    participants.forEach(p => { totalOwedBy[p.id] = 0; });
    const grossTransfersMap = new Map();

    expenses.forEach(expense => {
        const { amount, payer_id, split_method = 'equally', split_details = {}, penny_rounding_target_id, split_participants, eventDate, round } = expense;
        
        let involvedParticipantIds;
        if (split_method === 'amount' || split_method === 'percentage') { involvedParticipantIds = Object.keys(split_details).map(Number); } 
        else if (split_participants && split_participants.length > 0) { involvedParticipantIds = split_participants; } 
        else if (project.type === 'travel' && eventDate) { involvedParticipantIds = participants.filter(p => p.attendance?.includes(eventDate)).map(p => p.id); } 
        else if (project.type === 'gathering' && round) { involvedParticipantIds = participants.filter(p => p.attendance?.includes(round)).map(p => p.id); }
        else { involvedParticipantIds = participants.map(p => p.id); }

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
                const share = Math.floor(amount * (Number(split_details[p.id] || 0) / 100));
                expenseShares[p.id] = share;
                totalCalculated += share;
            });
            const remainder = amount - totalCalculated;
            if (remainder > 0 && payer_id && expenseShares[payer_id] !== undefined) {
                expenseShares[payer_id] += remainder;
            } else if (remainder > 0 && sortedParticipants.length > 0) {
                expenseShares[sortedParticipants[0].id] += remainder;
            }
        }

        Object.entries(expenseShares).forEach(([participantId, share]) => {
            totalOwedBy[participantId] += share;
            if (Number(participantId) !== payer_id && share > 0) {
                const from = participantNameMap.get(Number(participantId));
                const to = participantNameMap.get(payer_id);
                if (from && to) {
                    const key = `${from}→${to}`;
                    grossTransfersMap.set(key, (grossTransfersMap.get(key) || 0) + share);
                }
            }
        });
    });

    const totalPaidBy = {};
    participants.forEach(p => { totalPaidBy[p.id] = expenses.filter(e => e.payer_id === p.id).reduce((sum, e) => sum + e.amount, 0); });

    const balances_details = participants.map(p => ({ name: p.name, totalPaid: totalPaidBy[p.id] || 0, totalOwed: totalOwedBy[p.id] || 0, balance: (totalPaidBy[p.id] || 0) - (totalOwedBy[p.id] || 0) }));
    const balancesForNetting = {};
    participants.forEach(p => { balancesForNetting[p.name] = (totalPaidBy[p.id] || 0) - (totalOwedBy[p.id] || 0); });

    let creditors = Object.entries(balancesForNetting).filter(([,b]) => b > 0).sort((a,b) => b[1] - a[1]);
    let debtors = Object.entries(balancesForNetting).filter(([,b]) => b < 0).sort((a,b) => a[1] - b[1]);
    const netTransfers = [];
    while (creditors.length > 0 && debtors.length > 0) {
        let [creditorName, creditorAmount] = creditors[0];
        let [debtorName, debtorAmount] = debtors[0];
        let transferAmount = Math.min(creditorAmount, Math.abs(debtorAmount));
        if (transferAmount > 0.01) netTransfers.push({ from: debtorName, to: creditorName, amount: Math.round(transferAmount) });
        creditors[0][1] -= transferAmount;
        debtors[0][1] += transferAmount;
        if (Math.abs(creditors[0][1]) < 0.01) creditors.shift();
        if (Math.abs(debtors[0][1]) < 0.01) debtors.shift();
    }

    const grossTransfers = Array.from(grossTransfersMap.entries()).map(([key, amount]) => { const [from, to] = key.split('→'); return { from, to, amount: Math.round(amount) }; });

    res.json({ totalAmount, participantCount: participants.length, perPersonAmount: participants.length > 0 ? Math.round(totalAmount / participants.length) : 0, netTransfers, grossTransfers, balances: balances_details });
});

// [보안 수정]
server.get('/projects/:projectId/receipt', (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.user;
    const db = readDb();
    const project = db.projects.find(p => p.id === parseInt(projectId));

    if (!project) return res.status(404).jsonp({ error: 'Project not found' });
    if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

    const participants = project.participants || [];
    if (participants.length === 0) return res.json([]);
    
    const expenses = project.expenses || [];
    const categories = project.categories || [];
    const participantMap = new Map(participants.map(p => [p.id, p.name]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const receipts = participants.map(participant => {
        let totalSpent = 0;
        const spentByCategoryMap = new Map();

        expenses.forEach(expense => {
            const { id: expenseId, desc, amount, category_id, payer_id, split_method = 'equally', split_details = {}, split_participants, eventDate, round } = expense;
            let involvedParticipantIds;
            if (split_method === 'amount' || split_method === 'percentage') { involvedParticipantIds = Object.keys(split_details).map(Number); } 
            else if (split_participants && split_participants.length > 0) { involvedParticipantIds = split_participants; } 
            else if (project.type === 'travel' && eventDate) { involvedParticipantIds = participants.filter(p => p.attendance?.includes(eventDate)).map(p => p.id); } 
            else if (project.type === 'gathering' && round) { involvedParticipantIds = participants.filter(p => p.attendance?.includes(round)).map(p => p.id); } 
            else { involvedParticipantIds = participants.map(p => p.id); }
            
            if (involvedParticipantIds.includes(participant.id)) {
                let yourShare = 0;
                const involvedCount = involvedParticipantIds.length;

                if (involvedCount > 0) {
                    if (split_method === 'equally') { yourShare = amount / involvedCount; } 
                    else if (split_method === 'amount') { yourShare = Number(split_details[participant.id] || 0); } 
                    else if (split_method === 'percentage') { yourShare = amount * (Number(split_details[participant.id] || 0) / 100); }
                }
                
                yourShare = Math.round(yourShare);

                if (yourShare > 0) {
                    totalSpent += yourShare;
                    const category = categoryMap.get(category_id) || { id: 0, name: '미분류', emoji: '⚪️' };
                    if (!spentByCategoryMap.has(category.id)) {
                        spentByCategoryMap.set(category.id, { categoryId: category.id, categoryName: category.name, categoryEmoji: category.emoji, totalAmount: 0, expenseDetails: [] });
                    }
                    const categoryGroup = spentByCategoryMap.get(category.id);
                    categoryGroup.totalAmount += yourShare;
                    categoryGroup.expenseDetails.push({ expenseId, expenseDesc: desc, yourShare, totalExpenseAmount: amount, payerName: participantMap.get(payer_id) || 'N/A' });
                }
            }
        });

        return { participantId: participant.id, participantName: participant.name, totalSpent: Math.round(totalSpent), spentByCategory: Array.from(spentByCategoryMap.values()) };
    });

    res.json(receipts);
});

// [보안 수정]
server.delete('/participants/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const participantId = parseInt(id);
  const db = readDb();
  
  const project = db.projects.find(p => p.participants?.some(pt => pt.id === participantId));

  if (!project) return res.status(404).jsonp({ error: "Participant not found" });
  if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

  const participantIndex = project.participants.findIndex(p => p.id === participantId);

  project.expenses = project.expenses?.filter(e => e.payer_id !== participantId) || [];
  project.expenses?.forEach(expense => {
    if (expense.split_participants?.includes(participantId)) {
      expense.split_participants = expense.split_participants.filter(id => id !== participantId);
    }
    if (expense.split_details && expense.split_details[participantId] !== undefined) {
      delete expense.split_details[participantId];
      if (expense.split_method !== 'equally') {
        expense.split_method = 'equally'; 
        expense.split_participants = Object.keys(expense.split_details).map(Number);
        expense.locked_participant_ids = [];
      }
    }
  });

  project.participants.splice(participantIndex, 1);

  writeDb(db);
  res.status(200).jsonp({ message: 'Participant deleted successfully' });
});

// [보안 수정]
server.delete('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const db = readDb();
  
  const project = db.projects.find(p => p.expenses?.some(e => e.id === parseInt(id)));

  if (!project) return res.status(404).jsonp({ error: "Expense not found" });
  if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });

  const expenseIndex = project.expenses.findIndex(e => e.id === parseInt(id));
  project.expenses.splice(expenseIndex, 1);
  
  writeDb(db);
  res.status(200).jsonp({});
});

// [보안 수정]
server.patch('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const updatedData = req.body;
  const db = readDb();
  
  const project = db.projects.find(p => p.expenses?.some(e => e.id === parseInt(id)));

  if (!project) return res.status(404).jsonp({ error: "Expense not found" });
  if (project.userId !== userId) return res.status(403).jsonp({ error: "Forbidden" });
  
  const expenseIndex = project.expenses.findIndex(e => e.id === parseInt(id));
  project.expenses[expenseIndex] = { ...project.expenses[expenseIndex], ...updatedData };

  writeDb(db);
  res.status(200).jsonp(updatedData);
});

// [보안 수정] - 더 이상 전체 데이터를 덮어쓰지 않음. selective import로 대체.
server.post('/import', (req, res) => {
  res.status(405).jsonp({ error: 'This endpoint is deprecated. Please use /import/selective.' });
});

// [보안 수정]
server.post('/reset', (req, res) => {
  const { userId } = req.user;
  const db = readDb();

  // 현재 사용자의 프로젝트만 삭제
  db.projects = db.projects.filter(p => p.userId !== userId);
  
  writeDb(db);
  res.status(200).jsonp({ message: 'Your data has been reset successfully' });
});

server.use(router);

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`JSON Server with custom routes is running on port ${port}`);
});