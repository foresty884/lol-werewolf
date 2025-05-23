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

  // メンバー情報を取得
  try {
    const members = await fetchFromServer('members');
    members.forEach(member => {
      const inputId = member.team === 'A' ? `teamA_${member.no}` : `teamB_${member.no}`;
      const input = document.getElementById(inputId);
      if (input) {
        input.value = member.name;
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error.message);
  }

  // 設定情報を取得
  try {
    const settings = await fetchFromServer('settings');
    document.querySelector(`input[name="gmMode"][value="${settings.mode}"]`).checked = true;
    handleModeChange({ target: { value: settings.mode } });

    if (settings.mode === 'nogm') {
      document.getElementById('bigTaskCount').value = settings.bigtask;
      document.getElementById('smallTaskCount').value = settings.smalltask;
    }
  } catch (error) {
    console.error('Error fetching settings:', error.message);
  }

  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

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
}

// モード切替
function handleModeChange(e) {
  const isGm = e.target.value === 'yesgm';
  document.getElementById('gmSettings').style.display = isGm ? 'block' : 'none';
  document.getElementById('nogmSettings').style.display = isGm ? 'none' : 'block';
  if (isGm) generateGmMemberSettings();
}

// 設定保存
async function handleSettingsSubmit(e) {
  e.preventDefault();
  const isGm = document.querySelector('input[name="gmMode"]:checked').value === 'yesgm';

  const teamA = [];
  const teamB = [];

  for (let i = 1; i <= 5; i++) {
    const nameA = document.getElementById(`teamA_${i}`).value.trim();
    const nameB = document.getElementById(`teamB_${i}`).value.trim();
    if (nameA) teamA.push({ no: i, name: nameA });
    if (nameB) teamB.push({ no: i + 5, name: nameB });
  }

  const payload = {
    mode: isGm ? 'yesgm' : 'nogm',
    members: [...teamA, ...teamB],
    bigtask: isGm ? null : document.getElementById('bigTaskCount').value,
    smalltask: isGm ? null : document.getElementById('smallTaskCount').value,
  };

  try {
    await fetchFromServer('save-settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    alert('設定完了しました。');
    location.href = 'index.html';
  } catch (error) {
    alert('設定の保存に失敗しました: ' + error.message);
  }
}

// メンバー一覧をドロップダウンにロード
async function loadMembersToDropdown() {
  try {
    const members = await fetchFromServer('members');
    const select = document.getElementById('memberSelect');
    select.innerHTML = '';

    members.forEach(member => {
      const option = document.createElement('option');
      option.value = member.name;
      option.textContent = `${member.team}チーム ${member.no}: ${member.name}`;
      select.appendChild(option);
    });

    const observer = document.createElement('option');
    observer.value = '観戦者';
    observer.textContent = '観戦者';
    select.appendChild(observer);
  } catch (error) {
    console.error('Error loading members to dropdown:', error.message);
  }
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
