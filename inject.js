// B站推荐过滤扩展 - 请求拦截脚本
// 通过动态script注入到页面上下文，确保最早执行

(function() {
  // 拦截代码，需要在页面上下文中执行
  const interceptionCode = `
    (function() {
      const BLOCKED_PATTERNS = [
        'cm.bilibili.com/cm/api/receive',
        'cm.bilibili.com/cm/api/fees',
        'cm.bilibili.com/cm/dimension',
        'data.bilibili.com/v2/log/web',
        'data.bilibili.com/log/web',
      ];

      function shouldBlock(url) {
        if (!url) return false;
        return BLOCKED_PATTERNS.some(p => String(url).includes(p));
      }

      // 拦截 XMLHttpRequest
      const OrigXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        const origSend = xhr.send;

        xhr.open = function(method, url) {
          this._url = url;
          return origOpen.apply(this, arguments);
        };

        xhr.send = function() {
          if (shouldBlock(this._url)) {
            console.log('[B站过滤] XHR:', this._url);
            Object.defineProperties(this, {
              readyState: { value: 4, writable: false },
              status: { value: 200, writable: false },
              responseText: { value: '{"code":0}', writable: false },
              response: { value: '{"code":0}', writable: false }
            });
            requestAnimationFrame(() => {
              this.dispatchEvent(new Event('readystatechange'));
              if (this.onreadystatechange) this.onreadystatechange();
              this.dispatchEvent(new Event('load'));
              if (this.onload) this.onload();
            });
            return;
          }
          return origSend.apply(this, arguments);
        };
        return xhr;
      };
      window.XMLHttpRequest.prototype = OrigXHR.prototype;

      // 拦截 fetch
      const origFetch = window.fetch;
      window.fetch = function(url, options) {
        const urlStr = typeof url === 'string' ? url : url?.url || '';
        if (shouldBlock(urlStr)) {
          console.log('[B站过滤] Fetch:', urlStr);
          return Promise.resolve({
            ok: true, status: 200, statusText: 'OK',
            url: urlStr,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({ code: 0 }),
            text: () => Promise.resolve('{"code":0}'),
            blob: () => Promise.resolve(new Blob(['{"code":0}'], { type: 'application/json' })),
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode('{"code":0}').buffer),
            clone: function() { return this; }
          });
        }
        return origFetch.apply(this, arguments);
      };

      // 拦截 sendBeacon
      const origSendBeacon = navigator.sendBeacon;
      if (origSendBeacon) {
        navigator.sendBeacon = function(url, data) {
          if (shouldBlock(url)) {
            console.log('[B站过滤] Beacon:', url);
            return true;
          }
          return origSendBeacon.apply(this, arguments);
        };
      }

      // 拦截 Image
      const OrigImage = window.Image;
      window.Image = function() {
        const img = new OrigImage();
        Object.defineProperty(img, 'src', {
          set: function(value) {
            if (shouldBlock(value)) {
              console.log('[B站过滤] Image:', value);
              requestAnimationFrame(() => this.onload?.());
              return;
            }
            Object.getOwnPropertyDescriptor(OrigImage.prototype, 'src').set.call(this, value);
          },
          get: function() {
            return this.getAttribute('src');
          }
        });
        return img;
      };
      window.Image.prototype = OrigImage.prototype;

      console.log('[B站过滤] 拦截已启用');
    })();
  `;

  // 创建并注入 script
  const script = document.createElement('script');
  script.textContent = interceptionCode;
  script.async = false;
  script.setAttribute('data-injection', 'anti-bili-ad');

  // 尝试最早的位置插入
  if (document.documentElement) {
    document.documentElement.insertBefore(script, document.documentElement.firstChild);
  } else {
    // 如果 DOM 还没准备好，监听 DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.insertBefore(script, document.documentElement.firstChild);
    }, { once: true });
  }

  // 移除 script 标签（代码已执行）
  script.remove();

  console.log('[B站过滤] 拦截脚本已注入');
})();
