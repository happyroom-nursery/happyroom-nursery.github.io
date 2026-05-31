import './style.css';

// ----------------------------------------------------
// 1. ヘッドレスCMSデータ (Decap CMSによって書き出された個別JSON) の動的一括読み込み
// ----------------------------------------------------
function renderNews() {
  const container = document.getElementById('news-list-container');
  if (!container) return;

  try {
    // Viteのビルド時静的スキャン機能「import.meta.glob」を利用
    const newsModules = import.meta.glob('/public/content/news/*.json', { eager: true });
    
    // オブジェクトから値（各お知らせデータ）を抽出し、配列に変換
    const newsList = Object.values(newsModules).map(module => module.default || module);

    if (newsList.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px 0;">現在、新しいお知らせはありません。</div>`;
      return;
    }

    // 日付が新しい順にソート (YYYY-MM-DD 形式の文字列比較)
    newsList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // お知らせをHTMLに生成・レンダリング
    container.innerHTML = newsList.map(item => {
      // 本文が長い場合は200文字で省略表示
      const summaryText = item.content.length > 200 
        ? item.content.substring(0, 200) + '...' 
        : item.content;

      return `
        <article class="news-item">
          <div class="news-meta">
            <span class="news-date">${item.date}</span>
            <span class="news-cat">重要なお知らせ</span>
          </div>
          <div class="news-body-area">
            <h3 class="news-main-title">${escapeHTML(item.title)}</h3>
            <p class="news-summary">${escapeHTML(summaryText)}</p>
          </div>
        </article>
      `;
    }).join('');

  } catch (error) {
    console.error('お知らせデータの取得に失敗しました:', error);
    container.innerHTML = `
      <div style="text-align: center; color: var(--accent); padding: 40px 0;">
        ⚠️ お知らせデータのロードでエラーが発生しました。
      </div>
    `;
  }
}

// XSS対策用エスケープ関数
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ----------------------------------------------------
// 2. モバイルナビゲーション＆スクロールエフェクト
// ----------------------------------------------------
function setupNavigation() {
  const header = document.getElementById('header');
  const toggleBtn = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link, .nav-cta');

  if (!header || !toggleBtn || !navMenu) return;

  // スクロール時にヘッダーの背景を変更
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // モバイルハンバーガーメニューの開閉
  toggleBtn.addEventListener('click', () => {
    toggleBtn.classList.toggle('open');
    navMenu.classList.toggle('open');
  });

  // メニューリンククリック時にメニューを閉じる
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleBtn.classList.remove('open');
      navMenu.classList.remove('open');
    });
  });
}

// ----------------------------------------------------
// 3. お問い合わせフォーム送信（Google Apps Scriptと接続）
// ----------------------------------------------------
// ※主君へ：Google Apps Scriptをデプロイして取得した「ウェブアプリのURL」を、以下の変数に貼り付けてください。
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyBp4nAmMEbSO20WvicttISuGpxx_kwbC4WU2kPh4uBamGVd3Ok_WYQxmE6fcKJDAdJ/exec";

function setupInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value;
    const email = document.getElementById('form-email').value;
    const tel = document.getElementById('form-tel').value;
    const select = document.getElementById('form-select').value;
    const msg = document.getElementById('form-msg').value;

    const selectLabels = {
      visit: '園の見学について',
      temporary: '一時預かりの空き状況・登録',
      monthly: '月極保育プランについて',
      other: 'その他ご相談・質問'
    };

    // 送信ボタンのローディング風エフェクト
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '✨ 送信処理中...';

    // 送信データオブジェクトの作成
    const payload = {
      name: name,
      email: email,
      tel: tel,
      select: select,
      msg: msg
    };

    // 完了時の画面切り替え処理
    const showSuccessUI = () => {
      const parent = form.parentElement;
      parent.style.opacity = 0;
      
      setTimeout(() => {
        parent.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; animation: fadeIn 0.6s forwards;">
            <div style="font-size: 60px; margin-bottom: 20px;">🧸</div>
            <h3 style="font-family: var(--font-heading); font-size: 26px; margin: 0 0 16px; color: var(--primary);">送信が完了しました！</h3>
            <p style="color: var(--text-muted); font-size: 15px; margin-bottom: 28px; line-height: 1.8;">
              お問い合わせいただきありがとうございます。<br>
              ご入力いただいた連絡先へ、保育スタッフより2営業日以内に折り返しご連絡差し上げます。
            </p>
            <div style="background-color: var(--bg-cream); padding: 20px; border-radius: 16px; text-align: left; font-size: 14px; border: 1px dashed var(--border); margin-bottom: 28px;">
              <strong>📝 送信内容の控え</strong><br>
              お名前: ${escapeHTML(name)} 様<br>
              種類: ${selectLabels[select] || select}<br>
              お電話: ${escapeHTML(tel)}
            </div>
            <button onclick="window.location.reload();" class="btn btn-secondary" style="padding: 10px 24px; font-size: 14px;">トップへ戻る</button>
          </div>
        `;
        parent.style.opacity = 1;
      }, 300);
    };

    // GAS_WEB_APP_URLがプレースホルダーのままの場合は擬似デモ送信をする
    if (GAS_WEB_APP_URL === "INSERT_YOUR_GAS_WEB_APP_URL_HERE") {
      console.warn("GASのURLが設定されていないため、デモモードで動作しています。");
      setTimeout(() => {
        showSuccessUI();
      }, 1500);
      return;
    }

    // 本番：Google Apps ScriptへデータをPOST送信
    fetch(GAS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors", // GitHub PagesからGoogle Apps ScriptへのCORS制限を完全回避
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(() => {
      // 成功時
      showSuccessUI();
    })
    .catch((error) => {
      console.error('送信エラー:', error);
      alert('申し訳ありません。送信中にエラーが発生しました。お手数ですが、お電話にてお問い合わせください。');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '送信する (内容を確認)';
    });
  });
}

// ----------------------------------------------------
// 4. アプリケーション初期化
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  renderNews();
  setupInquiryForm();
});
