// B站推荐过滤扩展 - 后台脚本
// 注册 declarativeNetRequest 规则

chrome.runtime.onInstalled.addListener(async () => {
  // 注册拦截规则
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['block_rules']
    });
    console.log('[B站过滤] 请求拦截规则已注册');
  } catch (error) {
    console.error('[B站过滤] 注册规则失败:', error);
  }
});
