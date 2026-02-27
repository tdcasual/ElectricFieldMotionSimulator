(function (global) {
  'use strict';
  var commandSequence = 0;

  function normalizeTarget(target) {
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    if (target && target.nodeType === 1) {
      return target;
    }
    return null;
  }

  function ensureString(value) {
    if (value == null) return null;
    var text = String(value).trim();
    return text.length ? text : null;
  }

  function boolToFlag(value) {
    return value ? '1' : '0';
  }

  function buildQuery(options) {
    var params = new URLSearchParams();

    if (ensureString(options.mode)) {
      params.set('mode', options.mode);
    }
    if (ensureString(options.sceneUrl)) {
      params.set('sceneUrl', options.sceneUrl);
    } else if (ensureString(options.filename)) {
      params.set('sceneUrl', options.filename);
    }

    if (options.sceneData != null) {
      var payload = typeof options.sceneData === 'string' ? options.sceneData : JSON.stringify(options.sceneData);
      params.set('sceneData', payload);
    }

    if (ensureString(options.materialId)) {
      params.set('materialId', options.materialId);
    } else if (ensureString(options.material_id)) {
      params.set('materialId', options.material_id);
    } else if (ensureString(options.id)) {
      params.set('materialId', options.id);
    }

    if (typeof options.autoplay === 'boolean') {
      params.set('autoplay', boolToFlag(options.autoplay));
    }
    if (typeof options.toolbar === 'boolean') {
      params.set('toolbar', boolToFlag(options.toolbar));
    }
    if (ensureString(options.theme)) {
      params.set('theme', options.theme);
    }
    if (ensureString(options.locale)) {
      params.set('locale', options.locale);
    }

    return params.toString();
  }

  function resolveOrigin(url) {
    if (!ensureString(url)) return null;
    try {
      return new URL(url, window.location.href).origin;
    } catch (_) {
      return null;
    }
  }

  function ElectricFieldApp(options) {
    this.options = options || {};
    this.iframe = null;
    this.messageHandler = null;
    this.pendingCommands = {};
    this.targetOrigin = ensureString(this.options.targetOrigin) || '*';
  }

  ElectricFieldApp.prototype.inject = function (target) {
    var container = normalizeTarget(target);
    if (!container) {
      throw new Error('ElectricFieldApp.inject target not found');
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    var iframe = document.createElement('iframe');
    var viewerPath = ensureString(this.options.viewerPath) || 'viewer.html';
    var query = buildQuery(this.options);
    iframe.src = query ? viewerPath + '?' + query : viewerPath;
    if (this.targetOrigin === '*') {
      var detectedOrigin = resolveOrigin(iframe.src);
      if (detectedOrigin) {
        this.targetOrigin = detectedOrigin;
      }
    }
    iframe.style.width = ensureString(this.options.width) || '100%';
    iframe.style.height = ensureString(this.options.height) || '480px';
    iframe.style.border = '0';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allowfullscreen', 'true');

    container.appendChild(iframe);
    this.iframe = iframe;

    var self = this;
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }

    this.messageHandler = function (event) {
      if (!self.iframe || event.source !== self.iframe.contentWindow) return;
      if (self.targetOrigin !== '*' && event.origin !== self.targetOrigin) return;
      var data = event.data || {};
      if (data.source !== 'electric-field-sim') return;

      if (data.type === 'ready' && typeof self.options.onReady === 'function') {
        self.options.onReady(data.payload || {});
      }
      if (data.type === 'error' && typeof self.options.onError === 'function') {
        self.options.onError(data.payload || {});
      }
      if (data.type === 'command-result') {
        var payload = data.payload || {};
        if (typeof self.options.onCommandResult === 'function') {
          self.options.onCommandResult(payload);
        }
        var id = typeof payload.id === 'string' ? payload.id : null;
        if (id && self.pendingCommands[id]) {
          var pending = self.pendingCommands[id];
          delete self.pendingCommands[id];
          if (payload.ok) {
            pending.resolve(payload);
          } else {
            pending.reject(payload);
          }
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
    return iframe;
  };

  ElectricFieldApp.prototype.sendCommand = function (command, payload) {
    if (!this.iframe || !this.iframe.contentWindow) {
      return Promise.reject(new Error('ElectricFieldApp is not injected'));
    }

    commandSequence += 1;
    var id = 'cmd-' + commandSequence;
    var message = {
      source: 'electric-field-host',
      type: 'command',
      id: id,
      command: command
    };
    if (payload !== undefined) {
      message.payload = payload;
    }

    var self = this;
    return new Promise(function (resolve, reject) {
      self.pendingCommands[id] = { resolve: resolve, reject: reject };
      self.iframe.contentWindow.postMessage(message, self.targetOrigin);
      setTimeout(function () {
        if (!self.pendingCommands[id]) return;
        delete self.pendingCommands[id];
        reject({ code: 'timeout', message: 'Command response timeout', id: id, command: command });
      }, 5000);
    });
  };

  ElectricFieldApp.prototype.play = function () {
    return this.sendCommand('play');
  };

  ElectricFieldApp.prototype.pause = function () {
    return this.sendCommand('pause');
  };

  ElectricFieldApp.prototype.togglePlay = function () {
    return this.sendCommand('togglePlay');
  };

  ElectricFieldApp.prototype.reset = function () {
    return this.sendCommand('reset');
  };

  ElectricFieldApp.prototype.loadScene = function (sceneData) {
    return this.sendCommand('loadScene', sceneData);
  };

  ElectricFieldApp.prototype.destroy = function () {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    this.iframe = null;
    this.pendingCommands = {};
  };

  global.ElectricFieldApp = ElectricFieldApp;
})(window);
