// B站推荐过滤扩展 - 请求拦截脚本
// 此脚本必须在document_start时机运行，在任何页面脚本之前拦截请求

// 需要拦截的B站数据上报接口（被广告拦截插件拦截后会不断重试导致高CPU）
const BLOCKED_API_PATTERNS = [
  'cm.bilibili.com/cm/api/receive',
  'cm.bilibili.com/cm/dimension',
  'data.bilibili.com/v2/log/web',
];

// 拦截XMLHttpRequest
(function() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    return originalOpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && BLOCKED_API_PATTERNS.some(pattern => this._url.includes(pattern))) {
      console.log('[B站过滤] 拦截XHR请求:', this._url);

      // 模拟成功响应
      Object.defineProperty(this, 'readyState', { value: 4, writable: false });
      Object.defineProperty(this, 'status', { value: 200, writable: false });
      Object.defineProperty(this, 'responseText', { value: '{"code":0}', writable: false });
      Object.defineProperty(this, 'response', { value: '{"code":0}', writable: false });

      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
        if (this.onreadystatechange) {
          this.onreadystatechange();
        }
      }, 0);
      return;
    }
    return originalSend.call(this, ...args);
  };
})();

// 拦截fetch请求
(function() {
  const originalFetch = window.fetch;

  window.fetch = function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : url.url;

    if (BLOCKED_API_PATTERNS.some(pattern => urlStr.includes(pattern))) {
      console.log('[B站过滤] 拦截fetch请求:', urlStr);

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ code: 0 }),
        text: () => Promise.resolve('{"code":0}'),
        blob: () => Promise.resolve(new Blob(['{"code":0}'], { type: 'application/json' })),
      });
    }
    return originalFetch.call(this, url, options);
  };
})();

// 拦截navigator.sendBeacon（B站可能使用它发送数据）
(function() {
  const originalSendBeacon = navigator.sendBeacon;

  navigator.sendBeacon = function(url, data) {
    if (BLOCKED_API_PATTERNS.some(pattern => url.includes(pattern))) {
      console.log('[B站过滤] 拦截sendBeacon请求:', url);
      return true; // 返回true表示已"成功"发送
    }
    return originalSendBeacon.call(this, url, data);
  };
})();

console.log('[B站过滤] 请求拦截已启用');
