document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const gmModeRadios = document.querySelectorAll('input[name="gmMode"]');
  const gmYesSettings = document.getElementById('gmYesSettings');
  const gmNoSettings = document.getElementById('gmNoSettings');
  const teamAInputs = document.getElementById('teamAInputs');
  const teamBInputs = document.getElementById('teamBInputs');
  const gmRoleTaskInputs = document.getElementById('gmRoleTaskInputs');

  // ユーティリティ：メンバー入力欄を作成
  function createMemberInputs(container, team, existing = []) {
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const name = existing[i] || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.name = `${team}Member${i}`;
      input.placeholder = `${team}チーム ${i + 1}人目の名前`;
      input.value = name;
      container.appendChild(input);
    }
  }

  // ユーティリティ：GM入力欄を作成
  function createGmRoleTaskInputs(teamA, teamB) {
    gmRoleTaskInputs.innerHTML = '';
    const makeInputs = (team, label) => {
      const section = document.createElement('div');
      const title = document.createElement('h4');
      title.textContent = `${label}チーム`;
      section.appendChild(title);
      team.forEach((name, idx) => {
        const row = document.createElement('div');
        row.innerHTML = `
          <label>${name}</label>
          <select name="${label}Role${idx}">
            <option value="villager">村人</option>
            <option value="werewolf">人狼</option>
          </select><br>
          <textarea name="${label}Task${idx}" placeholder="改行で複数タスクを入力"></textarea>
        `;
        section.appendChild(row);
      });
      gmRoleTaskInputs.appendChild(section);
    };
    makeInputs(teamA, 'A');
    makeInputs(teamB, 'B');
  }

  // GMモードの切り替え表示
  function toggleGmModeDisplay() {
    const gm = document.querySelector('input[name="gmMode"]:checked').value;
    if (gm === 'yes') {
      gmYesSettings.style.display = 'block';
      gmNoSettings.style.display = 'none';
    } else {
      gmYesSettings.style.display = 'none';
      gmNoSettings.style.display = 'block';
    }
  }

  gmModeRadios.forEach(r => r.addEventListener('change', toggleGmModeDisplay));
  toggleGmModeDisplay();

  // 設定の読み込み（初期表示時）
  let savedData = {};
  try {
    const res = await fetch('/settings');
    savedData = await res.json();
  } catch (err) {
    console.log('初期設定の取得に失敗しました:', err);
  }

  const teamA = savedData.teams?.A?.map(m => m.name) || [];
  const teamB = savedData.teams?.B?.map(m => m.name) || [];

  createMemberInputs(teamAInputs, 'A', teamA);
  createMemberInputs(teamBInputs, 'B', teamB);
  createGmRoleTaskInputs(teamA, teamB);

  // フォーム送信時の処理
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gm = document.querySelector('input[name="gmMode"]:checked').value;
    const isGm = gm === 'yes';

    const A = [...teamAInputs.querySelectorAll('input')].map(input => input.value.trim()).filter(Boolean);
    const B = [...teamBInputs.querySelectorAll('input')].map(input => input.value.trim()).filter(Boolean);
    if (A.length !== 5 || B.length !== 5) return alert('A/Bチームそれぞれ5人ずつ設定してください');

    const payload = {
      gm: isGm,
      teams: {
        A: A,
        B: B
      }
    };

    if (isGm) {
      payload.gmData = { A: [], B: [] };
      ['A', 'B'].forEach(team => {
        for (let i = 0; i < 5; i++) {
          const role = form.querySelector(`select[name="${team}Role${i}"]`)?.value;
          const task = form.querySelector(`textarea[name="${team}Task${i}"]`)?.value.split('\n').filter(Boolean);
          if (!role || !task.length) {
            return alert(`GM設定：${team}チームの${i + 1}人目の役職またはタスクが未設定です`);
          }
          payload.gmData[team].push({ name: payload.teams[team][i], role, tasks: task });
        }
      });
    } else {
      const bigTasks = document.getElementById('bigTasks').value.split('\n').map(s => s.trim()).filter(Boolean);
      const smallTasks = document.getElementById('smallTasks').value.split('\n').map(s => s.trim()).filter(Boolean);
      const bigTaskCount = parseInt(document.getElementById('bigTaskCount').value, 10);
      const smallTaskCount = parseInt(document.getElementById('smallTaskCount').value, 10);
      const villagerCount = parseInt(document.getElementById('villagerCount').value, 10);
      const werewolfCount = parseInt(document.getElementById('werewolfCount').value, 10);

      if ((villagerCount + werewolfCount) !== 5) {
        return alert('村人と人狼の合計は5人にしてください');
      }

      if (bigTasks.length < 10 || smallTasks.length < 10) {
        return alert('大タスク・小タスクはそれぞれ10件以上を推奨します');
      }

      const totalMembers = 10;
      if (bigTasks.length < totalMembers * bigTaskCount || smallTasks.length < totalMembers * smallTaskCount) {
        return alert('全体のタスク数が不足しています。タスク数または入力件数を増やしてください');
      }

      payload.tasks = {
        bigTasks,
        smallTasks,
        bigTaskCount,
        smallTaskCount
      };
      payload.roles = {
        villager: villagerCount,
        werewolf: werewolfCount
      };
    }

    try {
      const res = await fetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('設定を保存しました');
        window.location.href = 'index.html';
      } else {
        const err = await res.text();
        alert('エラー: ' + err);
      }
    } catch (err) {
      alert('通信エラー: ' + err.message);
    }
  });
});