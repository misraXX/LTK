// WebApp URL（公開時のURLに差し替えてください）
const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwcNo6IbAu6DyhlB3poDPZRsLeoYsRjfiE-hWeENv9QHM4vhu8wqQO4jJ9Vc8QTN14/exec';

// テストデータ
const TEST_DATA = [
  {
    id: '1',
    date: '2025-06-20',
    time: '15:00:00',
    url: 'https://example.com/match1',
    site: 'Twitch',
    game: 'League of Legends',
    gameLogo: 'https://example.com/lol-logo.png',
    tournament: 'LTK Spring 2025',
    eventLogo: 'https://example.com/ltk-logo.png',
    title: 'LTK Spring 2025 Week 1 Day 1',
    match: 'DFM vs SG',
    teamLogo1: 'https://example.com/dfm-logo.png',
    teamLogo2: 'https://example.com/sg-logo.png',
    teams: 'DetonatioN FocusMe,Sengoku Gaming',
    participants: ['Player1', 'Player2', 'Player3'],
    jpFlag: true,
    participantImages: ['https://example.com/player1.png', 'https://example.com/player2.png']
  },
  {
    id: '2',
    date: '2025-06-25',
    time: '18:30:00',
    url: 'https://example.com/match2',
    site: 'YouTube',
    game: 'VALORANT',
    gameLogo: 'https://example.com/val-logo.png',
    tournament: 'LCP Split 1',
    eventLogo: 'https://example.com/lcp-logo.png',
    title: 'LCP Split 1 Week 1 Day 3',
    match: 'CR vs ZETA',
    teamLogo1: 'https://example.com/cr-logo.png',
    teamLogo2: 'https://example.com/zeta-logo.png',
    teams: 'Crazy Raccoon,ZETA DIVISION',
    participants: ['Player4', 'Player5', 'Player6'],
    jpFlag: true,
    participantImages: ['https://example.com/player4.png', 'https://example.com/player5.png']
  }
];

document.addEventListener('DOMContentLoaded', function() {
//   // テストデータを使用してカレンダーをレンダリング
  renderCalendar(TEST_DATA);
  
//   実際のAPIを使用する場合はこちらをコメント解除
  loadSheetData();
});

// 1. フィルター状態を取得
function getActiveFilters() {
  return Array.from(document.querySelectorAll('.tournament-list input[type="checkbox"]:checked'))
    .map(cb => cb.value);
}

// 2. フィルターに合うイベントだけ返す
function filterEvents(events, activeFilters) {
  // event.tournamentがフィルター値（例: LTK, PCS, LJL, LCK）と一致するものだけ
  return events.filter(event => activeFilters.includes(event.tournament));
}

// 3. カレンダー再描画用の関数
let allEvents = [];
function renderFilteredCalendar() {
  const activeFilters = getActiveFilters();
  const filtered = filterEvents(allEvents, activeFilters);
  renderCalendar(filtered);
}

// 4. チェックボックスにイベントリスナーを追加
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.tournament-list input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', renderFilteredCalendar);
  });
});

function loadSheetData() {
  fetch(API_ENDPOINT)
    .then(res => res.json())
    .then(data => {
      allEvents = data;
      renderFilteredCalendar();
    })
    .catch(err => console.error("取得エラー", err));
}

function renderCalendar(events) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error('Calendar element not found');
    return;
  }

  console.log('Mapping events:', events);
  const mappedEvents = events.map(event => {
    const mappedEvent = {
      id: event.id,
      title: `${event.match} (${event.tournament})`,
      start: `${event.date}T${event.time}`,
      url: event.url,
      extendedProps: {
        site: event.site,
        game: event.game,
        gameLogo: event.gameLogo,
        tournament: event.tournament,
        eventLogo: event.eventLogo,
        teams: event.teams,
        teamLogo1: event.teamLogo1,
        teamLogo2: event.teamLogo2,
        participants: event.participants,
        jpFlag: event.jpFlag,
        participantImages: event.participantImages
      }
    };
    console.log('Mapped event:', mappedEvent);
    return mappedEvent;
  });

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    events: mappedEvents,
    eventClick: function(info) {
      info.jsEvent.preventDefault();
      // イベントIDをクエリに付けて詳細ページへ遷移
      if (info.event.id) {
        window.location.href = `detail.html?id=${encodeURIComponent(info.event.id)}`;
      }
    },
    eventContent: function(arg) {
      const event = arg.event;
      const props = event.extendedProps;
      
      return {
        html: `
          <div class="fc-event-main-content">
            <div class="event-title">${event.title}</div>
            <div class="event-time">${event.start.toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'})}</div>
            <div class="event-site">${props.site}</div>
          </div>
        `
      };
    }
  });

  calendar.render();
}