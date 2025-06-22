// =============================================================
// LTK 特設サイト メインスクリプト（名前空間API・安全な構文）
// =============================================================

// グローバル変数
var db;
var calendar;
var allEvents = [];

// ページの準備ができたら実行
document.addEventListener('DOMContentLoaded', function() {
    // ヘッダーを読み込む
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
            // --- ヘッダー読み込み後に高さを計算して余白を設定 ---
            const headerEl = document.getElementById('header');
            const mainContainerEl = document.querySelector('.main-container');
            if (headerEl && mainContainerEl) {
                const headerHeight = headerEl.offsetHeight;
                mainContainerEl.style.paddingTop = headerHeight + 'px';
            }
        });

    // HTMLで読み込まれた /__/firebase/init.js によって自動的に設定されるため、
    // 引数なしで初期化を呼び出す
    if (firebase.apps.length === 0) {
        firebase.initializeApp();
    }
    db = firebase.firestore();

    // カレンダー初期化
    var calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        initializeCalendarAndLoadData(calendarEl);
    }
});

// カレンダー初期化とデータ取得の実行
function initializeCalendarAndLoadData(calendarEl) {
    initializeCalendar(calendarEl);

    // フィルターのチェックボックスにイベントリスナーを設定
    var filterCheckboxes = document.querySelectorAll('.tournament-list input[type="checkbox"]');
    for (var i = 0; i < filterCheckboxes.length; i++) {
        filterCheckboxes[i].addEventListener('change', renderFilteredEvents);
    }

    loadStatsRanking();
}

