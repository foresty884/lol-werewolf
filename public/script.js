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

async function fetchMembers() {
  const res = await fetch('http://localhost:3000/api/members');
  if (!res.ok) throw new Error('Failed to fetch members');
  return await res.json();
}

async function saveMembers(members) {
  const res = await fetch('http://localhost:3000/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members }),
  });
  if (!res.ok) throw new Error('Failed to save members');
  return await res.json();
}

async function fetchSettings() {
  const res = await fetch('http://localhost:3000/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return await res.json();
}

async function saveSettings(settings) {
  const res = await fetch('http://localhost:3000/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return await res.json();
}

async function setupSettingsPage() {
  // メンバー入力欄生成
  const teamAInputs = document.getElementById('teamAInputs');
  const teamBInputs = document.getElementById('teamBInputs');
  teamAInputs.innerHTML = '';
  teamBInputs.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
    teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
  }

  // モード切り替えイベント
  document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  // メンバー入力変更時のGM設定更新
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`teamA_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
    document.getElementById(`teamB_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
  }

  // 設定復元
  try {
    const members = await fetchMembers();
    if (members.length === 10) {
      for (let i = 0; i < 5; i++) {
        document.getElementById(`teamA_${i + 1}`).value = members[i * 2].name.replace('Aチーム：', '');
        document.getElementById(`teamB_${i + 1}`).value = members[i * 2 + 1].name.replace('Bチーム：', '');
      }
    }

    const settings = await fetchSettings();
    if (settings.lolWerewolfMode === 'gm') {
      document.querySelector('input[value="yes"]').checked = true;
      handleModeChange({ target: { value: 'yes' } });
    } else {
      document.querySelector('input[value="no"]').checked = true;
      handleModeChange({ target: { value: 'no' } });

      document.getElementById('largeTasks').value = (settings.bigTasks || []).join('\n');
      document.getElementById('smallTasks').value = (settings.smallTasks || []).join('\n');
      document.getElementById('largeTaskCount').value = settings.bigCount || 1;
      document.getElementById('smallTaskCount').value = settings.smallCount || 1;
      document.getElementById('villagerCount').value = settings.villagers || 3;
      document.getElementById('werewolfCount').value = settings.werewolves || 2;
    }
  } catch (e) {
    console.error(e);
  }

  document.getElementById('settingsForm').addEventListener('submit', async e => {
    e.preventDefault();
    await handleSettingsSubmit();
  });

  const resetBtn = document.getElementById('resetSettings');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('設定をリセットしてよろしいですか？')) {
        await saveMembers([]);
        await saveSettings({});
        location.reload();
      }
    });
  }
}

function handleModeChange(e) {
  const isGm = e.target.value === 'yes';
  document.getElementById('gmSettings').style.display = isGm ? 'block' : 'none';
  document.getElementById('nogmSettings').style.display = isGm ? 'none' : 'block';
  if (isGm) generateGmMemberSettings();
}

function isGmMode() {
  return document.querySelector('input[name="gmMode"]:checked').value === 'yes';
}

function generateGmMemberSettings() {
  const container = document.getElementById('gmMemberSettings');
  container.innerHTML = '';

  const members = getAllMemberNames();
  if (members.length !== 10) {
    container.innerHTML = '<p style="color:red;">まずメンバーを10名すべて入力してください。</p>';
    return;
  }

  fetchSettings().then(saved => {
    const sorted = [...members];
    sorted.forEach(name => {
      const member = saved.members?.find(m => m.name === name) || {};
      const role = member.role || '村人';
      const tasks = (member.tasks || []).join('\n');
      const id = name.replace(/\s/g, '_');
      container.innerHTML += `
        <div>
          <h4>${name}</h4>
          <label>役職:
            <select id="role_${id}">
              <option value="村人" ${role === '村人' ? 'selected' : ''}>村人</option>
              <option value="人狼" ${role === '人狼' ? 'selected' : ''}>人狼</option>
            </select>
          </label><br>
          <label>タスク:<br>
            <textarea id="tasks_${id}" rows="3" cols="40">${tasks}</textarea>
          </label>
          <hr>
        </div>
      `;
    });
  }).catch(console.error);
}

