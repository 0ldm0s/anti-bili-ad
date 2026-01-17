// B站推荐过滤 - 弹窗脚本

const STORAGE_KEY = 'bili_blocked_items';

// 从本地存储获取黑名单
function getBlacklist(callback) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    callback(result[STORAGE_KEY] || []);
  });
}

// 保存黑名单
function saveBlacklist(blacklist, callback) {
  chrome.storage.local.set({ [STORAGE_KEY]: blacklist }, callback);
}

// 获取类型图标
function getTypeIcon(type) {
  const icons = {
    '直播': '直',
    '番剧': '番',
    '纪录片': '纪',
    '综艺': '综'
  };
  return icons[type] || '推';
}

// 获取类型样式类
function getTypeClass(type) {
  const classes = {
    '直播': 'live',
    '番剧': 'anime',
    '纪录片': 'documentary',
    '综艺': 'variety'
  };
  return classes[type] || '';
}

// 渲染黑名单列表
function renderBlacklist(blacklist) {
  const listEl = document.getElementById('blacklist-list');
  const countEl = document.getElementById('blocked-count');

  countEl.textContent = blacklist.length;

  if (blacklist.length === 0) {
    listEl.innerHTML = '<p class="empty">暂无过滤内容</p>';
    return;
  }

  listEl.innerHTML = blacklist.map((item, index) => `
    <div class="blacklist-item" data-index="${index}">
      <div class="item-icon ${getTypeClass(item.type)}">${getTypeIcon(item.type)}</div>
      <div class="item-content">
        <div class="item-type">${item.type}</div>
        <div class="item-title" title="${item.subTitle}">${item.subTitle}</div>
      </div>
      <button class="item-remove" data-index="${index}" title="移除">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');

  // 绑定移除按钮事件
  listEl.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeItem(index);
    });
  });
}

// 移除单个项
function removeItem(index) {
  getBlacklist((blacklist) => {
    blacklist.splice(index, 1);
    saveBlacklist(blacklist, () => {
      renderBlacklist(blacklist);
    });
  });
}

// 清空黑名单
function clearAll() {
  if (confirm('确定要清空所有过滤内容吗？')) {
    saveBlacklist([], () => {
      renderBlacklist([]);
    });
  }
}

// 初始化
function init() {
  // 加载并渲染黑名单
  getBlacklist((blacklist) => {
    renderBlacklist(blacklist);
  });

  // 绑定清空按钮事件
  document.getElementById('clear-all').addEventListener('click', clearAll);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
