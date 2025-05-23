document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;

  if (path.endsWith('settings.html')) {
    restoreSettings(); // 設定画面の初期化

    // フォーム送信時の動作をカスタマイズ
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // デフォルトのフォーム送信を防ぐ
        await saveSettings(); // 設定を保存
      });
    }

    // GMモードの切り替えを監視
    const gmModeRadios = document.querySelectorAll('input[name="gmMode"]');
    if (gmModeRadios) {
      gmModeRadios.forEach(radio => {
        radio.addEventListener('change', handleModeChange);
      });
    }

    // 設定リセットボタンの動作
    const resetButton = document.getElementById('resetSettings');
    if (resetButton) {
      resetButton.addEventListener('click', resetSettings);
    }
  } else if (path.endsWith('index.html') || path === '/' || path === '/index') {
    loadMembersToDropdown();
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }
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

    // teamAInputsとteamBInputsの存在確認
    if (!teamAInputs || !teamBInputs) {
      console.error('teamAInputs または teamBInputs が見つかりません');
      return;
    }

    // 初期化
    teamAInputs.innerHTML = '';
    teamBInputs.innerHTML = '';

    // メンバー一覧取得
    const membersData = await fetchFromServer('members');
    const listContainer = document.querySelector("#memberList");
    if (listContainer) {
      listContainer.innerHTML = '';
      membersData.members.forEach(member => {
        const listItem = document.createElement("li");
        listItem.textContent = member.name;
        listContainer.appendChild(listItem);
      });
    }

    // 入力欄生成
    for (let i = 1; i <= 5; i++) {
      teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
      teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
    }

    // GMモード切替イベント設定
    const gmModeRadios = document.querySelectorAll('input[name="gmMode"]');
    gmModeRadios.forEach(radio => {
      radio.addEventListener('change', handleModeChange);
    });

    // 設定フォーム送信イベント設定
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', handleSettingsSubmit);
    }

    // リセットボタン設定
    const resetBtn = document.getElementById('resetSettings');
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

    // 設定の復元
    await restoreSettings();
  } catch (error) {
    console.error('設定ページのセットアップに失敗しました:', error.message);
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
    const settings = await fetchFromServer('get-settings');

    // チームメンバーを復元
    const teamAInputs = document.getElementById('teamAInputs');
    const teamBInputs = document.getElementById('teamBInputs');
    teamAInputs.innerHTML = '';
    teamBInputs.innerHTML = '';

    (settings.teamA || []).forEach((member, index) => {
      teamAInputs.innerHTML += `<input type="text" id="teamA_${index + 1}" value="${member}" placeholder="Aチーム ${index + 1}人目"><br>`;
    });
    (settings.teamB || []).forEach((member, index) => {
      teamBInputs.innerHTML += `<input type="text" id="teamB_${index + 1}" value="${member}" placeholder="Bチーム ${index + 1}人目"><br>`;
    });

    // GMモード設定を復元
    const gmMode = settings.gmMode || 'no';
    document.querySelector(`input[name="gmMode"][value="${gmMode}"]`).checked = true;
    handleModeChange();

    if (gmMode === 'no') {
      // GM無しモードの設定を復元
      document.getElementById('largeTasks').value = (settings.largeTasks || []).join('\n');
      document.getElementById('smallTasks').value = (settings.smallTasks || []).join('\n');
      document.getElementById('largeTaskCount').value = settings.largeTaskCount || 0;
      document.getElementById('smallTaskCount').value = settings.smallTaskCount || 0;
    }
  } catch (error) {
    console.error('設定の復元に失敗しました:', error.message);
  }
}


function assignTasks(members, largeTasks, smallTasks, largeTaskCount, smallTaskCount) {
  const tasks = {};

  // メンバーをチームごとに分ける
  const teamA = members.filter((_, index) => index % 2 === 0); // 偶数インデックス
  const teamB = members.filter((_, index) => index % 2 === 1); // 奇数インデックス

  // 各チームにタスクを割り振る
  [teamA, teamB].forEach(team => {
    team.forEach(member => {
      const assignedTasks = [];
      for (let i = 0; i < largeTaskCount; i++) {
        if (largeTasks.length > 0) {
          assignedTasks.push(largeTasks.pop());
        }
      }
      for (let i = 0; i < smallTaskCount; i++) {
        if (smallTasks.length > 0) {
          assignedTasks.push(smallTasks.pop());
        }
      }
      tasks[member] = assignedTasks;
    });
  });

  return tasks;
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

async function saveSettings() {
  try {
    // フォームの値を取得
    const teamA = Array.from(document.querySelectorAll('#teamAInputs input'))
      .map(input => input.value)
      .filter(value => value.trim() !== '');
    const teamB = Array.from(document.querySelectorAll('#teamBInputs input'))
      .map(input => input.value)
      .filter(value => value.trim() !== '');

    const gmMode = document.querySelector('input[name="gmMode"]:checked').value;

    const settings = {
      teamA,
      teamB,
      gmMode,
    };

    if (gmMode === 'no') {
      // GM無しモードの設定を取得
      settings.largeTasks = document.getElementById('largeTasks').value.split('\n').map(task => task.trim()).filter(task => task);
      settings.smallTasks = document.getElementById('smallTasks').value.split('\n').map(task => task.trim()).filter(task => task);
      settings.largeTaskCount = parseInt(document.getElementById('largeTaskCount').value, 10) || 0;
      settings.smallTaskCount = parseInt(document.getElementById('smallTaskCount').value, 10) || 0;
    }

    await fetchToServer('save-settings', settings);

    // TOP画面に戻る
    window.location.href = 'index.html';
  } catch (error) {
    console.error('設定の保存に失敗しました:', error.message);
  }
}