// カレンダーを初期化する関数
function initializeCalendar(calendarEl) {
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        fixedWeekCount: false,
        height: 'auto',

        // --- カレンダーの日付が設定された後に実行 ---
        datesSet: function(viewInfo) {
            // 少し遅延させて、DOMの描画が完了するのを待つ
            setTimeout(() => {
                // calendarElが存在することを確認
                if (!viewInfo || !viewInfo.el) return;
                
                const calendarEl = viewInfo.el;
                const dayGridRows = calendarEl.querySelectorAll('.fc-daygrid-body tr');
                if (dayGridRows.length === 0) return;

                // 最後の行を取得
                const lastRow = dayGridRows[dayGridRows.length - 1];
                const dayCellsInLastRow = lastRow.querySelectorAll('td.fc-day');
                
                // 最後の行の全ての日付セルが「当月以外」(.fc-day-other)かチェック
                const isLastRowAllOther = Array.from(dayCellsInLastRow).every(cell => cell.classList.contains('fc-day-other'));

                // もしそうなら、最後の行を非表示にする
                if (isLastRowAllOther) {
                    lastRow.style.display = 'none';
                } else {
                    // そうでなければ、表示を元に戻す（他の月に移動した際に必要）
                    lastRow.style.display = ''; 
                }
            }, 0);
        },

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        eventClick: function(info) {
            info.jsEvent.preventDefault();
            
            const eventName = info.event.extendedProps.eventName;

            if (eventName === 'LTK') {
                // LTKイベントの場合は詳細ページに遷移
                window.location.href = `event_detail.html?id=${info.event.id}`;
            } else {
                // それ以外のイベントは、登録されているURL（本配信など）を新しいタブで開く
                if (info.event.url) {
                    window.open(info.event.url, '_blank', 'noopener,noreferrer');
                }
            }
        },
        eventContent: function(arg) {
            try {
                const props = arg.event.extendedProps;

                // --- カードのルート要素 ---
                const containerEl = document.createElement('div');
                containerEl.className = 'event-card-container';
                if(props.color) {
                    containerEl.style.borderLeftColor = props.color;
                }

                // --- イベント略称 ---
                if (props.abbr) {
                    const abbrEl = document.createElement('div');
                    abbrEl.className = 'event-abbr';
                    abbrEl.innerText = props.abbr;
                    containerEl.appendChild(abbrEl);
                }

                // --- マッチアップと時刻の行 ---
                const matchLineEl = document.createElement('div');
                matchLineEl.className = 'match-line';

                // --- マッチアップ部分 ---
                const matchEl = document.createElement('span');
                matchEl.className = 'event-match';
                
                const team1Name = props.team1Name || 'TBA';
                const team2Name = props.team2Name || 'TBA';

                // チーム1
                const team1El = document.createElement('span');
                team1El.className = 'team';
                if (props.team1Logo) {
                    team1El.innerHTML = `<img src="${props.team1Logo}" class="team-logo"> ${team1Name}`;
                } else {
                    team1El.innerText = team1Name; // ロゴがない場合は名前だけ
                }

                // vs
                const vsEl = document.createElement('span');
                vsEl.className = 'vs-separator';
                vsEl.innerText = 'vs';
                
                // チーム2
                const team2El = document.createElement('span');
                team2El.className = 'team';
                if (props.team2Logo) {
                    team2El.innerHTML = `<img src="${props.team2Logo}" class="team-logo"> ${team2Name}`;
                } else {
                    team2El.innerText = team2Name; // ロゴがない場合は名前だけ
                }
                
                matchEl.appendChild(team1El);
                matchEl.appendChild(vsEl);
                matchEl.appendChild(team2El);
                matchLineEl.appendChild(matchEl);
                containerEl.appendChild(matchLineEl);

                // --- 時刻を新しい行として追加 ---
                if (arg.event.start) {
                    const timeEl = document.createElement('div');
                    timeEl.className = 'event-time';
                    timeEl.innerText = arg.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    containerEl.appendChild(timeEl);
                }

                return { domNodes: [containerEl] };

            } catch (e) {
                console.error("eventContentでエラーが発生しました:", e, "対象イベント:", arg.event);
                const errorEl = document.createElement('div');
                errorEl.innerText = '描画エラー';
                return { domNodes: [errorEl] }; 
            }
        },

        // --- フィルター機能のためのイベントデータ ---
        events: function(fetchInfo, successCallback, failureCallback) {
            db.collection("events").get()
                .then(function(querySnapshot) {
                    console.log("Firestoreから " + querySnapshot.docs.length + " 件のイベントデータを取得しました。");
                    allEvents = [];
                    querySnapshot.forEach(function(doc) {
                        var data = doc.data();
                        var dateRaw = data['日付'];
                        var timeRaw = data['時刻'];
                        var date, time;
                        // 日付がDate型なら YYYY-MM-DD 形式に変換
                        if (dateRaw instanceof Date) {
                            date = dateRaw.getFullYear() + '-' +
                                   ('0' + (dateRaw.getMonth() + 1)).slice(-2) + '-' +
                                   ('0' + dateRaw.getDate()).slice(-2);
                        } else if (typeof dateRaw === 'string') {
                            date = dateRaw.replace(/\//g, '-');
                        } else {
                            date = null;
                        }
                        // 時刻がDate型なら HH:mm 形式に変換
                        if (timeRaw instanceof Date) {
                            time = ('0' + timeRaw.getHours()).slice(-2) + ':' +
                                   ('0' + timeRaw.getMinutes()).slice(-2);
                        } else if (typeof timeRaw === 'string') {
                            time = timeRaw;
                        } else {
                            time = '00:00';
                        }
                        var startStr = date && time ? (date + 'T' + time) : null;
                        console.log('イベント日付・時刻:', date, time, startStr);
                        if (date) {
                            allEvents.push({
                                id: doc.id,
                                title: (data['チーム①'] || 'TBA') + ' vs ' + (data['チーム②'] || 'TBA'),
                                start: startStr,
                                url: data['本配信URL'],
                                extendedProps: {
                                    eventName: data['イベント名'],     // フィルター用
                                    abbr: data['イベント略称'],         // カード表示用
                                    eventLogo: data['イベントロゴ'],
                                    site: data['配信サイト'],
                                    color: data['color'],
                                    // --- カード描画に必要なチーム情報を追加 ---
                                    team1Name: data['チーム①'],
                                    team2Name: data['チーム②'],
                                    team1Logo: data['チーム①ロゴ'],
                                    team2Logo: data['チーム②ロゴ']
                                }
                            });
                        }
                    });
                    console.log("カレンダー用に " + allEvents.length + " 件のイベントを準備しました:", allEvents);
                    successCallback(allEvents);
                })
                .catch(function(error) {
                    console.error("カレンダーイベントの読込エラー:", error);
                    failureCallback(error);
                });
        }
    });
    calendar.render();
}

