const express = require('express');
const cors = require('cors');
const db = require('./db'); // <-- 데이터베이스 설정 파일을 불러옵니다.

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// GET: 모든 프로젝트 목록 가져오기
app.get('/api/projects', async (req, res) => {
  const projects = await db('projects').select('*');
  res.json(projects);
});

// POST: 새 프로젝트 추가하기
app.post('/api/projects', async (req, res) => {
  const [newProject] = await db('projects').insert({ name: req.body.name }).returning('*');
  res.status(201).json(newProject);
});

// GET: 특정 프로젝트 정보 가져오기 (참여자, 지출 포함)
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const project = await db('projects').where({ id }).first();
  if (project) {
    project.participants = await db('participants').where({ project_id: id });
    project.expenses = await db('expenses').where({ project_id: id });
    res.json(project);
  } else {
    res.status(404).send('Project not found');
  }
});

// POST: 특정 프로젝트에 참여자 추가하기
app.post('/api/projects/:id/participants', async (req, res) => {
    const { id } = req.params;
    const [newParticipant] = await db('participants').insert({ name: req.body.name, project_id: id }).returning('*');
    res.status(201).json(newParticipant);
});

// POST: 특정 프로젝트에 지출 내역 추가하기
app.post('/api/projects/:id/expenses', async (req, res) => {
    const { id } = req.params;
    // 실제 앱에서는 payerId를 요청 본문에서 받아야 합니다. 지금은 임시로 첫 번째 참여자로 설정합니다.
    const firstParticipant = await db('participants').where({ project_id: id }).first();
    if (!firstParticipant) return res.status(400).send('No participants in this project');

    const [newExpense] = await db('expenses').insert({
        desc: req.body.desc,
        amount: parseInt(req.body.amount),
        project_id: id,
        payerId: firstParticipant.id
    }).returning('*');
    res.status(201).json(newExpense);
});

// GET: 정산 결과 계산하기
app.get('/api/projects/:id/settlement', async (req, res) => {
    const { id } = req.params;
    const project = await db('projects').where({ id }).first();
    if (!project) return res.status(404).send('Project not found');

    const participants = await db('participants').where({ project_id: id });
    const expenses = await db('expenses').where({ project_id: id });

    if (participants.length === 0) return res.json({ totalAmount: 0, participantCount: 0, perPersonAmount: 0, transfers: [] });
    
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const perPersonAmount = totalAmount / participants.length;

    let balances = {};
    for (const p of participants) {
        const paid = expenses.filter(e => e.payerId === p.id).reduce((sum, e) => sum + e.amount, 0);
        balances[p.name] = paid - perPersonAmount;
    }

    let creditors = Object.entries(balances).filter(([,b]) => b > 0).sort((a,b) => b[1] - a[1]);
    let debtors = Object.entries(balances).filter(([,b]) => b < 0).sort((a,b) => a[1] - b[1]);
    let transfers = [];

    while (creditors.length > 0 && debtors.length > 0) {
        let creditor = creditors[0];
        let debtor = debtors[0];
        let transferAmount = Math.min(creditor[1], Math.abs(debtor[1]));

        transfers.push({ from: debtor[0], to: creditor[0], amount: Math.round(transferAmount) });

        creditor[1] -= transferAmount;
        debtor[1] += transferAmount;

        if (Math.abs(creditor[1]) < 0.01) creditors.shift();
        if (Math.abs(debtor[1]) < 0.01) debtors.shift();
    }
    
    res.json({
        totalAmount,
        participantCount: participants.length,
        perPersonAmount: Math.round(perPersonAmount),
        transfers
    });
});

// DELETE: 특정 프로젝트와 관련 데이터 모두 삭제하기
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 순서가 중요: expenses -> participants -> project 순으로 삭제해야 합니다.
    await db('expenses').where({ project_id: id }).del();
    await db('participants').where({ project_id: id }).del();
    const deletedCount = await db('projects').where({ id }).del();

    if (deletedCount > 0) {
      res.status(200).send({ message: 'Project deleted successfully' });
    } else {
      res.status(404).send({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error deleting project', error });
  }
});

// PATCH: 특정 프로젝트의 이름 수정하기
app.patch('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body; // 요청에서 새로운 이름을 가져옴

  try {
    const updatedCount = await db('projects').where({ id }).update({ name });

    if (updatedCount > 0) {
      const updatedProject = await db('projects').where({ id }).first();
      res.status(200).json(updatedProject);
    } else {
      res.status(404).send({ message: 'Project not found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error updating project', error });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});