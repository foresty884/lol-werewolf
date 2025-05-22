const aTeamInputs = document.getElementById('aTeamInputs');
const bTeamInputs = document.getElementById('bTeamInputs');
for (let i = 0; i < 5; i++) {
  aTeamInputs.innerHTML += `<input name="a${i}" required><br>`;
  bTeamInputs.innerHTML += `<input name="b${i}" required><br>`;
}

document.querySelectorAll('input[name="gmMode"]').forEach(r => {
  r.addEventListener('change', toggleGmMode);
});
toggleGmMode();

function toggleGmMode() {
  const gm = document.querySelector('input[name="gmMode"]:checked').value === 'true';
  document.getElementById('gmOffSection').style.display = gm ? 'none' : 'block';
  document.getElementById('gmOnSection').style.display = gm ? 'block' : 'none';
  const gmInputs = document.getElementById('gmMemberInputs');
  gmInputs.innerHTML = '';
  if (gm) {
    for (let i = 0; i < 10; i++) {
      const name = (document.querySelector(`input[name=a${i < 5 ? i : i - 5}]`) || {}).value || '';
      gmInputs.innerHTML += `
        <p>${name || `メンバー${i + 1}`}</p>
        役職：<select name="role${i}"><option>村人</option><option>人狼</option></select><br>
        タスク：<textarea name="task${i}"></textarea><br>
      `;
    }
  }
}

document.getElementById('settingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('error');
  err.textContent = '';

  const gmMode = document.querySelector('input[name="gmMode"]:checked').value === 'true';

  const aTeam = [...Array(5)].map((_, i) => document.querySelector(`input[name=a${i}]`).value.trim());
  const bTeam = [...Array(5)].map((_, i) => document.querySelector(`input[name=b${i}]`).value.trim());

  const body = { gmMode, aTeam, bTeam };

  if (gmMode) {
    const roles = {}, tasks = {};
    [...aTeam, ...bTeam].forEach((name, i) => {
      roles[name] = document.querySelector(`select[name=role${i}]`).value;
      tasks[name] = document.querySelector(`textarea[name=task${i}]`).value.split('\n').map(t => t.trim()).filter(Boolean);
    });
    body.roles = roles;
    body.tasks = tasks;
  } else {
    const tasksBig = document.getElementById('tasksBig').value.trim().split('\n').filter(Boolean);
    const tasksSmall = document.getElementById('tasksSmall').value.trim().split('\n').filter(Boolean);
    const numBigTasks = +document.getElementById('numBigTasks').value;
    const numSmallTasks = +document.getElementById('numSmallTasks').value;
    const numWolves = +document.getElementById('numWolves').value;
    const numVillagers = +document.getElementById('numVillagers').value;

    if (numWolves + numVillagers !== 5) {
      err.textContent = '人狼と村人の合計は5人にしてください。';
      return;
    }

    if (tasksBig.length < 10 * numBigTasks || tasksSmall.length < 10 * numSmallTasks) {
      err.textContent = '大タスクまたは小タスクの数が不足しています。';
      return;
    }

    Object.assign(body, { tasksBig, tasksSmall, numBigTasks, numSmallTasks, numWolves, numVillagers });
  }

  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    location.href = '/';
  } else {
    err.textContent = '設定の保存に失敗しました。';
  }
});