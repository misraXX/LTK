// Firebaseの初期化
if (firebase.apps.length === 0) {
    // Firebase Hostingの予約済みURLから設定を読み込んで初期化
    fetch('/__/firebase/init.json').then(async response => {
      await response.json();
      firebase.initializeApp(response.json());
    });
}
const db = firebase.firestore();


document.addEventListener('DOMContentLoaded', () => {
    // ヘッダーを読み込む
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            const headerElement = document.getElementById('header');
            if (headerElement) {
                headerElement.innerHTML = data;
                // ヘッダーを固定するためのスタイルを適用
                headerElement.style.position = 'fixed';
                headerElement.style.top = '0';
                headerElement.style.left = '0';
                headerElement.style.right = '0';
                headerElement.style.zIndex = '1000';

                // bodyにヘッダー分のpaddingを追加
                setTimeout(() => {
                    const headerHeight = headerElement.offsetHeight;
                    document.body.style.paddingTop = headerHeight + 'px';
                }, 100);
            }
        });
        
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (eventId) {
        loadEventDetails(eventId);
    } else {
        document.getElementById('event-title').innerText = 'イベントIDが見つかりません';
    }
});

async function loadEventDetails(eventId) {
    try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            document.getElementById('event-title').innerText = 'イベントが見つかりません';
            return;
        }
        const eventData = eventDoc.data();
        const detailCard = document.querySelector('.event-detail-card');

        // URLから配信サイトを判別するヘルパー関数
        const getStreamPlatform = (url) => {
            if (!url) return null;
            if (url.includes('twitch.tv')) return 'twitch';
            if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
            return null; // or a default icon
        };

        const mainStreamUrl = eventData['本配信URL'];
        const subStreamUrl = eventData['サブ配信URL'];
        const mainStreamPlatform = getStreamPlatform(mainStreamUrl);
        const subStreamPlatform = getStreamPlatform(subStreamUrl);

        let streamsHTML = '';
        if (mainStreamPlatform) {
            streamsHTML += `本配信：<a href="${mainStreamUrl}" target="_blank" rel="noopener noreferrer"><img src="images/${mainStreamPlatform}.png" class="sns-icon"></a>`;
        }
        if (subStreamPlatform) {
            streamsHTML += ` サブ配信：<a href="${subStreamUrl}" target="_blank" rel="noopener noreferrer"><img src="images/${subStreamPlatform}.png" class="sns-icon"></a>`;
        }
        
        detailCard.innerHTML = `
            <h1 id="event-title">${eventData['タイトル'] || 'タイトル未設定'}</h1>
            <div class="event-streams">${streamsHTML}</div>
            <div class="event-meta">
                <span id="event-date">${formatDate(eventData['日付'])}</span>
                <span id="event-time">${formatTime(eventData['時刻'])}</span>
            </div>
        `;

        // 3. 参加チームの選手情報を取得・表示
        if (eventData['参加チーム']) {
            const teamAbbreviations = eventData['参加チーム'].split(',').map(t => t.trim());
            const teamsContainer = document.getElementById('teams-container');

            const streamersSnapshot = await db.collection('streamers').where('略称', 'in', teamAbbreviations).get();
            
            const streamersByTeam = {};
            streamersSnapshot.forEach(doc => {
                const streamerData = doc.data();
                const teamName = streamerData['チーム名'];
                if (!streamersByTeam[teamName]) {
                    streamersByTeam[teamName] = [];
                }
                streamersByTeam[teamName].push(streamerData);
            });

            for (const teamName in streamersByTeam) {
                const teamBlock = document.createElement('div');
                teamBlock.className = 'team-card';
                
                const teamHeader = document.createElement('div');
                teamHeader.className = 'team-header';
                teamHeader.innerHTML = `<h2 class="team-title">${teamName}</h2>`;
                teamBlock.appendChild(teamHeader);

                // 選手を 'CORE' と 'NEXT' でグループ化
                const playersByCategory = { CORE: [], NEXT: [] };
                streamersByTeam[teamName].forEach(player => {
                    const category = player['COREorNEXT'];
                    if (category === 'CORE' || category === 'NEXT') {
                        playersByCategory[category].push(player);
                    }
                });

                // カテゴリごとにメンバーリストを生成
                ['CORE', 'NEXT'].forEach(category => {
                    const players = playersByCategory[category];
                    if (players.length > 0) {
                        const membersContainer = document.createElement('div');
                        membersContainer.className = 'team-members-container';

                        const categorySpan = document.createElement('span');
                        categorySpan.className = 'team-category';
                        categorySpan.innerText = category;
                        membersContainer.appendChild(categorySpan);

                        const membersList = document.createElement('div');
                        membersList.className = 'team-members';
                        
                        players.forEach(streamer => {
                            const memberCard = document.createElement('div');
                            memberCard.className = 'member-card';
                            
                            const memberIcon = streamer['アイコン'] || 'https://placehold.co/100x100';
                            const memberName = streamer['メンバー名'] || 'Unknown';
                            const memberRole = streamer['ロール'] || '';

                            memberCard.innerHTML = `
                                <div class="member-icon-wrap">
                                    <img src="${memberIcon}" alt="${memberName}" class="member-icon">
                                </div>
                                <span class="member-name">${memberName}</span>
                                <span class="member-role">${memberRole}</span>
                                <div class="member-sns">
                                    ${createSnsLink(streamer['X（旧Twitter）'], 'x')}
                                    ${createSnsLink(streamer['YouTubeチャンネル'], 'youtube')}
                                    ${createSnsLink(streamer['Twitchチャンネル'], 'twitch')}
                                </div>
                            `;
                            membersList.appendChild(memberCard);
                        });

                        membersContainer.appendChild(membersList);
                        teamBlock.appendChild(membersContainer);
                    }
                });

                teamsContainer.appendChild(teamBlock);
            }
        }

        // 4. イベントツイートを埋め込む
        if (eventData['イベントツイートのURL']) {
            const tweetContainer = document.getElementById('event-tweet-container');
            const tweetId = eventData['イベントツイートのURL'].split('/').pop();
            
            if (window.twttr) {
                window.twttr.widgets.createTweet(tweetId, tweetContainer, {
                    theme: 'dark',
                    align: 'center'
                });
            }
        }

    } catch (error) {
        console.error("イベント詳細の読み込みエラー:", error);
        document.querySelector('.event-detail-card').innerHTML = '<h1>情報の読み込みに失敗しました</h1>';
    }
}

function createSnsLink(url, platform) {
    if (!url) return '';
    // 画像パスを修正
    const iconSrc = `images/${platform}.png`;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${iconSrc}" alt="${platform}" class="sns-icon"></a>`;
}

function formatDate(date) {
    if (!date) return '日付未設定';
    
    const d = (date.toDate) ? date.toDate() : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

    return `${year}/${month}/${day} (${dayOfWeek})`;
}

function formatTime(time) {
    if (!time) return '時刻未設定';

    const d = (time.toDate) ? time.toDate() : new Date(`1970-01-01T${time}`);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
} 