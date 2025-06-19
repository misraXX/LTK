// GASのAPIエンドポイント
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwcNo6IbAu6DyhlB3poDPZRsLeoYsRjfiE-hWeENv9QHM4vhu8wqQO4jJ9Vc8QTN14/exec';

// クエリからid取得
function getEventId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function getNoImageHtml() {
  return `<div class="no-image"><span class="no-image-icon">🖼️</span><span class="no-image-text">NO IMAGE</span></div>`;
}

function getSnsIcons(member) {
  let icons = '';
  if (member.x) icons += `<a href="${member.x}" target="_blank" class="sns-icon x-icon" title="X(Twitter)"><img src="images/x.png" width="20" height="20" alt="X"></a>`;
  if (member.twitch) icons += `<a href="${member.twitch}" target="_blank" class="sns-icon twitch-icon" title="Twitch"><img src="images/twitch.png" width="20" height="20" alt="Twitch"></a>`;
  if (member.youtube) icons += `<a href="${member.youtube}" target="_blank" class="sns-icon youtube-icon" title="YouTube"><img src="images/youtube.png" width="20" height="20" alt="YouTube"></a>`;
  return icons;
}

function createTeamHtml(team) {
  return `
    <div class="team-card">
      <div class="team-title">${team.name}</div>
      <div class="team-members">
        ${team.members.map(member => `
          <div class="member-card">
            <div class="member-icon-wrap">
              ${member.icon ? `<img src="${member.icon}" class="member-icon" alt="${member.name}">` : getNoImageHtml()}
            </div>
            <div class="member-name">${member.name}</div>
            <div class="member-sns">${getSnsIcons(member)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function formatTitleWithBr(title) {
  return title.replace(/\r?\n|\n/g, '<br>');
}

function renderEventDetail(data) {
  if (data.error) {
    document.getElementById('event-detail').innerHTML = `<div class="error">${data.error}</div>`;
    return;
  }
  document.getElementById('event-detail').innerHTML = `
    <h1 class="event-title">${formatTitleWithBr(data.title)}</h1>
    <div class="event-teams-list">
      ${data.teams.map(createTeamHtml).join('')}
    </div>
    <div class="event-streams">
      ${data.mainStream ? `<a href="${data.mainStream}" target="_blank">メイン配信</a>` : ''}
      ${data.subStream ? `<a href="${data.subStream}" target="_blank">サブ配信</a>` : ''}
    </div>
    ${data.tweet ? `<div class="event-tweet">${data.tweet}</div>` : ''}
  `;
}

async function fetchEventDetail() {
  const id = getEventId();
  if (!id) {
    document.getElementById('event-detail').innerHTML = '<div class="error">イベントIDが指定されていません。</div>';
    return;
  }
  try {
    const res = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    renderEventDetail(data);
  } catch (e) {
    document.getElementById('event-detail').innerHTML = '<div class="error">詳細データの取得に失敗しました。</div>';
  }
}

document.addEventListener('DOMContentLoaded', fetchEventDetail); 