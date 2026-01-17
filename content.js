// B站推荐过滤扩展 - 核心逻辑

const STORAGE_KEY = 'bili_blocked_items';

// 检查扩展上下文是否有效
function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// 从本地存储获取黑名单
function getBlacklist() {
  return new Promise((resolve) => {
    if (!isExtensionContextValid()) {
      console.warn('[B站过滤] 扩展上下文已失效，请刷新页面');
      resolve([]);
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

// 保存黑名单到本地存储
function saveBlacklist(blacklist) {
  return new Promise((resolve) => {
    if (!isExtensionContextValid()) {
      console.warn('[B站过滤] 扩展上下文已失效，无法保存');
      resolve();
      return;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: blacklist }, resolve);
  });
}

// 从卡片提取信息
function extractCardInfo(card) {
  // 获取徽章类型（直播/番剧/纪录片等）
  const badge = card.querySelector('.badge .floor-title');
  const type = badge ? badge.textContent.trim() : '';

  // 获取主标题（具体视频标题）
  const titleEl = card.querySelector('.title a, .title span');
  const title = titleEl ? titleEl.textContent.trim() : '';

  // 获取副标题（番剧名/UP主）- 这是过滤的依据
  const subTitleEl = card.querySelector('.sub-title');
  const subTitle = subTitleEl ? subTitleEl.textContent.trim() : '';

  // 获取链接
  const linkEl = card.querySelector('a[href]');
  const url = linkEl ? linkEl.getAttribute('href') : '';

  // 生成唯一标识：使用副标题（番剧名/UP主）而不是具体视频标题
  // 这样无论UP主发什么新视频，都能被过滤
  const id = `${type}:${subTitle}`;

  return { id, type, title, subTitle, url };
}

// 检查卡片是否在黑名单中
async function isBlocked(card) {
  const info = extractCardInfo(card);
  const blacklist = await getBlacklist();

  // 优先检查按类型屏蔽（如 "type:番剧" 会屏蔽所有番剧）
  const typeId = `type:${info.type}`;
  if (blacklist.some(item => item.id === typeId)) {
    return true;
  }

  // 检查具体内容屏蔽（如 "番剧:物理魔法使马修"）
  return blacklist.some(item => item.id === info.id);
}

// 添加卡片到黑名单
async function addToBlacklist(card) {
  const info = extractCardInfo(card);
  const blacklist = await getBlacklist();

  // 检查是否已存在
  if (!blacklist.some(item => item.id === info.id)) {
    blacklist.push({
      ...info,
      timestamp: Date.now()
    });
    await saveBlacklist(blacklist);
    console.log('[B站过滤] 已添加到黑名单:', info);
  }
}

// 创建自定义不感兴趣按钮
function createNoInterestButton(card) {
  // 检查是否已添加
  if (card.querySelector('.custom-no-interest-btn')) {
    return;
  }

  const btn = document.createElement('div');
  btn.className = 'custom-no-interest-btn';
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>
    </svg>
  `;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addToBlacklist(card);
    card.classList.add('hidden');
  });

  // 添加到封面容器
  const coverContainer = card.querySelector('.cover-container');
  if (coverContainer) {
    coverContainer.style.position = 'relative';
    coverContainer.appendChild(btn);
  }
}

// 处理单个卡片
async function processCard(card) {
  // 检查是否有原生的不感兴趣按钮（有enable-no-interest类的卡片不需要处理）
  const hasNativeBtn = card.classList.contains('enable-no-interest') ||
                       card.querySelector('.bili-video-card__no-interest');

  if (hasNativeBtn) {
    return;
  }

  // 检查是否被过滤
  const blocked = await isBlocked(card);
  if (blocked) {
    card.classList.add('hidden');
    return;
  }

  // 添加自定义按钮
  createNoInterestButton(card);
}

// 处理所有卡片
async function processAllCards() {
  // 检查扩展上下文
  if (!isExtensionContextValid()) {
    console.warn('[B站过滤] 扩展已重新加载，请刷新页面');
    return;
  }

  // 查找所有没有原生不感兴趣按钮的卡片
  // 使用 .floor-single-card 选择器定位直播、番剧等卡片
  const cards = document.querySelectorAll('.floor-single-card');

  console.log(`[B站过滤] 找到 ${cards.length} 个特殊卡片`);

  for (const card of cards) {
    await processCard(card);
  }
}

// 监听DOM变化（处理动态加载的内容）
function observeChanges() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // 延迟处理，等待DOM完全加载
        setTimeout(processAllCards, 100);
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 初始化
function init() {
  console.log('[B站过滤] 扩展已加载');

  // 初始处理
  processAllCards();

  // 监听动态内容
  observeChanges();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
