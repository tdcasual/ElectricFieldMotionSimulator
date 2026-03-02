(function (global) {
  'use strict';
  var commandSequence = 0;
  var COMMAND_RESPONSE_TIMEOUT_MS = 5000;
  var COMMAND_QUEUE_TIMEOUT_MS = 6000;

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
    this.commandQueue = [];
    this.ready = false;
    this.targetOrigin = ensureString(this.options.targetOrigin) || '*';
  }

  ElectricFieldApp.prototype.removeQueuedCommand = function (id) {
    for (var i = 0; i < this.commandQueue.length; i += 1) {
      if (this.commandQueue[i] === id) {
        this.commandQueue.splice(i, 1);
        return;
      }
    }
  };

  ElectricFieldApp.prototype.startCommandTimeout = function (id, command) {
    var self = this;
    return setTimeout(function () {
      var pending = self.pendingCommands[id];
      if (!pending) return;
      delete self.pendingCommands[id];
      self.removeQueuedCommand(id);
      pending.timeoutId = null;
      pending.reject({ code: 'timeout', message: 'Command response timeout', id: id, command: command });
    }, COMMAND_RESPONSE_TIMEOUT_MS);
  };

  ElectricFieldApp.prototype.startQueueTimeout = function (id, command) {
    var self = this;
    return setTimeout(function () {
      var pending = self.pendingCommands[id];
      if (!pending || pending.dispatched) return;
      delete self.pendingCommands[id];
      self.removeQueuedCommand(id);
      pending.queueTimeoutId = null;
      pending.reject({ code: 'timeout', message: 'Command readiness timeout', id: id, command: command });
    }, COMMAND_QUEUE_TIMEOUT_MS);
  };

  ElectricFieldApp.prototype.dispatchPendingCommand = function (id) {
    var pending = this.pendingCommands[id];
    if (!pending || pending.dispatched) return;
    if (!this.iframe || !this.iframe.contentWindow) return;

    if (pending.queueTimeoutId != null) {
      clearTimeout(pending.queueTimeoutId);
      pending.queueTimeoutId = null;
    }
    pending.dispatched = true;
    try {
      this.iframe.contentWindow.postMessage(pending.message, this.targetOrigin);
      pending.timeoutId = this.startCommandTimeout(id, pending.command);
    } catch (error) {
      delete this.pendingCommands[id];
      this.removeQueuedCommand(id);
      pending.dispatched = false;
      pending.reject({
        code: 'post-message-failed',
        message: error && error.message ? String(error.message) : 'Failed to send command message',
        id: id,
        command: pending.command
      });
    }
  };

  ElectricFieldApp.prototype.flushCommandQueue = function () {
    if (!this.ready || !this.iframe || !this.iframe.contentWindow) return;
    if (!Array.isArray(this.commandQueue) || this.commandQueue.length === 0) return;

    var queued = this.commandQueue.slice();
    this.commandQueue = [];
    for (var i = 0; i < queued.length; i += 1) {
      var commandId = queued[i];
      if (typeof commandId !== 'string' || !this.pendingCommands[commandId]) continue;
      this.dispatchPendingCommand(commandId);
    }
  };

  ElectricFieldApp.prototype.rejectPendingCommands = function (code, message) {
    var pendingIds = Object.keys(this.pendingCommands);
    for (var i = 0; i < pendingIds.length; i += 1) {
      var pendingId = pendingIds[i];
      var pending = this.pendingCommands[pendingId];
      if (!pending) continue;
      if (pending.queueTimeoutId != null) {
        clearTimeout(pending.queueTimeoutId);
        pending.queueTimeoutId = null;
      }
      if (pending.timeoutId != null) {
        clearTimeout(pending.timeoutId);
        pending.timeoutId = null;
      }
      if (typeof pending.reject === 'function') {
        pending.reject({
          code: code,
          message: message,
          id: pendingId,
          command: pending.command
        });
      }
    }
    this.pendingCommands = {};
    this.commandQueue = [];
  };

  ElectricFieldApp.prototype.inject = function (target) {
    var container = normalizeTarget(target);
    if (!container) {
      throw new Error('ElectricFieldApp.inject target not found');
    }

    if (this.iframe) {
      this.rejectPendingCommands('replaced', 'ElectricFieldApp iframe replaced before command completed');
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    this.ready = false;
    this.commandQueue = [];

    var iframe = document.createElement('iframe');
    var viewerPath = ensureString(this.options.viewerPath) || 'viewer.html';
    var query = buildQuery(this.options);
    iframe.src = query ? viewerPath + '?' + query : viewerPath;
    var explicitTargetOrigin = ensureString(this.options.targetOrigin);
    if (explicitTargetOrigin) {
      this.targetOrigin = explicitTargetOrigin;
    } else {
      var detectedOrigin = resolveOrigin(iframe.src);
      this.targetOrigin = detectedOrigin || '*';
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

      if (data.type === 'ready') {
        self.ready = true;
        self.flushCommandQueue();
        if (typeof self.options.onReady === 'function') {
          self.options.onReady(data.payload || {});
        }
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
          if (pending && pending.timeoutId != null) {
            clearTimeout(pending.timeoutId);
            pending.timeoutId = null;
          }
          if (pending && pending.queueTimeoutId != null) {
            clearTimeout(pending.queueTimeoutId);
            pending.queueTimeoutId = null;
          }
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
      self.pendingCommands[id] = {
        resolve: resolve,
        reject: reject,
        timeoutId: null,
        queueTimeoutId: null,
        command: command,
        message: message,
        dispatched: false
      };
      if (self.ready) {
        self.dispatchPendingCommand(id);
      } else {
        self.commandQueue.push(id);
        self.pendingCommands[id].queueTimeoutId = self.startQueueTimeout(id, command);
      }
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
    this.ready = false;
    this.commandQueue = [];
    this.rejectPendingCommands('destroyed', 'ElectricFieldApp destroyed before command completed');
  };

  global.ElectricFieldApp = ElectricFieldApp;
})(window);
