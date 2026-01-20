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
    '综艺': '综',
    '电视剧': '剧',
    '电影': '影',
    '国创': '国',
    '漫画': '漫',
    '课堂': '课',
    '赛事': '赛'
  };
  return icons[type] || '推';
}

// 获取类型样式类
function getTypeClass(type) {
  const classes = {
    '直播': 'live',
    '番剧': 'anime',
    '纪录片': 'documentary',
    '综艺': 'variety',
    '电视剧': 'tv',
    '电影': 'movie',
    '国创': 'domestic',
    '漫画': 'manga',
    '课堂': 'course',
    '赛事': 'esports'
  };
  return classes[type] || '';
}

// 检查是否是类型屏蔽（如 "type:番剧"）
function isTypeFilter(item) {
  return item.id && item.id.startsWith('type:');
}

// 检查是否是UP主屏蔽（如 "user:i_纪录"）
function isUserFilter(item) {
  return item.id && item.id.startsWith('user:');
}

// 检查是否是游戏屏蔽（如 "game:绝区零"）
function isGameFilter(item) {
  return item.id && item.id.startsWith('game:');
}

// 修复旧的黑名单数据（添加缺失的 subTitle 字段）
function fixOldBlacklist(blacklist) {
  return blacklist.map(item => {
    // 如果是类型屏蔽（type:番剧），确保格式正确
    if (item.id && item.id.startsWith('type:')) {
      return {
        ...item,
        type: item.type || item.id.replace('type:', ''),
        subTitle: null,
        isTypeFilter: true
      };
    }
    // 如果是UP主屏蔽（user:XXX），确保格式正确
    if (item.id && item.id.startsWith('user:')) {
      return {
        ...item,
        type: 'UP主',
        subTitle: item.id.replace('user:', ''),
        isUserFilter: true
      };
    }
    // 如果是游戏屏蔽（game:XXX），确保格式正确
    if (item.id && item.id.startsWith('game:')) {
      return {
        ...item,
        type: '游戏',
        subTitle: item.id.replace('game:', ''),
        isGameFilter: true
      };
    }
    // 旧格式的数据（番剧:XXX），尝试从 id 中提取
    if (!item.subTitle && item.id && item.id.includes(':')) {
      const parts = item.id.split(':');
      if (parts.length >= 2) {
        const type = parts[0];
        const sub = parts.slice(1).join(':');
        // 判断是否是UP主（通过类型或经验判断）
        const knownUserTypes = ['直播'];
        const isUser = knownUserTypes.includes(type);
        return {
          ...item,
          type: type,
          subTitle: sub,
          isUserFilter: isUser
        };
      }
    }
    return item;
  });
}

// 渲染黑名单列表
function renderBlacklist(blacklist) {
  const listEl = document.getElementById('blacklist-list');
  const countEl = document.getElementById('blocked-count');
  const gameFiltersEl = document.getElementById('game-filters');

  // 修复旧数据
  const fixedBlacklist = fixOldBlacklist(blacklist);

  // 如果数据被修复了，保存回存储
  if (JSON.stringify(blacklist) !== JSON.stringify(fixedBlacklist)) {
    saveBlacklist(fixedBlacklist, () => {
      console.log('[B站过滤] 已修复旧的黑名单数据');
    });
  }

  countEl.textContent = fixedBlacklist.length;

  // 分离游戏关键词和其他项
  const gameItems = fixedBlacklist.filter(item => isGameFilter(item));
  const otherItems = fixedBlacklist.filter(item => !isGameFilter(item));

  // 渲染游戏关键词区域
  if (gameItems.length === 0) {
    gameFiltersEl.innerHTML = '<p class="empty">暂无游戏关键词</p>';
  } else {
    gameFiltersEl.innerHTML = gameItems.map((item, index) => {
      // 找到在原数组中的索引
      const originalIndex = fixedBlacklist.indexOf(item);
      return `
        <div class="game-filter-tag" data-game-index="${originalIndex}">
          <span>🎮 ${item.subTitle}</span>
          <span class="remove-game" data-index="${originalIndex}" title="移除">×</span>
        </div>
      `;
    }).join('');

    // 绑定游戏标签删除事件
    gameFiltersEl.querySelectorAll('.remove-game').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        removeItem(index);
      });
    });
  }

  // 渲染其他项（排除游戏）
  if (otherItems.length === 0) {
    listEl.innerHTML = '<p class="empty">暂无过滤内容</p>';
    return;
  }

  // 重新映射索引，因为游戏项被排除
  let otherIndex = 0;
  const indexMap = {};
  fixedBlacklist.forEach((item, idx) => {
    if (!isGameFilter(item)) {
      indexMap[otherIndex] = idx;
      otherIndex++;
    }
  });

  listEl.innerHTML = otherItems.map((item, otherIdx) => {
    const isType = isTypeFilter(item);
    const isUser = isUserFilter(item);
    const originalIndex = indexMap[otherIdx];

    let displayTitle, typeLabel, iconClass;
    if (isType) {
      displayTitle = `所有${item.type}`;
      typeLabel = '按类型';
      iconClass = getTypeClass(item.type);
    } else if (isUser) {
      displayTitle = item.subTitle || '未知';
      typeLabel = 'UP主';
      iconClass = 'user';
    } else {
      displayTitle = item.subTitle || '未知';
      typeLabel = item.type;
      iconClass = getTypeClass(item.type);
    }

    return `
      <div class="blacklist-item ${isType ? 'type-filter' : ''} ${isUser ? 'user-filter' : ''}" data-index="${originalIndex}">
        <div class="item-icon ${iconClass}">${isUser ? '主' : getTypeIcon(item.type)}</div>
        <div class="item-content">
          <div class="item-type">${typeLabel}</div>
          <div class="item-title" title="${displayTitle}">${displayTitle}</div>
        </div>
        <button class="item-remove" data-index="${originalIndex}" title="移除">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // 绑定移除按钮事件
  listEl.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeItem(index);
    });
  });

  // 更新类型按钮状态
  updateTypeButtons(fixedBlacklist);
}

// 更新类型按钮状态（高亮已屏蔽的类型）
function updateTypeButtons(blacklist) {
  const typeIds = blacklist.map(item => item.id);
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    const type = btn.dataset.type;
    const typeId = `type:${type}`;
    if (typeIds.includes(typeId)) {
      btn.classList.add('active');
      btn.textContent = `已屏蔽${type}`;
    } else {
      btn.classList.remove('active');
      btn.textContent = `屏蔽${type}`;
    }
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

// 切换类型屏蔽
function toggleTypeFilter(type) {
  getBlacklist((blacklist) => {
    const typeId = `type:${type}`;
    const existingIndex = blacklist.findIndex(item => item.id === typeId);

    if (existingIndex >= 0) {
      // 已存在，移除
      blacklist.splice(existingIndex, 1);
    } else {
      // 不存在，添加
      blacklist.push({
        id: typeId,
        type: type,
        timestamp: Date.now()
      });
    }

    saveBlacklist(blacklist, () => {
      renderBlacklist(blacklist);
    });
  });
}

// 初始化
function init() {
  // 加载并渲染黑名单
  getBlacklist((blacklist) => {
    renderBlacklist(blacklist);
  });

  // 绑定清空按钮事件
  document.getElementById('clear-all').addEventListener('click', clearAll);

  // 绑定类型屏蔽按钮事件
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      toggleTypeFilter(type);
    });
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
