// メンバー名をフォームから取得
function getAllMemberNames() {
  const names = [];
  for (let i = 1; i <= 5; i++) {
    const a = document.getElementById(`teamA_${i}`).value.trim();
    const b = document.getElementById(`teamB_${i}`).value.trim();
    if (!a || !b) return null; // 空欄あるとnull
    names.push(`Aチーム：${a}`);
    names.push(`Bチーム：${b}`);
  }
  return names;
}

// GMモード判定
function isGmMode() {
  return document.querySelector('input[name="gmMode"]:checked')?.value === 'yes';
}

// シャッフル関数
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// サーバーにメンバー情報を保存
async function saveMembersToServer(data) {
  const res = await fetch('/api/members/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('メンバー情報保存失敗');
}

// メンバー情報をサーバーから取得
async function fetchMembersFromServer() {
  const res = await fetch('/api/members');
  if (!res.ok) throw new Error('メンバー情報取得失敗');
  return await res.json();
}

// メンバー情報をフォームに反映（GMモード用）
async function renderMembersForm() {
  const container = document.getElementById('gmMemberSettings');
  container.innerHTML = '';
  try {
    const members = await fetchMembersFromServer();
    members.forEach(({ name, role, tasks }) => {
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
            <textarea id="tasks_${id}" rows="3" cols="40">${(tasks || []).join('\n')}</textarea>
          </label>
          <hr>
        </div>
      `;
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red;">メンバー情報の読み込みに失敗しました: ${err.message}</p>`;
  }
}

// 設定フォーム送信処理
async function handleSettingsSubmit(e) {
  e.preventDefault();

  const members = getAllMemberNames();
  if (!members) {
    alert('メンバー名をすべて入力してください。');
    return;
  }

  if (isGmMode()) {
    // GMモードは役職・タスク手動設定をサーバーへ保存
    const data = {};
    let valid = true;
    members.forEach(name => {
      const id = name.replace(/\s/g, '_');
      const roleElem = document.getElementById(`role_${id}`);
      const tasksElem = document.getElementById(`tasks_${id}`);
      if (!roleElem || !tasksElem) valid = false;
      const role = roleElem.value;
      const tasks = tasksElem.value.trim().split('\n').filter(l => l.trim());
      if (!role || tasks.length === 0) valid = false;
      data[name] = { role, tasks };
    });
    if (!valid) {
      alert('役職・タスクをすべて正しく入力してください。');
      return;
    }
    try {
      await saveMembersToServer(data);
      alert('設定をサーバーに保存しました。');
      location.href = 'index.html';
    } catch (err) {
      alert('サーバーへの保存に失敗しました。');
      console.error(err);
    }
    return;
  }

  // --- GMなしモード ---
  // 役職とタスクを自動割当しサーバーへ保存

  try {
    // タスク情報取得
    const bigTasks = document.getElementById('largeTasks').value.trim().split('\n').filter(Boolean);
    const smallTasks = document.getElementById('smallTasks').value.trim().split('\n').filter(Boolean);
    const bigCount = Number(document.getElementById('largeTaskCount').value);
    const smallCount = Number(document.getElementById('smallTaskCount').value);
    const villagers = Number(document.getElementById('villagerCount').value);
    const werewolves = Number(document.getElementById('werewolfCount').value);

    if (villagers + werewolves !== 5) {
      alert('各チームの村人と人狼の合計は5にしてください。');
      return;
    }

    const totalMembers = 10;
    if (bigTasks.length < totalMembers * bigCount || smallTasks.length < totalMembers * smallCount) {
      alert(`大タスクは${totalMembers * bigCount}個、小タスクは${totalMembers * smallCount}個必要です。`);
      return;
    }

    if ((new Set(bigTasks)).size !== bigTasks.length || (new Set(smallTasks)).size !== smallTasks.length) {
      alert('タスクに重複があります。重複のないタスクを入力してください。');
      return;
    }

    shuffle(bigTasks);
    shuffle(smallTasks);

    // 役職をチームごとに作成・シャッフル
    const rolesA = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];
    const rolesB = [...Array(villagers).fill('村人'), ...Array(werewolves).fill('人狼')];
    shuffle(rolesA);
    shuffle(rolesB);

    const membersA = members.filter(m => m.startsWith('Aチーム'));
    const membersB = members.filter(m => m.startsWith('Bチーム'));

    // 自動割当て
    const data = {};
    membersA.forEach((name, i) => {
      const tasks = [
        ...bigTasks.slice(i * bigCount, (i + 1) * bigCount),
        ...smallTasks.slice(i * smallCount, (i + 1) * smallCount),
      ];
      data[name] = { role: rolesA[i], tasks };
    });
    membersB.forEach((name, i) => {
      const offset = membersA.length;
      const tasks = [
        ...bigTasks.slice((i + offset) * bigCount, (i + offset + 1) * bigCount),
        ...smallTasks.slice((i + offset) * smallCount, (i + offset + 1) * smallCount),
      ];
      data[name] = { role: rolesB[i], tasks };
    });

    await saveMembersToServer(data);

    alert('設定をサーバーに保存しました。');
    location.href = 'index.html';
  } catch (err) {
    alert('設定の保存に失敗しました。');
    console.error(err);
  }
}

// メンバー選択プルダウンにMongoDBから取得したメンバーを設定
async function loadMembersToDropdown() {
  const select = document.getElementById('memberSelect');
  select.innerHTML = '';
  try {
    const members = await fetchMembersFromServer();
    members.forEach(({ name }) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    const observerOpt = document.createElement('option');
    observerOpt.value = '観戦者';
    observerOpt.textContent = '観戦者';
    select.appendChild(observerOpt);
  } catch (err) {
    alert('メンバーの取得に失敗しました。');
    console.error(err);
  }
}

// 確認ボタン処理
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

// ページロード時初期化
window.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;

  if (path.endsWith('settings.html')) {
    // GMモード切り替え時の動作設定
    document.querySelectorAll('input[name="gmMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (isGmMode()) {
          document.getElementById('gmSettings').style.display = 'block';
          document.getElementById('nogmSettings').style.display = 'none';
          renderMembersForm();
        } else {
          document.getElementById('gmSettings').style.display = 'none';
          document.getElementById('nogmSettings').style.display = 'block';
        }
      });
    });

    // 初期表示のGM設定に応じてフォーム表示
    if (isGmMode()) {
      document.getElementById('gmSettings').style.display = 'block';
      document.getElementById('nogmSettings').style.display = 'none';
      renderMembersForm();
    } else {
      document.getElementById('gmSettings').style.display = 'none';
      document.getElementById('nogmSettings').style.display = 'block';
    }

    // 設定フォーム送信イベント設定
    const form = document.getElementById('settingsForm');
    if (form) form.addEventListener('submit', handleSettingsSubmit);

  } else if (path.endsWith('select.html')) {
    loadMembersToDropdown();
    const btn = document.getElementById('confirmBtn');
    if (btn) btn.addEventListener('click', handleConfirm);
  }
});
