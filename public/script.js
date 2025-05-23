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

function setupSettingsPage() {
  const teamAInputs = document.getElementById('teamAInputs');
  const teamBInputs = document.getElementById('teamBInputs');
  const gmArea = document.getElementById('gmSettings');
  const nonGmArea = document.getElementById('nogmSettings');

  // 入力欄初期化
  teamAInputs.innerHTML = '';
  teamBInputs.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    teamAInputs.innerHTML += `<input type="text" id="teamA_${i}" placeholder="Aチーム ${i}人目"><br>`;
    teamBInputs.innerHTML += `<input type="text" id="teamB_${i}" placeholder="Bチーム ${i}人目"><br>`;
  }

  // モード変更イベント登録
  document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  // メンバー入力変更時にGM設定更新（GMモードの場合のみ）
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`teamA_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
    document.getElementById(`teamB_${i}`).addEventListener('input', () => {
      if (isGmMode()) generateGmMemberSettings();
    });
  }

  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

  // 保存設定の復元
  restoreSettings();

  // リセットボタン設定
  const resetBtn = document.getElementById('resetSettings');
  if(resetBtn) {
    resetBtn.addEventListener('click', () => {
      if(confirm('設定をリセットしてよろしいですか？')) {
        localStorage.removeItem('lolWerewolfMembers');
        localStorage.removeItem('lolWerewolfData');
        localStorage.removeItem('lolWerewolfMode');
        localStorage.removeItem('bigTasks');
        localStorage.removeItem('smallTasks');
        localStorage.removeItem('bigCount');
        localStorage.removeItem('smallCount');
        localStorage.removeItem('villagers');
        localStorage.removeItem('werewolves');
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
  // 10人全員入力済みかどうかチェック（空欄あればエラー表示）
  if (members.some(name => name.endsWith('：'))) {
    container.innerHTML = '<p style="color:red;">まずメンバーを10名すべて入力してください。</p>';
    return;
  }

  // メンバー名の並びをチームごとに分けてソート
  const teamA = members.filter(name => name.startsWith('Aチーム'));
  const teamB = members.filter(name => name.startsWith('Bチーム'));
  const sorted = [...teamA, ...teamB];
  const saved = JSON.parse(localStorage.getItem('lolWerewolfData') || '{}');

  sorted.forEach(name => {
    const id = name.replace(/\s/g, '_');
    const role = saved[name]?.role || '村人';
    const tasks = (saved[name]?.tasks || []).join('\n');
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
}

// 空欄があっても必ず全10人分取得する
function getAllMemberNames() {
  const names = [];
  for (let i = 1; i <= 5; i++) {
    const a = document.getElementById(`teamA_${i}`).value.trim();
    const b = document.getElementById(`teamB_${i}`).value.trim();
    // 空欄なら「Aチーム：」だけの文字列になるので後で判定できる
    names.push(`Aチーム：${a}`);
    names.push(`Bチーム：${b}`);
  }
  return names;
}

function handleSettingsSubmit(e) {
  e.preventDefault();
  const isGm = isGmMode();
  const members = getAllMemberNames();

  // メンバー名空欄チェック
  if (members.some(name => name.endsWith('：'))) {
    alert('メンバー名をすべて入力してください。');
    return;
  }

  if (isGm) {
    const data = {};
    let valid = true;

    members.forEach(name => {
      const id = name.replace(/\s/g, '_');
      const role = document.getElementById(`role_${id}`)?.value;
      const tasksRaw = document.getElementById(`tasks_${id}`)?.value;
      const tasks = tasksRaw ? tasksRaw.split('\n').filter(l => l.trim()) : [];
      if (!role || tasks === undefined) valid = false;
      data[name] = { role, tasks };
    });

    if (!valid) {
      alert('一部役職・タスク未入力です');
      return;
    }

    localStorage.setItem('lolWerewolfMode', 'gm');
    localStorage.setItem('lolWerewolfData', JSON.stringify(data));
    localStorage.setItem('lolWerewolfMembers', JSON.stringify(members));
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

  const totalMembers = 10;

  if (villagers + werewolves !== 5) {
    alert('各チームの人狼と村人の合計は5にしてください。');
    return;
  }

  if (bigTasks.length < totalMembers * bigCount || smallTasks.length < totalMembers * smallCount) {
    alert(`大タスクは${totalMembers * bigCount}個、小タスクは${totalMembers * smallCount}個必要です。`);
    return;
  }

  // タスク重複なし（全体で）
  if ((new Set(bigTasks)).size !== bigTasks.length || (new Set(smallTasks)).size !== smallTasks.length) {
    alert('タスク一覧に重複があります。重複のないタスクを入力してください。');
    return;
  }

  shuffle(bigTasks);
  shuffle(smallTasks);

  // チームごとに同じ役職数を割り振る
  const rolesA = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];
  const rolesB = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];

  shuffle(rolesA);
  shuffle(rolesB);

  const membersA = members.filter(name => name.startsWith('Aチーム'));
  const membersB = members.filter(name => name.startsWith('Bチーム'));

  const data = {};

  membersA.forEach((name, i) => {
    const tasks = [
      ...bigTasks.slice(i * bigCount, (i + 1) * bigCount),
      ...smallTasks.slice(i * smallCount, (i + 1) * smallCount),
    ];
    data[name] = { role: rolesA[i], tasks };
  });

  membersB.forEach((name, i) => {
    const tasks = [
      ...bigTasks.slice((i + membersA.length) * bigCount, (i + membersA.length + 1) * bigCount),
      ...smallTasks.slice((i + membersA.length) * smallCount, (i + membersA.length + 1) * smallCount),
    ];
    data[name] = { role: rolesB[i], tasks };
  });

  localStorage.setItem('lolWerewolfMode', 'nogm');
  localStorage.setItem('lolWerewolfData', JSON.stringify(data));
  localStorage.setItem('lolWerewolfMembers', JSON.stringify(members));
  // タスク・役職数保存
  localStorage.setItem('bigTasks', bigTasks.join('\n'));
  localStorage.setItem('smallTasks', smallTasks.join('\n'));
  localStorage.setItem('bigCount', bigCount);
  localStorage.setItem('smallCount', smallCount);
  localStorage.setItem('villagers', villagers);
  localStorage.setItem('werewolves', werewolves);

  alert('設定完了しました。');
  location.href = 'index.html';
}

function restoreSettings() {
  const members = JSON.parse(localStorage.getItem('lolWerewolfMembers') || '[]');
  if (members.length === 10) {
    for (let i = 0; i < 5; i++) {
      document.getElementById(`teamA_${i + 1}`).value = members[i * 2].replace('Aチーム：', '');
      document.getElementById(`teamB_${i + 1}`).value = members[i * 2 + 1].replace('Bチーム：', '');
    }
  }

  const mode = localStorage.getItem('lolWerewolfMode');
  if (mode === 'gm') {
    document.querySelector('input[value="yes"]').checked = true;
    handleModeChange({ target: { value: 'yes' } });
  } else {
    document.querySelector('input[value="no"]').checked = true;
    handleModeChange({ target: { value: 'no' } });

    document.getElementById('largeTasks').value = (localStorage.getItem('bigTasks') || '').trim();
    document.getElementById('smallTasks').value = (localStorage.getItem('smallTasks') || '').trim();
    document.getElementById('largeTaskCount').value = localStorage.getItem('bigCount') || 1;
    document.getElementById('smallTaskCount').value = localStorage.getItem('smallCount') || 1;
    document.getElementById('villagerCount').value = localStorage.getItem('villagers') || 3;
    document.getElementById('werewolfCount').value = localStorage.getItem('werewolves') || 2;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function loadMembersToDropdown() {
  const select = document.getElementById('memberSelect');
  const members = JSON.parse(localStorage.getItem('lolWerewolfMembers') || '[]');
  select.innerHTML = '';

  // チーム別にまとめて表示（Aチーム全員、次にBチーム全員）
  const teamA = members.filter(name => name.startsWith('Aチーム'));
  const teamB = members.filter(name => name.startsWith('Bチーム'));

  teamA.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  teamB.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  // 観戦者選択肢
  const observer = document.createElement('option');
  observer.value = '観戦者';
  observer.textContent = '観戦者';
  select.appendChild(observer);
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