// カレンダーの表示をフィルターする関数
function renderFilteredEvents() {
    if (!calendar) return;
    var activeFilters = [];
    var checkboxes = document.querySelectorAll('.tournament-list input:checked');
    for (var i = 0; i < checkboxes.length; i++) {
        activeFilters.push(checkboxes[i].value);
    }
    console.log("現在有効なフィルター:", activeFilters);

    // フィルターが選択されていない場合は全てのイベントを表示
    if (activeFilters.length === 0) {
        calendar.getEventSources().forEach(function(source) { source.remove(); });
        calendar.addEventSource(allEvents);
        console.log("フィルターなし: 全てのイベントを表示");
        return;
    }

    var filteredEvents = allEvents.filter(function(event) {
        // eventNameプロパティを使用してフィルタリング
        return event.extendedProps.eventName && activeFilters.includes(event.extendedProps.eventName);
    });
    console.log(filteredEvents.length + " 件のイベントがフィルターを通過しました:", filteredEvents);

    calendar.getEventSources().forEach(function(source) { source.remove(); });
    calendar.addEventSource(filteredEvents);
}

// FirestoreからKDAランキングを取得する関数
function loadStatsRanking() {
    var listElement = document.getElementById('kda-ranking-list');
    if (!listElement) {
        console.error("KDAランキング要素が見つかりません: kda-ranking-list");
        return;
    }

    console.log("KDAランキング読み込み開始");

    var streamerIcons = {};

    // まずstreamersコレクションからアイコン情報を取得
    db.collection("streamers").get()
        .then(function(iconSnapshot) {
            console.log("streamersから " + iconSnapshot.docs.length + " 件のアイコンデータを取得");
            
            iconSnapshot.forEach(function(doc) {
                var data = doc.data();
                var streamerName = data['メンバー名'] || data['streamerName'] || data['name'];
                var iconUrl = data['アイコン'] || data['icon'];
                
                if (streamerName && iconUrl) {
                    streamerIcons[streamerName] = iconUrl;
                    console.log("アイコン登録:", streamerName, iconUrl);
                }
            });

            // 次にstreamer_statsコレクションからランキングデータを取得
            return db.collection("streamer_stats").orderBy("KDA", "desc").limit(3).get();
        })
        .then(function(querySnapshot) {
            console.log("streamer_statsから " + querySnapshot.docs.length + " 件のランキングデータを取得");
            
            if (querySnapshot.empty) {
                listElement.innerHTML = '<li>ランキングデータがありません</li>';
                return;
            }

            listElement.innerHTML = '';
            var rank = 1;
            
            querySnapshot.forEach(function(doc) {
                var player = doc.data();
                console.log("プレイヤーデータ:", player);
                
                var playerName = player.streamerName || player.メンバー名 || player.name || 'Unknown';
                var kdaValue = player.KDA || player.kda || 0;
                var iconUrl = streamerIcons[playerName] || 'https://placehold.co/50x50';
                
                var li = document.createElement('li');
                li.innerHTML =
                    '<img src="' + iconUrl + '" class="stats-thumb" alt="' + playerName + '" onerror="this.src=\'https://placehold.co/50x50\';">' +
                    '<span class="stats-value">KDA ' + (kdaValue ? kdaValue.toFixed(1) : 'N/A') + '</span>';
                listElement.appendChild(li);
            });
        })
        .catch(function(error) {
            console.error("ランキングの読込エラー:", error);
            if (listElement) {
                listElement.innerHTML = '<li>ランキング読込エラー: ' + error.message + '</li>';
            }
        });
}