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

// サーバーとの通信
async function fetchFromServer(endpoint, options = {}) {
  const response = await fetch(`/api/${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || 'Unknown server error');
    } catch {
      throw new Error('Invalid server response format');
    }
  }

  return response.json();
}

// 設定ページのセットアップ
async function setupSettingsPage() {
  const teamAInputs = document.getElementById('teamAInputs');
  const teamBInputs = document.getElementById('teamBInputs');

  teamAInputs.innerHTML = '';
  teamBInputs.innerHTML = '';

  fetch("/api/settings")
  .then(response => response.json())
  .then(data => {
    if (data.success && data.settings) {
      document.querySelector("#yourInputElement").value = data.settings.yourField;
      // 他のフィールドも同様に設定
    }
  })
  .catch(error => console.error("Error fetching settings:", error));

  for (let i = 1; i <= 5; i++) {
    teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
    teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
  }

  document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

  const resetBtn = document.getElementById('resetSettings');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('設定をリセットしてよろしいですか？')) {
        try {
          await fetchFromServer('reset-settings', { method: 'DELETE' }); // DELETE メソッドを使用
          location.reload();
        } catch (error) {
          alert('リセットに失敗しました: ' + error.message);
        }
      }
    });
  }

  try {
    await restoreSettings(); // 初期設定を復元
  } catch (error) {
    console.error('Failed to restore settings:', error.message);
  }
}

// モード切替
function handleModeChange(e) {
  const isGm = e.target.value === 'yes';
  document.getElementById('gmSettings').style.display = isGm ? 'block' : 'none';
  document.getElementById('nogmSettings').style.display = isGm ? 'none' : 'block';
  if (isGm) generateGmMemberSettings();
}

function isGmMode() {
  return document.querySelector('input[name="gmMode"]:checked').value === 'yes';
}

// GMモードのメンバー設定生成
async function generateGmMemberSettings() {
  const container = document.getElementById('gmMemberSettings');
  container.innerHTML = '';

  const members = await getAllMemberNames();
  if (members.some(name => name.endsWith('：'))) {
    container.innerHTML = '<p style="color:red;">まずメンバーを10名すべて入力してください。</p>';
    return;
  }

  const saved = await fetchFromServer('members');

  members.forEach(name => {
    const id = name.replace(/\s/g, '_');
    const data = saved[name] || { role: '村人', tasks: [] };
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
}

// メンバー名の取得
async function getAllMemberNames() {
  const names = [];
  for (let i = 1; i <= 5; i++) {
    const a = document.getElementById(`teamA_${i}`).value.trim();
    const b = document.getElementById(`teamB_${i}`).value.trim();
    names.push(`Aチーム：${a}`);
    names.push(`Bチーム：${b}`);
  }
  return names;
}

// 設定保存
async function handleSettingsSubmit(e) {
  e.preventDefault();
  const isGm = isGmMode();
  const members = await getAllMemberNames();

  if (members.some(name => name.endsWith('：'))) {
    alert('メンバー名をすべて入力してください。');
    return;
  }

  const data = {};
  members.forEach(name => {
    const id = name.replace(/\s/g, '_');
    const role = document.getElementById(`role_${id}`)?.value;
    const tasksRaw = document.getElementById(`tasks_${id}`)?.value;
    const tasks = tasksRaw ? tasksRaw.split('\n').filter(Boolean) : [];
    data[name] = { role, tasks };
  });

  try {
    await fetchFromServer('save-settings', { // エンドポイントを一致させる
      method: 'POST',
      body: JSON.stringify({ mode: isGm ? 'gm' : 'nogm', members: data }),
    });
    alert('設定完了しました。');
    location.href = 'index.html';
  } catch (error) {
    alert('設定の保存に失敗しました: ' + error.message);
  }
}

// 初期設定の復元
async function restoreSettings() {
  try {
    const settings = await fetchFromServer('settings');

    if (settings.mode === 'gm') {
      document.querySelector('input[value="yes"]').checked = true;
      handleModeChange({ target: { value: 'yes' } });
    } else {
      document.querySelector('input[value="no"]').checked = true;
      handleModeChange({ target: { value: 'no' } });
    }

    settings.members.forEach((name, i) => {
      const inputId = name.startsWith('Aチーム') ? `teamA_${i + 1}` : `teamB_${i + 1}`;
      const inputElement = document.getElementById(inputId);
      if (inputElement) {
        inputElement.value = name.split('：')[1];
      }
    });
  } catch (error) {
    console.error('Error restoring settings:', error.message);
  }
}

// メンバー一覧をドロップダウンにロード
async function loadMembersToDropdown() {
  const select = document.getElementById('memberSelect');
  const members = await fetchFromServer('members');
  select.innerHTML = '';

  [...members.filter(name => name.startsWith('Aチーム')), 
   ...members.filter(name => name.startsWith('Bチーム'))].forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  const observer = document.createElement('option');
  observer.value = '観戦者';
  observer.textContent = '観戦者';
  select.appendChild(observer);
}

// メンバー選択確認
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

// トップに戻るボタンの設定
function setupBackToTopButton() {
  const backBtn = document.getElementById('backToTopBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
  }
}
