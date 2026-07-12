import './style.css';

// ----------------------------------------------------
// 1. ハイブリッドお知らせデータ (Decap CMSのJSON + Googleスプレッドシート) の自動統合・マージ読み込み
// ----------------------------------------------------
function renderNews() {
  const container = document.getElementById('news-list-container');
  if (!container) return;

  // デモデータ (GASおよびDecap CMSが未設定、またはエラー時の最終フォールバック用)
  const demoNews = [
    {
      "date": "2026-05-25",
      "title": "託児所 Happy Room ホームページを開設しました！",
      "content": "地域の皆様に安心してご利用いただけるアットホームな託児所「Happy Room」です。千葉県柏市豊四季にて、まもなく新規開園いたします。大切なお子様が、まるでおうちにいるかのように「あたたかく、のびのびと」過ごせる空間をご用意しました。園内の見学やご利用に関するお問い合わせは、お電話またはお問い合わせフォームより随時受け付けております。"
    },
    {
      "date": "2026-05-26",
      "title": "一時預かり保育の受付を開始いたします",
      "content": "お仕事、通院、お買い物、リフレッシュなど、様々な用途でご利用いただける一時預かり保育の事前登録・ご予約の受付を開始いたしました。1時間単位からの柔軟なご利用が可能です。お気軽にお問い合わせください。"
    }
  ];

  // A. Decap CMSで生成されたローカルの静的お知らせJSONファイルを自動スキャン・読み込み
  let staticNewsList = [];
  try {
    // Viteのビルド時静的スキャン機能「import.meta.glob」を利用
    const newsModules = import.meta.glob('/public/content/news/*.json', { eager: true });
    staticNewsList = Object.values(newsModules).map(module => module.default || module);
  } catch (err) {
    console.warn("ローカル静的お知らせJSONの読み込みに失敗しました（本番ビルド時は正常にバンドルされます）:", err);
  }

  // 表示処理関数
  const renderData = (dynamicNewsList) => {
    // B. 静的お知らせと動的（スプレッドシート）お知らせをマージ
    const mergedList = [...staticNewsList, ...dynamicNewsList];

    // C. 重複排除（同じ日付かつ同じタイトルのものを削除）
    const uniqueNewsList = [];
    const seen = new Set();
    for (const item of mergedList) {
      if (!item || !item.date || !item.title) continue;
      const key = `${item.date.trim()}_${item.title.trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNewsList.push(item);
      }
    }

    // 最終的に何もデータがない場合はデモデータを読み込み
    const finalList = uniqueNewsList.length > 0 ? uniqueNewsList : demoNews;

    // 日付が新しい順にソート (YYYY-MM-DD 形式の文字列比較)
    finalList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // お知らせをHTMLに生成・レンダリング
    container.innerHTML = finalList.map(item => {
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
  };

  // GAS_WEB_APP_URLがプレースホルダーや未設定の場合は、静的お知らせのみでレンダリング
  if (GAS_WEB_APP_URL === "INSERT_YOUR_GAS_WEB_APP_URL_HERE") {
    renderData([]);
    return;
  }

  // D. 本番：Google Apps Script (Googleスプレッドシート) からリアルタイム動的ロード
  fetch(GAS_WEB_APP_URL)
    .then(response => response.json())
    .then(data => {
      // GAS側がエラーを返した、またはデータが不正な場合のガード
      if (data && data.status === "error") {
        console.error("GASエラー:", data.message);
        renderData([]);
      } else {
        // data が配列であることを確認。または { news: [...] } の形に将来拡張されても動くように対応
        const fetchedNews = Array.isArray(data) ? data : (data.news || []);
        renderData(fetchedNews);
      }
    })
    .catch(error => {
      console.error('スプレッドシートお知らせ取得エラー（静的データのみ表示します）:', error);
      renderData([]); // 通信エラー時は静的データのみで安全にレンダリング
    });
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
// --- Image Modal Logic ---
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const closeModal = document.querySelector('.modal-close');
const galleryImages = document.querySelectorAll('.gallery-image');

galleryImages.forEach(img => {
  img.addEventListener('click', function() {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    modalImg.src = this.src;
  });
});

function closeImageModal() {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

if (closeModal) {
  closeModal.addEventListener('click', closeImageModal);
}

if (modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal || e.target === modalImg) {
      closeImageModal();
    }
  });
}
