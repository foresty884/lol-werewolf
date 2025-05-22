// 名前一覧を取得してドロップダウンに表示
document.addEventListener("DOMContentLoaded", async () => {
  const playerSelect = document.getElementById("player-select");
  if (playerSelect) {
    const res = await fetch("/api/players");
    const data = await res.json();
    data.players.forEach(player => {
      const option = document.createElement("option");
      option.value = player.name;
      option.textContent = `${player.team}チーム：${player.name}`;
      playerSelect.appendChild(option);
    });

    const observerOption = document.createElement("option");
    observerOption.value = "観戦者";
    observerOption.textContent = "観戦者";
    playerSelect.appendChild(observerOption);
  }

  // メンバー情報表示ページ
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  if (name && location.pathname.includes("member.html")) {
    const res = await fetch(`/api/player/${name}`);
    const data = await res.json();
    document.getElementById("member-name").textContent = name;
    document.getElementById("role").textContent = data.role;
    const largeList = document.getElementById("large-tasks");
    const smallList = document.getElementById("small-tasks");
    data.largeTasks.forEach(task => {
      const li = document.createElement("li");
      li.textContent = task;
      largeList.appendChild(li);
    });
    data.smallTasks.forEach(task => {
      const li = document.createElement("li");
      li.textContent = task;
      smallList.appendChild(li);
    });
  }

  // 観戦者ページ表示
  if (location.pathname.includes("observer.html")) {
    const res = await fetch("/api/players");
    const data = await res.json();
    const aBody = document.querySelector("#a-team-table tbody");
    const bBody = document.querySelector("#b-team-table tbody");

    data.players.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.role}</td>
        <td>${p.largeTasks.join("<br>")}</td>
        <td>${p.smallTasks.join("<br>")}</td>
      `;
      (p.team === "A" ? aBody : bBody).appendChild(row);
    });
  }

  // 設定画面送信処理
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async e => {
      e.preventDefault();

      const form = new FormData(settingsForm);
      const payload = {
        aTeam: form.getAll("aTeam[]").filter(n => n.trim()),
        bTeam: form.getAll("bTeam[]").filter(n => n.trim()),
        gmMode: form.get("gmMode") === "true"
      };

      if (payload.gmMode) {
        alert("現在、GMモードは未実装です。");
        return;
      }

      payload.largeTasks = form.get("largeTasks").split("\n").map(s => s.trim()).filter(Boolean);
      payload.smallTasks = form.get("smallTasks").split("\n").map(s => s.trim()).filter(Boolean);
      payload.largeCount = parseInt(form.get("largeCount"));
      payload.smallCount = parseInt(form.get("smallCount"));
      payload.villagerCount = parseInt(form.get("villagerCount"));
      payload.werewolfCount = parseInt(form.get("werewolfCount"));

      if (payload.villagerCount + payload.werewolfCount !== 5) {
        alert("村人と人狼の人数合計は必ず5にしてください。");
        return;
      }

      const totalMembers = payload.aTeam.length + payload.bTeam.length;
      if (totalMembers !== 10) {
        alert("A/Bチームの合計人数が10人になるようにしてください。");
        return;
      }

      if (payload.largeTasks.length < totalMembers * payload.largeCount ||
          payload.smallTasks.length < totalMembers * payload.smallCount) {
        alert("タスク数が足りません。タスクを増やしてください。");
        return;
      }

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.location.href = "index.html";
      } else {
        alert("設定に失敗しました");
      }
    });
  }
});