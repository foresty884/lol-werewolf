// MongoDBと連携するためのAPI URL
const API_BASE_URL = "https://your-api-endpoint.example.com";

document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;

  if (path.endsWith('settings.html')) {
    setupSettingsPage();
  } else if (path.endsWith('index.html') || path === '/' || path === '/index') {
    loadMembersToDropdown();
    document.getElementById('confirmBtn').addEventListener('click', handleConfirm);
  } else if (path.endsWith('member.html') || path.endsWith('observer.html')) {
    setupBackToTopButton();
  }
});

async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    alert('データの通信中にエラーが発生しました。');
  }
}

async function setupSettingsPage() {
  const teamAInputs = document.getElementById('teamAInputs');
  const teamBInputs = document.getElementById('teamBInputs');

  teamAInputs.innerHTML = '';
  teamBInputs.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
    teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
  }

  document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`teamA_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
    document.getElementById(`teamB_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
  }

  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
  await restoreSettings();

  const resetBtn = document.getElementById('resetSettings');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('設定をリセットしてよろしいですか？')) {
        await fetchData('resetSettings', { method: 'DELETE' });
        location.reload();
      }
    });
  }
}

function isGmMode() {
  return document.querySelector('input[name="gmMode"]:checked').value === 'yes';
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const isGm = isGmMode();
  const members = getAllMemberNames();
  if (members.length !== 10) {
    alert('メンバー名をすべて入力してください。');
    return;
  }

  if (isGm) {
    const data = {};
    let valid = true;

    members.forEach(name => {
      const id = name.replace(/\s/g, '_');
      const role = document.getElementById(`role_${id}`)?.value;
      const tasks = document.getElementById(`tasks_${id}`)?.value.split('\n').filter(l => l.trim());
      if (!role || tasks === undefined) valid = false;
      data[name] = { role, tasks };
    });

    if (!valid) {
      alert('一部役職・タスク未入力です');
      return;
    }

    await fetchData('saveSettings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'gm', members, data }),
    });

    alert('設定完了しました。');
    location.href = 'index.html';
    return;
  }

  const bigTasks = document.getElementById('largeTasks').value.trim().split('\n').filter(Boolean);
  const smallTasks = document.getElementById('smallTasks').value.trim().split('\n').filter(Boolean);
  const bigCount = +document.getElementById('largeTaskCount').value;
  const smallCount = +document.getElementById('smallTaskCount').value;
  const villagers = +document.getElementById('villagerCount').value;
  const werewolves = +document.getElementById('werewolfCount').value;

  if (villagers + werewolves !== 5) {
    alert('各チームの人狼と村人の合計は5にしてください。');
    return;
  }

  if (bigTasks.length < 10 * bigCount || smallTasks.length < 10 * smallCount) {
    alert(`大タスクは${10 * bigCount}個、小タスクは${10 * smallCount}個必要です。`);
    return;
  }

  shuffle(bigTasks);
  shuffle(smallTasks);

  const roles = {
    A: Array(villagers).fill('村人').concat(Array(werewolves).fill('人狼')),
    B: Array(villagers).fill('村人').concat(Array(werewolves).fill('人狼')),
  };
  Object.keys(roles).forEach(team => shuffle(roles[team]));

  const data = {};
  members.forEach((name, i) => {
    const team = name.startsWith('Aチーム') ? 'A' : 'B';
    const index = i % 5;
    const tasks = [
      ...bigTasks.slice(index * bigCount, (index + 1) * bigCount),
      ...smallTasks.slice(index * smallCount, (index + 1) * smallCount),
    ];
    data[name] = { role: roles[team][index], tasks };
  });

  await fetchData('saveSettings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'nogm', members, data }),
  });

  alert('設定完了しました。');
  location.href = 'index.html';
}

async function restoreSettings() {
  const settings = await fetchData('getSettings');
  if (!settings) return;

  const { mode, members, data, bigTasks, smallTasks, bigCount, smallCount, villagers, werewolves } = settings;

  if (members) {
    members.forEach((name, i) => {
      const inputId = name.startsWith('Aチーム') ? `teamA_${Math.floor(i / 2) + 1}` : `teamB_${Math.floor(i / 2) + 1}`;
      document.getElementById(inputId).value = name.replace(/^(Aチーム|Bチーム)：/, '');
    });
  }

  if (mode === 'gm') {
    document.querySelector('input[value="yes"]').checked = true;
    handleModeChange({ target: { value: 'yes' } });
  } else {
    document.querySelector('input[value="no"]').checked = true;
    handleModeChange({ target: { value: 'no' } });
    if (bigTasks) document.getElementById('largeTasks').value = bigTasks.join('\n');
    if (smallTasks) document.getElementById('smallTasks').value = smallTasks.join('\n');
    if (bigCount) document.getElementById('largeTaskCount').value = bigCount;
    if (smallCount) document.getElementById('smallTaskCount').value = smallCount;
    if (villagers) document.getElementById('villagerCount').value = villagers;
    if (werewolves) document.getElementById('werewolfCount').value = werewolves;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
