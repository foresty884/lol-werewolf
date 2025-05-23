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

async function fetchFromServer(endpoint, options = {}) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(error.error || 'Unknown server error');
    }

    return await response.json();
  } catch (error) {
    console.error('Server communication error:', error.message);
    alert(`通信エラー: ${error.message}`);
    throw error;
  }
}

async function setupSettingsPage() {
  try {
    const teamAInputs = document.getElementById('teamAInputs');
    const teamBInputs = document.getElementById('teamBInputs');
    const memberListContainer = document.querySelector('#memberList');
    const resetBtn = document.getElementById('resetSettings');

    teamAInputs.innerHTML = '';
    teamBInputs.innerHTML = '';
    memberListContainer.innerHTML = '';

    const membersData = await fetchFromServer('members');

    membersData.members.forEach(member => {
      const listItem = document.createElement('li');
      listItem.textContent = member.name;
      memberListContainer.appendChild(listItem);
    });

    for (let i = 1; i <= 5; i++) {
      teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
      teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
    }

    document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
      radio.addEventListener('change', handleModeChange);
    });

    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('設定をリセットしてよろしいですか？')) {
          try {
            await fetchFromServer('reset-settings', { method: 'DELETE' });
            location.reload();
          } catch (error) {
            alert('リセットに失敗しました: ' + error.message);
          }
        }
      });
    }

    await restoreSettings();
  } catch (error) {
    console.error('Failed to set up settings page:', error.message);
  }
}

function handleModeChange(e) {
  const isGm = e.target.value === 'yes';
  document.getElementById('gmSettings').style.display = isGm ? 'block' : 'none';
  document.getElementById('nogmSettings').style.display = isGm ? 'none' : 'block';
  if (isGm) {
    generateGmMemberSettings();
  }
}

function isGmMode() {
  return document.querySelector('input[name="gmMode"]:checked').value === 'yes';
}

async function generateGmMemberSettings() {
  const container = document.getElementById('gmMemberSettings');
  container.innerHTML = '';

  try {
    const members = await getAllMemberNames();
    if (members.some(name => name.endsWith('：'))) {
      container.innerHTML = '<p style="color:red;">まずメンバーを10名すべて入力してください。</p>';
      return;
    }

    const saved = await fetchFromServer('members');

    members.forEach(name => {
      const id = name.replace(/\s/g, '_');
      const data = saved.members.find(member => member.name === name) || { role: '村人', tasks: [] };
      const tasks = data.tasks.join('\n');
      container.innerHTML += `
        <div>
          <h4>${name}</h4>
          <label>役職:
            <select id="role_${id}">
              <option value="村人" ${data.role === '村人' ? 'selected' : ''}>村人</option>
              <option value="人狼" ${data.role === '人狼' ? 'selected' : ''}>人狼</option>
            </select>
          </label><br>
          <label>タスク:<br>
            <textarea id="tasks_${id}" rows="3" cols="40">${tasks}</textarea>
          </label>
          <hr>
        </div>
      `;
    });
  } catch (error) {
    console.error('Failed to generate GM member settings:', error.message);
  }
}

async function getAllMemberNames() {
  const names = [];
  for (let i = 1; i <= 5; i++) {
    const a = document.getElementById(`teamA_${i}`).value.trim();
    const b = document.getElementById(`teamB_${i}`).value.trim();
    if (a) names.push(`Aチーム：${a}`);
    if (b) names.push(`Bチーム：${b}`);
  }
  return names;
}

async function handleSettingsSubmit(e) {
  e.preventDefault();

  try {
    const isGm = isGmMode();
    const members = await getAllMemberNames();

    if (members.some(name => name.endsWith('：'))) {
      alert('メンバー名をすべて入力してください。');
      return;
    }

    const data = members.reduce((acc, name) => {
      const id = name.replace(/\s/g, '_');
      const role = document.getElementById(`role_${id}`)?.value;
      const tasksRaw = document.getElementById(`tasks_${id}`)?.value;
      const tasks = tasksRaw ? tasksRaw.split('\n').filter(Boolean) : [];
      acc[name] = { role, tasks };
      return acc;
    }, {});

    await fetchFromServer('settings', {
      method: 'POST',
      body: JSON.stringify({ mode: isGm ? 'gm' : 'nogm', members: data }),
    });

    alert('設定完了しました。');
    location.href = 'index.html';
  } catch (error) {
    alert('設定の保存に失敗しました: ' + error.message);
  }
}

async function restoreSettings() {
  try {
    const settings = await fetchFromServer('settings');

    if (settings.settings.mode === 'gm') {
      document.querySelector('input[value="yes"]').checked = true;
      handleModeChange({ target: { value: 'yes' } });
    } else {
      document.querySelector('input[value="no"]').checked = true;
      handleModeChange({ target: { value: 'no' } });
    }

    Object.entries(settings.settings.members).forEach(([name, value], index) => {
      const inputId = name.startsWith('Aチーム') ? `teamA_${index + 1}` : `teamB_${index + 1}`;
      const inputElement = document.getElementById(inputId);
      if (inputElement) {
        inputElement.value = name.split('：')[1];
      }
    });
  } catch (error) {
    console.error('Error restoring settings:', error.message);
  }
}

async function loadMembersToDropdown() {
  const select = document.getElementById('memberSelect');

  try {
    const membersData = await fetchFromServer('members');
    select.innerHTML = '';

    [...membersData.members.filter(member => member.name.startsWith('Aチーム')),
     ...membersData.members.filter(member => member.name.startsWith('Bチーム'))].forEach(member => {
      const opt = document.createElement('option');
      opt.value = member.name;
      opt.textContent = member.name;
      select.appendChild(opt);
    });

    const observer = document.createElement('option');
    observer.value = '観戦者';
    observer.textContent = '観戦者';
    select.appendChild(observer);
  } catch (error) {
    console.error('Failed to load members into dropdown:', error.message);
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