function getAllMemberNames() {
  const names = [];
  for (let i = 1; i <= 5; i++) {
    const a = document.getElementById(`teamA_${i}`).value.trim();
    const b = document.getElementById(`teamB_${i}`).value.trim();
    if (!a || !b) return [];
    names.push(`Aチーム：${a}`);
    names.push(`Bチーム：${b}`);
  }
  return names;
}

async function handleSettingsSubmit() {
  const isGm = isGmMode();
  const membersNames = getAllMemberNames();
  if (membersNames.length !== 10) {
    alert('メンバー名をすべて入力してください。');
    return;
  }

  if (isGm) {
    const members = [];
    let valid = true;
    membersNames.forEach(name => {
      const id = name.replace(/\s/g, '_');
      const role = document.getElementById(`role_${id}`)?.value;
      const tasks = document.getElementById(`tasks_${id}`)?.value.split('\n').filter(l => l.trim());
      if (!role || tasks === undefined) valid = false;
      members.push({ name, role, tasks });
    });
    if (!valid) {
      alert('一部役職・タスク未入力です');
      return;
    }
    await saveMembers(members);
    await saveSettings({ lolWerewolfMode: 'gm', members });
    alert('設定完了しました。');
    location.href = 'index.html';
    return;
  }

  // GMなしモード
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

  // 重複チェック
  if ((new Set(bigTasks)).size !== bigTasks.length || (new Set(smallTasks)).size !== smallTasks.length) {
    alert('タスク一覧に重複があります。重複のないタスクを入力してください。');
    return;
  }

  // 役割割り当て（例）
  const rolesA = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];
  const rolesB = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];
  shuffle(rolesA);
  shuffle(rolesB);

  const members = membersNames.map(name => ({ name }));

  // 役割・タスク割当
  members.forEach((member, i) => {
    if (member.name.startsWith('Aチーム')) {
      const idx = i / 2 | 0;
      member.role = rolesA[idx];
      member.tasks = [
        ...bigTasks.slice(idx * bigCount, (idx + 1) * bigCount),
        ...smallTasks.slice(idx * smallCount, (idx + 1) * smallCount)
      ];
    } else {
      const idx = (i - 1) / 2 | 0;
      member.role = rolesB[idx];
      member.tasks = [
        ...bigTasks.slice((idx + 5) * bigCount, (idx + 6) * bigCount),
        ...smallTasks.slice((idx + 5) * smallCount, (idx + 6) * smallCount)
      ];
    }
  });

  await saveMembers(members);
  await saveSettings({
    lolWerewolfMode: 'nogm',
    bigTasks,
    smallTasks,
    bigCount,
    smallCount,
    villagers,
    werewolves,
    members,
  });

  alert('設定完了しました。');
  location.href = 'index.html';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadMembersToDropdown() {
  try {
    const members = await fetchMembers();
    const select = document.getElementById('memberSelect');
    select.innerHTML = '';

    const teamA = members.filter(m => m.name.startsWith('Aチーム'));
    const teamB = members.filter(m => m.name.startsWith('Bチーム'));

    teamA.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      select.appendChild(opt);
    });
    teamB.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      select.appendChild(opt);
    });

    const observer = document.createElement('option');
    observer.value = '観戦者';
    observer.textContent = '観戦者';
    select.appendChild(observer);
  } catch (e) {
    console.error(e);
  }
}

function handleConfirm() {
  const member = document.getElementById('memberSelect').value;
  if (member === '観戦者') {
    if (confirm('あなたは観戦者で間違いないですか？')) {
      location.href = 'observer.html';
    }
  } else {
    if (confirm(`あなたは ${member} さんで間違いないですか？`)) {
      location.href = `member.html?name=${encodeURIComponent(member)}`;
    }
  }
}

function setupBackToTopButton() {
  const backBtn = document.getElementById('backToTopBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
  }
}
