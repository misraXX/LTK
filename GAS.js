function doGet(e) {
    const id = e?.parameter?.id;
    const data = id ? getEventDetail(id) : getEventList();
  
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 📅 一覧（カレンダー）用データ出力
  function getEventList() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("大会日程");
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
  
    return rows.map(row => ({
      id: row[0],
      date: formatDate(row[1]),
      time: formatTime(row[2]),
      url: row[3],
      site: row[4],
      game: row[5],
      gameLogo: row[6],
      tournament: row[7],
      eventLogo: row[8],
      title: row[9],
      match: row[10],
      teamLogo1: row[11],
      teamLogo2: row[12],
      teams: row[13],
      participants: row[14] ? row[14].toString().split(",").map(s => s.trim()) : [],
      jpFlag: row[15],
      participantImages: row[16] ? row[16].toString().split(",").map(s => s.trim()) : []
    }));
  }
  
  
  // 📄 詳細ページ用データ出力
  function getEventDetail(eventId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eventSheet = ss.getSheetByName("イベント詳細");
    const eventValues = eventSheet.getDataRange().getValues();
  
    // イベント行の取得
    const eventRow = eventValues.find((row, i) => i > 0 && row[0] == eventId);
    if (!eventRow) return { error: "Event not found" };
  
    const eventObj = {
      eventId: eventId,
      title: eventRow[1],
      tweet: eventRow[2],
      mainStream: eventRow[3],
      subStream: eventRow[4],
      teams: []
    };
  
    // チーム情報の読み取り（F〜J列 = index 5〜9）
    const teamCells = eventRow.slice(5, 10); // 5列（最大チーム数）
  
    for (const cell of teamCells) {
      if (!cell) continue;
  
      const parts = cell.split("|");
      const teamName = parts[0]?.trim();
      if (!teamName) continue;
  
      const members = parts.slice(1).map(m => {
        const [name, icon, x, youtube, twitch] = m.split(",");
        return {
          name: name?.trim() || "",
          icon: icon?.trim() || "",
          x: x?.trim() || "",
          youtube: youtube?.trim() || "",
          twitch: twitch?.trim() || ""
        };
      });
  
      eventObj.teams.push({
        name: teamName,
        members
      });
    }
  
    return eventObj;
  }
  
  
  // 📅 日付を yyyy-MM-dd に整形
  function formatDate(value) {
    if (Object.prototype.toString.call(value) === "[object Date]") {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (typeof value === "string") {
      return value;
    }
    return "";
  }
  
  // 🕒 時刻を HH:mm:ss に整形
  function formatTime(value) {
    if (Object.prototype.toString.call(value) === "[object Date]") {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm:ss");
    } else if (typeof value === "number") {
      // スプレッドシートの時刻シリアル値対応
      return Utilities.formatDate(new Date(Math.round((value - 25569) * 86400 * 1000)), Session.getScriptTimeZone(), "HH:mm:ss");
    } else if (typeof value === "string") {
      return value;
    }
    return "";
  }