// 注册拦截规则
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['block_rules']
    });
    console.log('[B站过滤] 请求重定向规则已注册');
  } catch (error) {
    console.error('[B站过滤] 注册规则失败:', error);
  }
});
