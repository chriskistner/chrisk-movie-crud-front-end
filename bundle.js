(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":3}],2:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":27}],3:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":4,"./cancel/CancelToken":5,"./cancel/isCancel":6,"./core/Axios":7,"./defaults":14,"./helpers/bind":15,"./helpers/spread":24,"./utils":25}],4:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],5:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":4}],6:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],7:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, {method: 'get'}, this.defaults, config);
  config.method = config.method.toLowerCase();

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":14,"./../utils":25,"./InterceptorManager":8,"./dispatchRequest":10}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":25}],9:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":11}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":6,"../defaults":14,"./../helpers/combineURLs":18,"./../helpers/isAbsoluteURL":20,"./../utils":25,"./transformData":13}],11:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
};

},{}],12:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":9}],13:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":25}],14:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":27}],15:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],16:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],17:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":25}],18:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":25}],20:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":25}],22:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":25}],23:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":25}],24:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],25:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":15,"is-buffer":26}],26:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],27:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],28:[function(require,module,exports){
const apiURLMovies = "http://localhost:3000/movies";
const apiURLActors = "http://localhost:3000/actors";
const axios = require('axios');
const create = require('./templates');

//ALL MOVIES PAGE
function getMovies() { axios.get(apiURLMovies) 
    .then(function (result) {
        let movies = result.data;
        populateMovies(movies);
    })
};

function populateMovies(arr){
    const appliedTemplates = arr.map(film => create.movieRow(film.id, film.title, film.released, film.director, film.rating, film.poster, film.actors)).join('\n');
    document.querySelector(".main-body").innerHTML = appliedTemplates;

    const starElement = `<img style="margin-top: -3px;" src="http://pngimg.com/uploads/star/star_PNG41472.png" height="20" width="20">`
    
    for (let film of arr){
        const appliedLists = film.actors.map(actor => create.createActorList(actor.first_name, actor.last_name)).join('\n');
        
        if (appliedLists.length === 0) {
            document.querySelector(`#actor-list[data-id="${film.id}"]`).innerHTML = "<li><i>NO ACTORS LISTED</i></li>";
        } else {document.querySelector(`#actor-list[data-id="${film.id}"]`).innerHTML = appliedLists};

        const starRating = '<b>Rating:</b> ' + starElement.repeat(film.rating);
        document.querySelector(`#star-rating[data-id="${film.id}"]`).innerHTML = starRating;

        // MOVIE ROW MENU BUTTONS
        let deleteFilmButton = document.querySelector(`#delete-film[data-id="${film.id}"]`);
        let updateFilmButton = document.querySelector(`#edit-film[data-id="${film.id}"]`);

        // UPDATE FIELD AREA
        let closeUpdateButton = document.querySelector(`#stop-post[data-id="${film.id}"]`);
        let updateField = document.querySelector(`.update-field[data-id="${film.id}"]`);
        let updateFieldPoster = document.querySelector(`#update-poster[data-id="${film.id}"]`);
        let updateFieldTitle = document.querySelector(`#update-title[data-id="${film.id}"]`);
        let updateFieldReleased = document.querySelector(`#update-released[data-id="${film.id}"]`);
        let updateFieldDirector = document.querySelector(`#update-director[data-id="${film.id}"]`);
        let updateFieldRating = document.querySelector(`#update-rating[data-id="${film.id}"]`);
        let submitUpdate = document.querySelector(`.update-form[data-id="${film.id}"]`);

        deleteFilmButton.addEventListener('click', function(){
            axios.delete(apiURLMovies+`/${film.id}`)
            .then(function(){
                console.log("Film Deleted")
                getMovies();
            })
        });

        updateFilmButton.addEventListener('click', function() {
            if(updateField.classList.contains('hide-menu')) {
                updateField.classList.remove('hide-menu')
            } else {updateField.classList.add('hide-menu')}
        });

        closeUpdateButton.addEventListener('click', function(){
            updateField.classList.add('hide-menu')
        });

        submitUpdate.addEventListener('submit', function(){
            event.preventDefault();
            const updateMovie = axios.put(apiURLMovies+`/${film.id}`, {
                poster: updateFieldPoster.value,
                title: updateFieldTitle.value,
                released: updateFieldReleased.value,
                director: updateFieldDirector.value,
                rating: updateFieldRating.value,
            })
            .then(function(){
                console.log('Updated');
                getMovies();
                updateField.classList.add('hide-menu');
            })
        })

    }  
};

//ADD MOVIE PAGE
function populateAddMovie () {
    document.querySelector(".main-body").innerHTML = create.newMovie();

    let addNewMovie= document.querySelector(`#submit-movie`);
    let newMovieLink= document.querySelector(`#filmPoster`);
    let newMovieTitle= document.querySelector(`#filmTitle`);
    let newMovieRelease= document.querySelector(`#filmRelease`);
    let newMovieDirector= document.querySelector(`#filmDirector`);
    let newMovieRating= document.querySelector(`#filmRating`);

    addNewMovie.addEventListener('submit', function() {
        event.preventDefault();
        const addMovie = axios.post(apiURLMovies, {
            poster : newMovieLink.value,
            title: newMovieTitle.value,
            released: newMovieRelease.value,
            director: newMovieDirector.value,
            rating: newMovieRating.value
        })
        .then(function(){
            console.log("Success")
            document.querySelector(".main-body").innerHTML = create.displayNewMovie(newMovieTitle.value, newMovieLink.value, newMovieRelease.value, newMovieDirector.value, newMovieRating.value) 
        })
    })

};

// ALL ACTORS PAGE

function getActors() { axios.get(apiURLActors) 
    .then(function (result) {
        let stars = result.data;
        populateActors(stars);
    })
};

function populateActors(arr) {
    const appliedTemplates = arr.map(star => create.actorRow(star.id, star.first_name, star.last_name)).join('\n');
    document.querySelector(".main-body").innerHTML = appliedTemplates;

    for (let stars of arr){
        const appliedLists = stars.films.map(film => create.createMovieList(film.title)).join('\n');
        
        if (appliedLists.length === 0) {
            document.querySelector(`#movie-list[data-id="${stars.id}"]`).innerHTML = "<li><i>NO ACTORS LISTED</i></li>";
        } else {document.querySelector(`#movie-list[data-id="${stars.id}"]`).innerHTML = appliedLists};

        // ACTOR ROW MENU BUTTONS
        let deleteActorButton = document.querySelector(`#delete-actor[data-id="${stars.id}"]`);
        let updateActorButton = document.querySelector(`#edit-actor[data-id="${stars.id}"]`);

        // ACTOR UPDATE MENU FIELDS & BUTTONS
        let updateActorField = document.querySelector(`.update-actor-field[data-id="${stars.id}"]`);
        let updateActorList = document.querySelector(`#film-options[data-id="${stars.id}"]`);
        let updateActorFName = document.querySelector(`#update-first-name[data-id="${stars.id}"]`);
        let updateActorLName = document.querySelector(`#update-last-name[data-id="${stars.id}"]`);
        let submitUpdate = document.querySelector(`.update-form[data-id="${stars.id}"]`);
        let closeUpdateButton = document.querySelector(`#stop-post[data-id="${stars.id}"]`);

        closeUpdateButton.addEventListener('click', function(){
            updateActorField.classList.add('hide-menu')
        });
        
        deleteActorButton.addEventListener('click', function(){
            axios.delete(apiURLActors+`/${stars.id}`)
            .then(function(){
                console.log("Film Deleted")
                getActors();
            })
        });

        updateActorButton.addEventListener('click', function() {
            if(updateActorField.classList.contains('hide-menu')) {
                updateActorField.classList.remove('hide-menu')
            } else {updateActorField.classList.add('hide-menu')}
        });

        const filmArr = stars.films.map(film => film.title);
        axios.get(apiURLMovies)
        .then(function(result){
            let titles = result.data;
            create.populateDropdown(titles, filmArr, updateActorList);
        });

        submitUpdate.addEventListener('submit', function(event){
            event.preventDefault();
            let movieList = Array.from(document.querySelectorAll(`#film-options[data-id="${stars.id}"] option:checked`)).map(element => element.getAttribute('data-id')).filter(element => element);
            axios.put(apiURLActors+`/${stars.id}`, {
                 first_name: updateActorFName.value,
                 last_name: updateActorLName.value,
             })
             .then(function(){
                 return axios.delete(apiURLActors +`/${stars.id}/movies`, {
                     data: movieList
                 })
             })
             .then(function(){
                 return axios.post(apiURLActors +  `/${stars.id}/movies`, {
                     movies: movieList
                 })
             })
             .then(function(){
                 console.log('Updated');
                 getActors();
             })
        })
    }
};

//ADD AN ACTOR PAGE
function populateAddActorPage() {
    document.querySelector(".main-body").innerHTML = create.newActor();
    let dropDownMenu = document.querySelector('#film-options');
    axios.get(apiURLMovies)
    .then(function(result){
        let titles = result.data;
        create.populateFullDropdown(titles, dropDownMenu);
    })
    let addNewActor = document.querySelector('#add-actor');
    let newActorFName = document.querySelector('#actor-first-name');
    let newActorLName = document.querySelector('#actor-last-name');

    addNewActor.addEventListener('submit', function (event){
        event.preventDefault();
        let movieList = Array.from(document.querySelectorAll('#film-options option:checked')).map(element => element.getAttribute('data-id')).filter(element => element);
       axios.post(apiURLActors, {
            first_name: newActorFName.value,
            last_name: newActorLName.value,
        })
        .then(function(result){
            axios.post(apiURLActors +`/${result.data.id}/movies`, {
                movies: movieList,
            })
        })
        .then(function(){
            console.log('Success');
            document.querySelector(".main-body").innerHTML = create.displayNewActor(newActorFName.value, newActorLName.value, movieList);
        })
    })
};




//HTML WINDOW SELECTIONS
if (window.location.href.endsWith('/movies.html')){
    getMovies();

    let searchForFilm = document.querySelector('#movie-search');
    
    function getMovie(film) {
    axios.get(apiURLMovies + `/${film}`)
        .then(function (result) {
            let film = result.data[0];
            populateMovies([film]);
        })
    };
    
    searchForFilm.addEventListener('submit', function(event){
        event.preventDefault();
        let targetMovie = event.target.searchField.value;
        getMovie(targetMovie);
        event.target.searchField.value = '';
    });

} else if (window.location.href.endsWith('/add-movie.html')) {
    populateAddMovie();

} else if (window.location.href.endsWith('/actors.html')) {
    getActors();
    let searchForActor = document.querySelector('#actor-search');
    
    function getActor(actor) {
    axios.get(apiURLActors + `/${actor}`)
        .then(function (result) {
            let actor = result.data[0];
            populateActors([actor]);
        })
    };
    
    searchForActor.addEventListener('submit', function(event){
        event.preventDefault();
        let targetActor = event.target.searchField.value;
        console.log(targetActor);
        getActor(targetActor);
        event.target.searchField.value = '';
    });

} else if (window.location.href.endsWith('/add-actor.html')) {
    populateAddActorPage();

} else if (window.location.href.endsWith('/index.html')) {
    const homePageTemplate = create.displayHomePageMenu();
    document.querySelector(".main-body").innerHTML = homePageTemplate;
}
},{"./templates":29,"axios":1}],29:[function(require,module,exports){
const movieRow = (id, title, released, director, rating, poster) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-2 border-top border-left border-bottom">
            <img src="${poster}" height="200px">
        </div>

        <div class="col-2 border-top border-bottom">
            <p><b>Site ID:</b> ${id}</p>
            <p><b>Title:</b> ${title}</p>
            <p><b>Released:</b> ${released}</p>
            <p id="star-rating" data-id="${id}"></p>
        </div>

        <div class="col-2 border-top border-bottom">
            <p style="margin-bottom: 0px;"><b>Actors:</b><ul id="actor-list" data-id=${id}> </ul></p>
        </div>
            <div class="col-2 border-top border-right border-bottom">
                    <button id="edit-film" data-id="${id}" type="button" class="btn btn-block btn-outline-danger">Update</button>
                    <button id="delete-film" data-id="${id}" type="button" class="btn btn-block btn-outline-warning">Delete</button>
            </div>
        </div>
    <div class="row update-field hide-menu justify-content-center" data-id="${id}">
        <form class="update-form" data-id="${id}">
            <div class="form-row justify-content-center">
                <div class="col-2 border-top border-left border-bottom">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-poster" value="${poster}">
                </div>
                <div class="col-2 border-top border-bottom">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-title" value="${title}">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-released" value="${released}">
                </div>
                <div class="col-2 border-top border-bottom">
                <input class="update-form-fields" type="text" data-id="${id}"  id="update-director" value="${director}">
                <input class="update-form-fields" type="text" data-id="${id}"  id="update-rating" value="${rating}">
            </div>
                <div class="col-2 border-top border-right border-bottom">
                    <button id = "stop-post" data-id="${id}" type="button" class="close-button btn-sm btn-outline-dark">X</button>
                    <input type="submit" class="update-button btn-info" id="submit-update" data-id="${id}" value="Update Movie">
                </div>
            </div>
        </form>
    </div>
    `
};

const createActorList = (fName, lName) => {
    return `
    <li>${fName} ${lName}</li>
    `
};

const newMovie = () => {
    return `
        <div class="row justify-content-center item-rows">
            <div class="col-4 border">
                <div class="form-group">
                <form id="submit-movie">
                    <div class="row align-items-center justify-content-between">
                        <div class="col">
                            <h2>Movie Information</h2>
                        </div>
                    </div>
                <div class="row justify-content-center">
                    <div class="col-sm">
                        <img class="input-fieldE sample-poster" src="https://via.placeholder.com/150" alt="poster">
                    </div>
                </div>

                <div class="menuBar">
                    <label class="menuBar" for="filmPoster">Movie Poster <i>link Only</i></label>
                </div>
                    <input class="input-fieldE" type="text" id="filmPoster">
                <div class="menuBar">
                    <label class="menuBar" for="filmTitle">Movie Title</label>
                </div>
                    <input class="input-fieldA" type="text" id="filmTitle">

                <div class="menuBar">
                    <label class="menuBar" for="filmRelease">Year Released</label>
                </div>
                    <input class="input-fieldB" type="text" id="filmRelease">

                <div class="menuBar">
                    <label class="menuBar" for="filmDirector">Director</label>
                </div>
                <input class="input-fieldC" type="text" id="filmDirector">

                <div class="menuBar">
                    <label class="menuBar" for="filmRating">Star Rating</label>
                </div>
                    <input class="input-fieldD" type="text" id="filmRating">
                    <input type="submit" id="submission" value="SUBMIT">
                </form>
            </div>
       </div> 
       </div>
    `
};

const displayNewMovie = (title, poster, released, director, rating) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border">
            <div class="row align-items-center">
                <div class="col-12">
                    <h4>New Movie Information</h4>
                </div>
            </div>
            <div class="row justify-content-center">
                <div class="col-12 border">
                    <img class="sample-poster border" src="${poster}" alt="poster">
                </div>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Title: 
                    <small class="text-muted"> ${title}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Release Year:  
                    <small class="text-muted"> ${released}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Directed By:  
                    <small class="text-muted"> ${director}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Your Rating:  
                    <small class="text-muted"> ${rating} Stars</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <div class="btn-group">
                <a href="./index.html"><button type="button" class="btn btn-primary btn-sm">All Movies</button></a>
                <a href="./add-movie.html"><button type="button" class="btn btn-success btn-sm">Add Another</button></a>
          </div>
            </div>
        </div
    </div>
    `
}


const actorRow = (id, first_name, last_name) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-3 border-top border-left border-bottom">
            <p><b>Site ID:</b> ${id}</p>
            <p><b>First Name:</b> ${first_name}</p>
            <p><b>Last Name:</b> ${last_name}</p>
        </div>
        <div class="col-3 border-top border-bottom">
            <p style="margin-bottom: 0px;"><b>Films:</b><ul id="movie-list" data-id=${id}> </ul></p>
        </div>
        <div class="col-2 border-top border-right border-bottom">
            <button id="edit-actor" data-id="${id}" type="button" class="btn btn-block btn-outline-danger">Update</button>
            <button id="delete-actor" data-id="${id}" type="button" class="btn btn-block btn-outline-warning">Delete</button>
        </div>
    </div>
    <div class="row update-actor-field hide-menu justify-content-center" data-id="${id}">
        <form class="update-form" data-id="${id}">
            <div class="form-row justify-content-center">
                <div class="col-4 border-top border-left border-bottom">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-first-name" value="${first_name}">
                    <input class="update-form-fields" type="text" data-id="${id}"  id="update-last-name" value="${last_name}">
                </div>
                <div class="col-4 border-top border-left border-bottom">
                    <select multiple name="film-list" id="film-options" data-id="${id}">
                        <option selected disabled>Select Films Here</option>
                    </select>
                </div>
                <div class="col-4 border-top border-right border-bottom">
                    <button id = "stop-post" data-id="${id}" type="button" class="close-button btn-sm btn-outline-dark">X</button>
                    <input type="submit" class="update-button btn-info" id="submit-update" data-id="${id}" value="Update Movie">
                </div>
            </div>
        </form>
    </div>
    `
}

const createMovieList = (title) => {
    return `
    <li>${title}</li>
    `
};

function createMovieOption(film){
    var option = document.createElement("option");
    option.setAttribute('data-id', film.id);
    option.innerHTML = film.title;
    return option;
};

function createCheckedMovieOption(film ) {
    var option = document.createElement("option");
    option.setAttribute('data-id', film.id);
    option.setAttribute('selected', 'selected')
    option.innerHTML = film.title;
    return option;
}

function populateFullDropdown(arr, loc){
    for (var i = 0; i < arr.length; i++){
        loc.appendChild(createMovieOption(arr[i]));
    }  
};

function populateDropdown(arr, checkArr, loc){
    for (var i = 0; i < arr.length; i++){
        if(checkArr.includes(arr[i].title)) {
            loc.appendChild(createCheckedMovieOption(arr[i])); 
        } else {
            loc.appendChild(createMovieOption(arr[i]));
        }

    }  
};

function newActor() {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border">
            <div class="form-group">
                <form id="add-actor">
                <div class="menuBar">
                    <label class="menuBar" for="actor-first-name">Actor's First Name</label>
                </div>
                    <input type="text" id="actor-first-name">
                <div class="menuBar">
                    <label class="menuBar" for="actor-last-name">Actor's Last Name</label>
                </div>
                    <input type="text" id="actor-last-name">

                <div class="menuBar">
                    <label class="menuBar" for="actors-movies">Actor's Movies</label>
                </div>
                <select multiple name="film-list" id="film-options">
                    <option selected disabled>Select Films Here</option>
                </select>
                <hr />
                <input type="submit" id="submission" value="SUBMIT">
                </form>
            </div>
        </div>
    </div>
    
    `
};

const displayNewActor = (first_name, last_name) => {
    return `
    <div class="row justify-content-center item-rows">
        <div class="col-4 border">
            <div class="row align-items-center justify-content-center">
                <h3>
                    New Actor Information
                </h3>
            </div>
            <div class="row justify-content-center">
                <h3>
                    Name: 
                    <small class="text-muted"> ${first_name} ${last_name}</small>
                </h3>
            </div>
            <div class="row justify-content-center">
                <p>
                    <i>See Actor List for Assigned Films</i>
                </p>
            </div>
            <div class="row justify-content-center">
                <div class="btn-group">
                <a href="./actors.html"><button type="button" class="btn btn-primary btn-sm">All Actors</button></a>
                <a href="./add-actor.html"><button type="button" class="btn btn-success btn-sm">Add Another</button></a>
          </div>
            </div>
        </div
    </div>
    `
};

const displayHomePageMenu = ()=> {
    return `
    <div class="row justify-content-center">
        <div class="col-8 ">
            <div class="card-group">
                <div class="card text-center" style="width: 18rem;">
                    <img class="card-img-top home-page-pics " src="https://lewes.lib.de.us/files/2017/07/Movie-reel-film-reel-clipart.jpeg" alt="Movie reel" style="max-width: 300px;">
                    <div class="card-body">
                        <h5 class="card-title">MOVIES</h5>
                        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                        <a href="./movies.html" class="btn btn-primary">Go To Movies</a>
                    </div>
                </div>
                <div class="card text-center" style="width: 18rem;">
                    <img class="card-img-top home-page-pics " src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQYAAADACAMAAADRLT0TAAAAh1BMVEX///8AAAD7+/v39/fw8PD5+fnz8/Pn5+fr6+uioqK0tLTh4eGFhYXT09POzs6bm5vJycl/f3+6urqNjY1fX1+/v789PT3Z2dksLCweHh5CQkKrq6tYWFhMTEx3d3cyMjJvb28XFxciIiJ5eXleXl5JSUkvLy9nZ2eTk5NBQUFwcHANDQ2enp6T3Gk/AAAYhklEQVR4nL1d6aKqOAyWRVkVFBEVXNDjlaPn/Z9vSNm6Qqsw+TNzDwglbbYvSTubyZAeRs+LpuWPq+MmC6mfjECGFzvRz2m3z99afrv8ZpGzSYz/6+0MxU+tpCyKE8+y3JN2crypX2kmf8+D9rtdu45G0fG+mfz1HEpO5bvfhdUN0de0rdXzi2/Jco7axXctNPEJzQagS5RM8mZ7tUlTNw5t5soLXhtR48w0bT2RbNjBXnuF3b89HhtKuhXmmK/VvfR+wx6/u6fYTBu/5Z8e7NQH5QKZYkJWW+2+Iv5iC9hQ0n1E4Ug5z/8N6hfY+/JfZ97P3PJCPN4o6of+26f0IpvfOANs6DkaI3z+C7IlXNyJuDCbbcpLm7EGgSjMjyvOny89bNA0Xx/n5ZnoBbvlDCzEU/TDorw44qpMfm8h98Kxlw1jzcWhfNLj+SrS1Pkr1luc98ChvdhO/2jaYaS5gEWZil/TT88xlPW2CHGVOzdXfo69g7dMazLLy9cRRlCSdfsRfst9iA3aYRrrOfOKhhO3vttALJZjvM/RXPHFYJANmuaMMQoO6WktHaeeFQfLYTvCy86XPmfMlWAD7diMSPVi3PcMEVyr793JLOvVMLEMG0T27Ht6NpInXg9heTn48jXG/tV/w0qKDdr1y3EIaF4+Ot+j9SA0Fou8jHS+e42eD/FR5E3TdP9uIAKCSTjNkVfxEC5asOnfRb67QanWJdmgFV8NREDgZK9rDbEW3QQuKN/pkaTsOnyPLBtGdmorcmr+/sELRNED8Erk9sjQPZO4SZoN41hvksBcI3MM3oEmCGo32lc2e5PLeKH9QQVO/+afj0VAQbvK1prQPdho34ikqUm5f4PedEdC6f2YQChq3w70JN+pBovpf/yKndxCEsTAXPpKUfEo7Ji7KMOvh/CmAbMvJof/TIZkvOmWPh2MiAD1aRQYfC1XS4JQfGqvTdkwnQcMCWlsqwnmetf8Yy1YDiA5n6rIu6wgb1TYoLFo6ncEmrGdL40PsYBX0RMc9pEn7XctldgwdnCxwpeYww/iALvvQST66Ed6FfWAsjwaOYmhlwHFBftHzt4yB+jqM+zHkldmhhobxjaaEOiH2D/YaYflemH+KkVreYRgrsYGbWwf6lfrlkAZTLKhIDiYnwEepsgv5ZD+T40NY0NRkDdrtcNdY/1/sV81RKkQ8ObQSY0NvcDhJ2Ruokujz5fajdYCVvnO92eq4aTi7l3V2PCp0pajnNHBkfapQjKVUIq1IhvGjyww8plACF75GTauJBOI3Sp0GS17wqEN7SgBVvohBHdUSn8yJQ5DNFHeApFB++ugwD8EfBTsxEwWm8ZoOri+JCqkBrdi/9mTlmrKnFvp0Uenz4YlRyeCDciafxjep2qOvyw23dGUyuFOsCH9gutbtXDMUmbDBKBkSz7OBvubt+Vq4Y95UGXDVDlNoAJXkQAQfg64KP5gp8oGJXusSAFmFpDy/jSG8VTZ8FBlw/vDkclQ0ZnjxVv7Av5c7obvIUhYkSOkT4cmQUEn0VvtCyh25qoiRC9lNkxYthm1MB9gxT3VQIMPUsVNVb3pCYD6jrJGFyBw8Ausa61aDKCETSOaIp1Zkd3gTFDk8ikQi+isas+Uvemvqy7ElDYJPFBYnyuGkq6q2d9QmQ3TxdpZPYegGP595a0+VZeSclAxneOwqEEdNDOyikE3DGOu0zzbqlYZK0L0msYBDEcip4pX0IgGZ9PwVn/nn+Me3It3fvuXvSI3aXn3VFZgymyQTI+q06ViMFTUDwjeMnho78x3wsSyTdO0bdtapdH5qF22f6gUVVk3zN6qbFB10GQprKpazkOcDn+03I95qsOsB/hnrZUjH0WI/uPsySCdEGAEcNhBjBx5vvbrinKpWCpS2Zwpe9P7aRCHFap3QSWKwug6+dGiHt2JGX/l7PtZlQ23aTrTHuCeomUtkmvvZyDKxzxiZayQqfT4iY25YdiJ+7fmRuE9Na1fUIhAb1CPgqhofh+EOp7dIJULrSlv+kGtyOUmykj1kY/aiNXQP/hIqEH65V+P3+dB8AFrD1FWYGT5OJIp3bYsz/Ms2zarmTctTHTeY1d7ADlaPq9kmy/7L4l8mYkbvZ777LhImfgQ96bfcDXc7uvnvUu/ZH/5PZ6yJyYePXr8Y7IB3EN+E1cx2LerxEMIXFVwz3xzzqsbnmTGBcOmt6Xyi/va0BBNoSJ/YNyQVuZ66is5AJSIEnmoiOk+8Vt+8AXWlTiU2nUpkeGewGC6EL6jBBpP/bqSCeQCHyWz6g23KQJ9rIPCR34CnvVufpjObKn89vjukwn5CLSkeaGEK4t3ES1TlHCF1aedirgRaR31hf+0z64VwUqu12YKZ3oLqVFQ8z+ci9JcIEF2HNr3wKH4Xce09tXjck1Ec/zXtrGV44LIon1OLpQDI8Hm2KBYHosjRoklwgMtK5YC81Y65xWcpiO1YcWcEOtf9nydX1cKw/+y2YWhRWl8ZjPosuHURifyXCAhg0N3wejV6YsAvXcbQqkH5S/+uwcbb9HoQpNoWx070M4giED6kdW9C4UubQpOVAB0QS9rDgVAlVEs7a8R4dfIOW0kEig588defCjEBlSphhqArmtrtCAb2rI/10kDMi76VC7l/Rx9AscfiVRYTvXWqgVXSemxdAY348S4IdV78hVkzFCG5u3GHbd80TMQNUzObOlJ7KZpGkR+kLpLQgTD8v7WkeQsJIvpPBkVoHcQ4CYIJi5K+DI1TCoQtoIn/SG3aNWyOQBZrxzojHXhFpykVqm0rNiJ1n5UpN6XjrVVVcmeuLMn2xTSPookgq2C/pnct5vre6O6iX2p8ZdzflqsMcNx2zKbY6jQEVVaIlPHYMnSTSEVMQkX3I/UeR9SUYX+3iFwBsyBiZ+NQhKt9T9eEnXzAII8mIsvNSXHZCEJdNtkRKIl1L99hWAMFhSF19gqbVgfqgv7XXnmYI8Zm2Ar9g8wmzBQTr9XiCpaYPRPEKJ5TjFvpZjvP36UfT5XZZYLUE2M06C4GDjQMuONJfypBX79oKE8ceYlwUAl0ClKl5Zte3HQceuDdP+yBrs83u8txZI7nW0p5TmgK86agC/fIl0C/vTvJvESN9gOaIQD+fRl41up5+H3NeuRVNP6xVdcDJySPkHqywzXv8R9MANXNCUKNcNMcVpjVFWzp06TkIA5oLEcXbWohpeSFt9tLYP1c7fbHU/rFJmGMwrsJDdyAOJ4/lYVo6s1GZgtFA/rifYaYtUAjgeWKNR3r9HiUSmW5YGmqOn+oGQ4oxZxAzeETk6cVFPSPO2nYMAiBIOauQIfnhzlhZaTSuWD2fITzBQtx7by1hU8v0BhRQWVplSqEt1xIHqURlUwF0GLaaLuPwpxUWsKmXENhaZStFcqKtjiQC2hm3OkDvigAFN2kstjw0NV3/I7KeUlC1TLXKF1/6cqsubwQWknu7iL19EXkObRUK4S5iu3q/TvYfCGQrP2xqzCUY7beFdAprKOkYgNpG4IldFvPqr+lubmpvok6WZtb2YiMeRkMmFzIklptLAQBuWLSG9EuaxRtAOD9OoENsTye/68zab5gDNhrnSbgYtJlQ7L60pcvih3dAkCSGnAENgAlmvPfw5NaNVXNUacXoebrM184i1UJ5qppnoLTy4Yr2zaGRx6mELJ2ulKo1dOJxtFuLymew7ND/iqQfEZLsWJemJMNF6Oz8slgGPB25Kslq09A4fPal2S/STWimYAVyqOciGu0AuWbdyD+o0r/I9ct1HzlSiKYCXgJefHpwTGg6wU7qKflasaxZXfks1a4NCjrKRUKX27Wk18beBfJOVI+oQmRVOJBxU7ZQ0pjpDlFhYK06t8n4wj2dXZpQRXui+Sgh1ehNdROcLYv9U7V8RIYy4F5VWaEf2vTPU0NtfItNA+rynHhjMZOKGP6Fav8VbGeHtCIpkBLbSODTL1DdhPkU5lYridTDCgU7YWSXYXVSTKpQPzHsUmU5VSy1TtEQ5ujUb4ykdyDiuS2jxiTnk1yI/smqpd5aLGXrhEYkQ17lh/zGCLLqHZ0OKhjcVJRqwtOvRAUtGu3kC5xLUXPBtGHRo70zBsaFMLMo5AMRYVvGQywUxIswFFNG35yFrZXvZDqYN2pyn6bAR6YDlQa9nHf1rTXcYNjhkL88AnI1MG+/vrvq9DP28CiZb9/c+j4iY0h6RUGFJtoC7ja6Jl2Xh8e+UNZAZs/YCgtqB262P0I9Q0xgB/I3c58aSKH1wWrdhhs6HcgGkMlLQO7DfZOo6dau57GlP7dWZ440jtcBmyOEAV0lSLhBeXmFayXIVxuFpxvONBj6c/0Gk1Yqey8p6HMVgCYiPxRVsp7ZZwKmae7XToWJi9CDdp9DzCQUMt7Zl3DGJG/ZPT1jRd0BvdzbIXi2NEDGlU3LoZcuvZ5KRZzZbT+N4LQX67HQ55TiYUj9RIhnNuvUX/QWlUX/76dQ78Zz74KLYeErk9+MQ6BznwL+diFUArzs5+umHalpeUUuEG/gtpEdKWDGMl177R6EsP+x6WXgQkxcH1YEi4D7CXBZ94u6pVBQrmzOvfIUJPIMgnBENiY2CpmJXnk98cc4Zr4DfHIwCpunV/T2TT2g434kHzfFgkB/YSScmFhAAlqnJ41dgsMae3XMF2E1XUvF42NIGdHGzlgWleAGyjz9ltJIKhAv8wFk7e7xhoVcolI8vGfx1kYUiR430hMjVtVJzIA8EnLqJbR0gyqcfk0fGBMhTb1DJ0I4nI4Jt0XFd8IcG8x11RKwxS/3JXVUSw4SVf4iDIcFX+nBwz1+19BEBQdEbBJvpMCG2Sae9jtGFmtsnd3brdVSj0gfuFPs6GRGXbF5gqjiOU5Jp0YnzTLJvua6sw3zAtuxa5GOsWInyo2mXKIie02xL5aiuVp4tZfQrk/McdCcGGi0o9AfIaOXwwd/IbGHuHaj00EUW2AjsSVFnWLArRZHutaJPcxaHX3XMdOZt44wbO0qNqiEniZ8GAp/m8fa5KSx7yGjkxlP7ksEFfxqU3+fo5nbKt3zUPzk+wRmtrfyrFffNDRBePABhtOG/egk441vFKvZeuJBLstwcqpfaqFoo16wYaBS+bEpFqyHPYtp/foBNrT4Nc8H4pKGJ8baCdEKnLnPLt2M4ySisxoJYgJZp1HDyrLYYmmOWcekmAMqGoFXDbSNT6BvHgbyGOMn8ca5bA6qPBeiYn8UtIBBNuCyw5bJddP3upvllcrX0i2oHAs/qm8Nua9xml5R3Ovx4LpPFpZeRRv9zj64VNAQmcQ1SZUBmi3Qf7Wza26EqOLsCZ3ndkAhqVU/p10tsjs0VqJOyIb2LMpq9Ebl23F03x0ZaGnR5+BbFn29YyjU7U6xaB8HxCtGpAYCulcHTicBW6wavnQEPWFidEqWjndHBgWdEXQhkg2ho6+XCbfo87YnpdWamgN7LipFV5cZjVsWNhXy1Hcv+wy41zaXN2DLyKvqLtBtl93MbPW/Qcs2TExS9zH1gmH2YQ2EDFDLorUBgcQATrnamfwoVdhBYALoJqiL7YTNNgi89EEWbiXi+tsc+rAtJ/oN19bgJ/yY2/aauJaLGuXQukbhJuKlCIqyGe2ciwfNOiuki3mLE7rsM+n9zwlqvNZrWsTxz3kLj7Gh9f8nj1ffyQ24iR4AWlp8ZH58Vf2HSD5F9vnmh4aRH5pUcbw4MUHBCnPSeN/3Um58RPkRYzl47jZKKNj4ToIvKxYqRTx91fVqHk+4k8O6QQD3xFztHCPd6usOZHDDWDYrmhX468PdpOOl0z3yMzVsdWT/7vaC2c5OJvEmHcV+EvUI7EQSMZebOXq3Q1IyQorFmHFe4c3tolIYNd6ZoKcRFBapw5MKIjMLel1+V/t78ljwrpgH1TmQh8xPtrGtK+IlELswY3R8QHwSE2YtcQAYAOrKLRdwx0pNufI6SjOaWth8wP3HDpoY3zXCLqAtfAE5bPcrnQk4MCW7RH9XOj74YVSzP2odwTUxduWqJPyzk/6cl5obRhPIVIqFSHauj1Shug+s34+YWjrK/aiwmCh3aEWGKM450pMmQL3wEcCiXPf26o0aGLnFsqyJbU9RVioTdbEFRMsBeWLmt6IBZeqB010i00PeMd4M34nT1Goiqgc0BRjy8SJe0kCxzA/52pnWaJqwT/zb6HZumhb0Zg6ZxANOVyYqokWyz8rrAJcW0oS8Ti3bCGkwJbermA7rWBc1Pskle6JHIVvuDygcZTOJvrSj7B0+haLRJ5u/V9Xx1MzPOpzqpYyvUqQZoGRiB/4C+TyTSuOekaEd5071pARsUHMeLncL4nybMLf7Uq9zC4mV/3XWxWPiZz1Hj90LHXI4J4/BcVfE+1Kb8uVe+N8HO4UbIxSONn5Y3TDV8Q3c3X3rcjxWCC0zLZhtNyJcdIJUD4IL83Mp+7G+3arf723v7kExKeqvhhuvPvZLaJRtOBZkLaUogAFz3SisZja5ZWf3Iedd1VhVoTnnC1GfZNq5QSKpL4E343RWJ3xH5qURWXVthFNuAVPhqmplMe1zGsI2tVVmD/P0i9BQPWWTvDjliA2uVDixHt+oH+L5tq83FE7yEcrvYVqqmQbDAfEGI7uOTXoHxWMaSgUSiB1Ik+6flWs9eAH9lkFrxuWIMkodEtp/DjwdYebC+a1fgwA06bfsihQRjqJNFCig2qmwCICB3FVwNkzmSnVCAaOKWskYImeSCzB+6HRymyBBnT5uvliqM/J07w11Hr+DeRnUzz5FiLAUlgY0gu0wRVLd372NzGUo2LI3HyzFi+HpLHxu2km8ZGp762sw57bGbYyAfZMNLBjQa4Vy1ybk96SOqs/+DjLt/cmkAOhEjSWOcOgWLoZsib7nCrmk5iWbZyrU5At9ZqsHj8ixPTcAL0FyuJSZRPA1Glob1+vPR06CoAhsKKkc7iQrWH2PxsJl8N9jDmoKfbdVSkqzmn9J2ikU4PoFPnxeSrYbYbjllqO3nzh0DZkUaLomvcRPpSrWVfUXodvEV2U8uxwh8w1IQh9z89xFaeJKRCFoQcCRgB/UgexedPepx2Rb/9fp9tyh7QNtZZheAykHkZf8qjYmvaiFmdOI/SZO5XjtRWdiMdKwLuCgVCF2Pp3j4SGHt9U4OPEFgth4HIsYKJI/ssd8IzUluKuHo4bYFodFkf6j4cy39EcQvzt+lNBReKS7Dy1doMDux8OlYMCMAbHUJ4kvtcfUcZkygmHITGseiNL8datejoCLrucXFrQzbjEm0mOfestFBU2TBVydwOKhE3Yo52oi2sOTaszroGQkglKm/UJEd7QiVRVS3vjvlCuRgvvQgqiHVGA6yfNJ/gWJ+KiOVQUJ+I21MRKDtSYDmrXDUWs1hhngTM0iTlHmVg0T63OmkoP2brNFwmnrcMi9TqioP4UcV4owLUl9eHn2M7ZF+mOyu0jaV32u3lJLgSKpfp/t74ydwtdT/q8RAMRONvjYo3D8BynSih+Wgm9M+jGV1hDP/qWIdT5jvmOWQgdbw4CgBB/P8nOmQ8EXvtrRuVIgbRqmPcIwqhJoqboHpgnw6u/TRSMbuLYllsz4mDo8/YfeHGU4+zCnDhuiCQLGh3atKmKoMqIwsBpkw4TfuQKZYdN9P8Ej7x0Z0WtB79tR3FgnQTZSOfJtksN3I6yRd+IeZXuSLJGYMyPu7JNKu5+HIYGyQsREJRVWdW6gFC8clAWovfwsQ2JWI1UKMPxhGzwWzZ7kzJhlnKbcXLGTZ0JLufsMIYeuQsbl7ZVChORE9eg0UPFyYYCnjKQmwBKaV79d8JU9x6zq7Hnuh6ipFA242wB1FHkW82B+R6uro4+GZGPYi3VB4LdCPp2Lc7L0rwanuQU9WjFJQoZbbEErXy56N6TeT7xD7BoukWHgvyE9Cau+8qS5zjC8ch2P+upwfMqs3U1PmbExUu8lP5E0U2QGCge1C2RV17ckkniipq2hMWecHdUnlKuBxC2F6nrKlgz4uJ5BLRggBReN12PxNBojVd+5cDDgTm/srEdaUZFqP1pFk4Hzjo46SFmiXph75uImQs8DrVy3Zd/DlpWryeYE8H9/uTJpwPTJ30Z2cwKpHXJxagsp+zpTCbOGKxmC3cAvn9PyTRes9qgvEgtGspqFweM71lt3kj8mXRpE5LR+CzcWFe4MK+Rly8gGfFRnVtjV0lncSWytfp5aEh2LqPjSEtEP5fDPOz0jsuHbd7yiCpX9L5AH41ti3W8/9jwgx2gSnFnPLsUTKZda3sEE7t3qymgeVSmI7GUOTn/5UJQHDqpd8ZTgsdrHyaKG3XQ3Z2SysY+uROWsYvIs85la+2LC+JI6SjntNEc0O0PGu3iz9VAlmGFonrXB+lorg8o1BO7P8D1WcxBxaNAjEAAAAASUVORK5CYII=" alt="Acting Masks">
                    <div class="card-body">
                        <h5 class="card-title">ACTORS</h5>
                        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                        <a href="./actors.html" class="btn btn-primary">Go To Actors</a>
                    </div>
                </div> 
            </div>
        </div>
    </div>

    `
}



module.exports = {
    movieRow,
    newMovie,
    createActorList,
    displayNewMovie,
    actorRow,
    createMovieList,
    createMovieOption,
    createCheckedMovieOption,
    populateFullDropdown,
    populateDropdown,
    newActor,
    displayNewActor,
    displayHomePageMenu
};
},{}]},{},[28])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL2lzQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0F4aW9zLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9jcmVhdGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9kaXNwYXRjaFJlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3NldHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS90cmFuc2Zvcm1EYXRhLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2J0b2EuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29tYmluZVVSTHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29va2llcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9zcHJlYWQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJzY3JpcHRzL21haW4uanMiLCJzY3JpcHRzL3RlbXBsYXRlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2F4aW9zJyk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgc2V0dGxlID0gcmVxdWlyZSgnLi8uLi9jb3JlL3NldHRsZScpO1xudmFyIGJ1aWxkVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J1aWxkVVJMJyk7XG52YXIgcGFyc2VIZWFkZXJzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL3BhcnNlSGVhZGVycycpO1xudmFyIGlzVVJMU2FtZU9yaWdpbiA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc1VSTFNhbWVPcmlnaW4nKTtcbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY3JlYXRlRXJyb3InKTtcbnZhciBidG9hID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5idG9hICYmIHdpbmRvdy5idG9hLmJpbmQod2luZG93KSkgfHwgcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J0b2EnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB4aHJBZGFwdGVyKGNvbmZpZykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZGlzcGF0Y2hYaHJSZXF1ZXN0KHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXF1ZXN0RGF0YSA9IGNvbmZpZy5kYXRhO1xuICAgIHZhciByZXF1ZXN0SGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzO1xuXG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEocmVxdWVzdERhdGEpKSB7XG4gICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddOyAvLyBMZXQgdGhlIGJyb3dzZXIgc2V0IGl0XG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB2YXIgbG9hZEV2ZW50ID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSc7XG4gICAgdmFyIHhEb21haW4gPSBmYWxzZTtcblxuICAgIC8vIEZvciBJRSA4LzkgQ09SUyBzdXBwb3J0XG4gICAgLy8gT25seSBzdXBwb3J0cyBQT1NUIGFuZCBHRVQgY2FsbHMgYW5kIGRvZXNuJ3QgcmV0dXJucyB0aGUgcmVzcG9uc2UgaGVhZGVycy5cbiAgICAvLyBET04nVCBkbyB0aGlzIGZvciB0ZXN0aW5nIGIvYyBYTUxIdHRwUmVxdWVzdCBpcyBtb2NrZWQsIG5vdCBYRG9tYWluUmVxdWVzdC5cbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICd0ZXN0JyAmJlxuICAgICAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiByZXF1ZXN0KSAmJlxuICAgICAgICAhaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgbG9hZEV2ZW50ID0gJ29ubG9hZCc7XG4gICAgICB4RG9tYWluID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uIGhhbmRsZVByb2dyZXNzKCkge307XG4gICAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7fTtcbiAgICB9XG5cbiAgICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XG4gICAgICB2YXIgdXNlcm5hbWUgPSBjb25maWcuYXV0aC51c2VybmFtZSB8fCAnJztcbiAgICAgIHZhciBwYXNzd29yZCA9IGNvbmZpZy5hdXRoLnBhc3N3b3JkIHx8ICcnO1xuICAgICAgcmVxdWVzdEhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCYXNpYyAnICsgYnRvYSh1c2VybmFtZSArICc6JyArIHBhc3N3b3JkKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChjb25maWcudXJsLCBjb25maWcucGFyYW1zLCBjb25maWcucGFyYW1zU2VyaWFsaXplciksIHRydWUpO1xuXG4gICAgLy8gU2V0IHRoZSByZXF1ZXN0IHRpbWVvdXQgaW4gTVNcbiAgICByZXF1ZXN0LnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcblxuICAgIC8vIExpc3RlbiBmb3IgcmVhZHkgc3RhdGVcbiAgICByZXF1ZXN0W2xvYWRFdmVudF0gPSBmdW5jdGlvbiBoYW5kbGVMb2FkKCkge1xuICAgICAgaWYgKCFyZXF1ZXN0IHx8IChyZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQgJiYgIXhEb21haW4pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHJlcXVlc3QgZXJyb3JlZCBvdXQgYW5kIHdlIGRpZG4ndCBnZXQgYSByZXNwb25zZSwgdGhpcyB3aWxsIGJlXG4gICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxuICAgICAgLy8gV2l0aCBvbmUgZXhjZXB0aW9uOiByZXF1ZXN0IHRoYXQgdXNpbmcgZmlsZTogcHJvdG9jb2wsIG1vc3QgYnJvd3NlcnNcbiAgICAgIC8vIHdpbGwgcmV0dXJuIHN0YXR1cyBhcyAwIGV2ZW4gdGhvdWdoIGl0J3MgYSBzdWNjZXNzZnVsIHJlcXVlc3RcbiAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFByZXBhcmUgdGhlIHJlc3BvbnNlXG4gICAgICB2YXIgcmVzcG9uc2VIZWFkZXJzID0gJ2dldEFsbFJlc3BvbnNlSGVhZGVycycgaW4gcmVxdWVzdCA/IHBhcnNlSGVhZGVycyhyZXF1ZXN0LmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSA6IG51bGw7XG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gIWNvbmZpZy5yZXNwb25zZVR5cGUgfHwgY29uZmlnLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnID8gcmVxdWVzdC5yZXNwb25zZVRleHQgOiByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgdmFyIHJlc3BvbnNlID0ge1xuICAgICAgICBkYXRhOiByZXNwb25zZURhdGEsXG4gICAgICAgIC8vIElFIHNlbmRzIDEyMjMgaW5zdGVhZCBvZiAyMDQgKGh0dHBzOi8vZ2l0aHViLmNvbS9heGlvcy9heGlvcy9pc3N1ZXMvMjAxKVxuICAgICAgICBzdGF0dXM6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gMjA0IDogcmVxdWVzdC5zdGF0dXMsXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gJ05vIENvbnRlbnQnIDogcmVxdWVzdC5zdGF0dXNUZXh0LFxuICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXG4gICAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICB9O1xuXG4gICAgICBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgbG93IGxldmVsIG5ldHdvcmsgZXJyb3JzXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XG4gICAgICAvLyBSZWFsIGVycm9ycyBhcmUgaGlkZGVuIGZyb20gdXMgYnkgdGhlIGJyb3dzZXJcbiAgICAgIC8vIG9uZXJyb3Igc2hvdWxkIG9ubHkgZmlyZSBpZiBpdCdzIGEgbmV0d29yayBlcnJvclxuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCdOZXR3b3JrIEVycm9yJywgY29uZmlnLCBudWxsLCByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgdGltZW91dFxuICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHtcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcigndGltZW91dCBvZiAnICsgY29uZmlnLnRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnLCBjb25maWcsICdFQ09OTkFCT1JURUQnLFxuICAgICAgICByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAvLyBUaGlzIGlzIG9ubHkgZG9uZSBpZiBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICAvLyBTcGVjaWZpY2FsbHkgbm90IGlmIHdlJ3JlIGluIGEgd2ViIHdvcmtlciwgb3IgcmVhY3QtbmF0aXZlLlxuICAgIGlmICh1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpKSB7XG4gICAgICB2YXIgY29va2llcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb29raWVzJyk7XG5cbiAgICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgICAgdmFyIHhzcmZWYWx1ZSA9IChjb25maWcud2l0aENyZWRlbnRpYWxzIHx8IGlzVVJMU2FtZU9yaWdpbihjb25maWcudXJsKSkgJiYgY29uZmlnLnhzcmZDb29raWVOYW1lID9cbiAgICAgICAgICBjb29raWVzLnJlYWQoY29uZmlnLnhzcmZDb29raWVOYW1lKSA6XG4gICAgICAgICAgdW5kZWZpbmVkO1xuXG4gICAgICBpZiAoeHNyZlZhbHVlKSB7XG4gICAgICAgIHJlcXVlc3RIZWFkZXJzW2NvbmZpZy54c3JmSGVhZGVyTmFtZV0gPSB4c3JmVmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3RcbiAgICBpZiAoJ3NldFJlcXVlc3RIZWFkZXInIGluIHJlcXVlc3QpIHtcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMsIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiByZXF1ZXN0RGF0YSA9PT0gJ3VuZGVmaW5lZCcgJiYga2V5LnRvTG93ZXJDYXNlKCkgPT09ICdjb250ZW50LXR5cGUnKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIENvbnRlbnQtVHlwZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSBhZGQgaGVhZGVyIHRvIHRoZSByZXF1ZXN0XG4gICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHdpdGhDcmVkZW50aWFscyB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcud2l0aENyZWRlbnRpYWxzKSB7XG4gICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gQWRkIHJlc3BvbnNlVHlwZSB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IGNvbmZpZy5yZXNwb25zZVR5cGU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEV4cGVjdGVkIERPTUV4Y2VwdGlvbiB0aHJvd24gYnkgYnJvd3NlcnMgbm90IGNvbXBhdGlibGUgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMi5cbiAgICAgICAgLy8gQnV0LCB0aGlzIGNhbiBiZSBzdXBwcmVzc2VkIGZvciAnanNvbicgdHlwZSBhcyBpdCBjYW4gYmUgcGFyc2VkIGJ5IGRlZmF1bHQgJ3RyYW5zZm9ybVJlc3BvbnNlJyBmdW5jdGlvbi5cbiAgICAgICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUgIT09ICdqc29uJykge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgcHJvZ3Jlc3MgaWYgbmVlZGVkXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25Eb3dubG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uRG93bmxvYWRQcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgLy8gTm90IGFsbCBicm93c2VycyBzdXBwb3J0IHVwbG9hZCBldmVudHNcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nICYmIHJlcXVlc3QudXBsb2FkKSB7XG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgICAvLyBIYW5kbGUgY2FuY2VsbGF0aW9uXG4gICAgICBjb25maWcuY2FuY2VsVG9rZW4ucHJvbWlzZS50aGVuKGZ1bmN0aW9uIG9uQ2FuY2VsZWQoY2FuY2VsKSB7XG4gICAgICAgIGlmICghcmVxdWVzdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcXVlc3QuYWJvcnQoKTtcbiAgICAgICAgcmVqZWN0KGNhbmNlbCk7XG4gICAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVxdWVzdERhdGEgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcbiAgICByZXF1ZXN0LnNlbmQocmVxdWVzdERhdGEpO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBiaW5kID0gcmVxdWlyZSgnLi9oZWxwZXJzL2JpbmQnKTtcbnZhciBBeGlvcyA9IHJlcXVpcmUoJy4vY29yZS9BeGlvcycpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBBeGlvc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0Q29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdENvbmZpZykge1xuICB2YXIgY29udGV4dCA9IG5ldyBBeGlvcyhkZWZhdWx0Q29uZmlnKTtcbiAgdmFyIGluc3RhbmNlID0gYmluZChBeGlvcy5wcm90b3R5cGUucmVxdWVzdCwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBBeGlvcy5wcm90b3R5cGUsIGNvbnRleHQpO1xuXG4gIC8vIENvcHkgY29udGV4dCB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIGNvbnRleHQpO1xuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IGluc3RhbmNlIHRvIGJlIGV4cG9ydGVkXG52YXIgYXhpb3MgPSBjcmVhdGVJbnN0YW5jZShkZWZhdWx0cyk7XG5cbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxuYXhpb3MuQXhpb3MgPSBBeGlvcztcblxuLy8gRmFjdG9yeSBmb3IgY3JlYXRpbmcgbmV3IGluc3RhbmNlc1xuYXhpb3MuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKGluc3RhbmNlQ29uZmlnKSB7XG4gIHJldHVybiBjcmVhdGVJbnN0YW5jZSh1dGlscy5tZXJnZShkZWZhdWx0cywgaW5zdGFuY2VDb25maWcpKTtcbn07XG5cbi8vIEV4cG9zZSBDYW5jZWwgJiBDYW5jZWxUb2tlblxuYXhpb3MuQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsJyk7XG5heGlvcy5DYW5jZWxUb2tlbiA9IHJlcXVpcmUoJy4vY2FuY2VsL0NhbmNlbFRva2VuJyk7XG5heGlvcy5pc0NhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL2lzQ2FuY2VsJyk7XG5cbi8vIEV4cG9zZSBhbGwvc3ByZWFkXG5heGlvcy5hbGwgPSBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn07XG5heGlvcy5zcHJlYWQgPSByZXF1aXJlKCcuL2hlbHBlcnMvc3ByZWFkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYXhpb3M7XG5cbi8vIEFsbG93IHVzZSBvZiBkZWZhdWx0IGltcG9ydCBzeW50YXggaW4gVHlwZVNjcmlwdFxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IGF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgYENhbmNlbGAgaXMgYW4gb2JqZWN0IHRoYXQgaXMgdGhyb3duIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbmNlbGVkLlxuICpcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtzdHJpbmc9fSBtZXNzYWdlIFRoZSBtZXNzYWdlLlxuICovXG5mdW5jdGlvbiBDYW5jZWwobWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufVxuXG5DYW5jZWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiAnQ2FuY2VsJyArICh0aGlzLm1lc3NhZ2UgPyAnOiAnICsgdGhpcy5tZXNzYWdlIDogJycpO1xufTtcblxuQ2FuY2VsLnByb3RvdHlwZS5fX0NBTkNFTF9fID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDYW5jZWwgPSByZXF1aXJlKCcuL0NhbmNlbCcpO1xuXG4vKipcbiAqIEEgYENhbmNlbFRva2VuYCBpcyBhbiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byByZXF1ZXN0IGNhbmNlbGxhdGlvbiBvZiBhbiBvcGVyYXRpb24uXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBleGVjdXRvciBUaGUgZXhlY3V0b3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIENhbmNlbFRva2VuKGV4ZWN1dG9yKSB7XG4gIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleGVjdXRvciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIH1cblxuICB2YXIgcmVzb2x2ZVByb21pc2U7XG4gIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIHByb21pc2VFeGVjdXRvcihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xuICB9KTtcblxuICB2YXIgdG9rZW4gPSB0aGlzO1xuICBleGVjdXRvcihmdW5jdGlvbiBjYW5jZWwobWVzc2FnZSkge1xuICAgIGlmICh0b2tlbi5yZWFzb24pIHtcbiAgICAgIC8vIENhbmNlbGxhdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHJlcXVlc3RlZFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRva2VuLnJlYXNvbiA9IG5ldyBDYW5jZWwobWVzc2FnZSk7XG4gICAgcmVzb2x2ZVByb21pc2UodG9rZW4ucmVhc29uKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAqL1xuQ2FuY2VsVG9rZW4ucHJvdG90eXBlLnRocm93SWZSZXF1ZXN0ZWQgPSBmdW5jdGlvbiB0aHJvd0lmUmVxdWVzdGVkKCkge1xuICBpZiAodGhpcy5yZWFzb24pIHtcbiAgICB0aHJvdyB0aGlzLnJlYXNvbjtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXG4gKiBjYW5jZWxzIHRoZSBgQ2FuY2VsVG9rZW5gLlxuICovXG5DYW5jZWxUb2tlbi5zb3VyY2UgPSBmdW5jdGlvbiBzb3VyY2UoKSB7XG4gIHZhciBjYW5jZWw7XG4gIHZhciB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbihmdW5jdGlvbiBleGVjdXRvcihjKSB7XG4gICAgY2FuY2VsID0gYztcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgdG9rZW46IHRva2VuLFxuICAgIGNhbmNlbDogY2FuY2VsXG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbFRva2VuO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQ2FuY2VsKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vLi4vZGVmYXVsdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBJbnRlcmNlcHRvck1hbmFnZXIgPSByZXF1aXJlKCcuL0ludGVyY2VwdG9yTWFuYWdlcicpO1xudmFyIGRpc3BhdGNoUmVxdWVzdCA9IHJlcXVpcmUoJy4vZGlzcGF0Y2hSZXF1ZXN0Jyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlQ29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIEF4aW9zKGluc3RhbmNlQ29uZmlnKSB7XG4gIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcbiAgdGhpcy5pbnRlcmNlcHRvcnMgPSB7XG4gICAgcmVxdWVzdDogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpLFxuICAgIHJlc3BvbnNlOiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKClcbiAgfTtcbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcgc3BlY2lmaWMgZm9yIHRoaXMgcmVxdWVzdCAobWVyZ2VkIHdpdGggdGhpcy5kZWZhdWx0cylcbiAqL1xuQXhpb3MucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgLy8gQWxsb3cgZm9yIGF4aW9zKCdleGFtcGxlL3VybCdbLCBjb25maWddKSBhIGxhIGZldGNoIEFQSVxuICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25maWcgPSB1dGlscy5tZXJnZSh7XG4gICAgICB1cmw6IGFyZ3VtZW50c1swXVxuICAgIH0sIGFyZ3VtZW50c1sxXSk7XG4gIH1cblxuICBjb25maWcgPSB1dGlscy5tZXJnZShkZWZhdWx0cywge21ldGhvZDogJ2dldCd9LCB0aGlzLmRlZmF1bHRzLCBjb25maWcpO1xuICBjb25maWcubWV0aG9kID0gY29uZmlnLm1ldGhvZC50b0xvd2VyQ2FzZSgpO1xuXG4gIC8vIEhvb2sgdXAgaW50ZXJjZXB0b3JzIG1pZGRsZXdhcmVcbiAgdmFyIGNoYWluID0gW2Rpc3BhdGNoUmVxdWVzdCwgdW5kZWZpbmVkXTtcbiAgdmFyIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoY29uZmlnKTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXF1ZXN0LmZvckVhY2goZnVuY3Rpb24gdW5zaGlmdFJlcXVlc3RJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcbiAgICBjaGFpbi51bnNoaWZ0KGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xuICB9KTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIHB1c2hSZXNwb25zZUludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnB1c2goaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHdoaWxlIChjaGFpbi5sZW5ndGgpIHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGNoYWluLnNoaWZ0KCksIGNoYWluLnNoaWZ0KCkpO1xuICB9XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vLyBQcm92aWRlIGFsaWFzZXMgZm9yIHN1cHBvcnRlZCByZXF1ZXN0IG1ldGhvZHNcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAnb3B0aW9ucyddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmxcbiAgICB9KSk7XG4gIH07XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdXJsLFxuICAgICAgZGF0YTogZGF0YVxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEludGVyY2VwdG9yTWFuYWdlcigpIHtcbiAgdGhpcy5oYW5kbGVycyA9IFtdO1xufVxuXG4vKipcbiAqIEFkZCBhIG5ldyBpbnRlcmNlcHRvciB0byB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgdGhlbmAgZm9yIGEgYFByb21pc2VgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGByZWplY3RgIGZvciBhIGBQcm9taXNlYFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQW4gSUQgdXNlZCB0byByZW1vdmUgaW50ZXJjZXB0b3IgbGF0ZXJcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiB1c2UoZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICB0aGlzLmhhbmRsZXJzLnB1c2goe1xuICAgIGZ1bGZpbGxlZDogZnVsZmlsbGVkLFxuICAgIHJlamVjdGVkOiByZWplY3RlZFxuICB9KTtcbiAgcmV0dXJuIHRoaXMuaGFuZGxlcnMubGVuZ3RoIC0gMTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGludGVyY2VwdG9yIGZyb20gdGhlIHN0YWNrXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFRoZSBJRCB0aGF0IHdhcyByZXR1cm5lZCBieSBgdXNlYFxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmVqZWN0ID0gZnVuY3Rpb24gZWplY3QoaWQpIHtcbiAgaWYgKHRoaXMuaGFuZGxlcnNbaWRdKSB7XG4gICAgdGhpcy5oYW5kbGVyc1tpZF0gPSBudWxsO1xuICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbGwgdGhlIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzXG4gKlxuICogVGhpcyBtZXRob2QgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3Igc2tpcHBpbmcgb3ZlciBhbnlcbiAqIGludGVyY2VwdG9ycyB0aGF0IG1heSBoYXZlIGJlY29tZSBgbnVsbGAgY2FsbGluZyBgZWplY3RgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGludGVyY2VwdG9yXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2goZm4pIHtcbiAgdXRpbHMuZm9yRWFjaCh0aGlzLmhhbmRsZXJzLCBmdW5jdGlvbiBmb3JFYWNoSGFuZGxlcihoKSB7XG4gICAgaWYgKGggIT09IG51bGwpIHtcbiAgICAgIGZuKGgpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyY2VwdG9yTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGVuaGFuY2VFcnJvciA9IHJlcXVpcmUoJy4vZW5oYW5jZUVycm9yJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBjcmVhdGVkIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICByZXR1cm4gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciB0cmFuc2Zvcm1EYXRhID0gcmVxdWlyZSgnLi90cmFuc2Zvcm1EYXRhJyk7XG52YXIgaXNDYW5jZWwgPSByZXF1aXJlKCcuLi9jYW5jZWwvaXNDYW5jZWwnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRzJyk7XG52YXIgaXNBYnNvbHV0ZVVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc0Fic29sdXRlVVJMJyk7XG52YXIgY29tYmluZVVSTHMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29tYmluZVVSTHMnKTtcblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5mdW5jdGlvbiB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZykge1xuICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgY29uZmlnLmNhbmNlbFRva2VuLnRocm93SWZSZXF1ZXN0ZWQoKTtcbiAgfVxufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIHVzaW5nIHRoZSBjb25maWd1cmVkIGFkYXB0ZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHRoYXQgaXMgdG8gYmUgdXNlZCBmb3IgdGhlIHJlcXVlc3RcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkaXNwYXRjaFJlcXVlc3QoY29uZmlnKSB7XG4gIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAvLyBTdXBwb3J0IGJhc2VVUkwgY29uZmlnXG4gIGlmIChjb25maWcuYmFzZVVSTCAmJiAhaXNBYnNvbHV0ZVVSTChjb25maWcudXJsKSkge1xuICAgIGNvbmZpZy51cmwgPSBjb21iaW5lVVJMcyhjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XG4gIH1cblxuICAvLyBFbnN1cmUgaGVhZGVycyBleGlzdFxuICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuXG4gIC8vIFRyYW5zZm9ybSByZXF1ZXN0IGRhdGFcbiAgY29uZmlnLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgIGNvbmZpZy5kYXRhLFxuICAgIGNvbmZpZy5oZWFkZXJzLFxuICAgIGNvbmZpZy50cmFuc2Zvcm1SZXF1ZXN0XG4gICk7XG5cbiAgLy8gRmxhdHRlbiBoZWFkZXJzXG4gIGNvbmZpZy5oZWFkZXJzID0gdXRpbHMubWVyZ2UoXG4gICAgY29uZmlnLmhlYWRlcnMuY29tbW9uIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzW2NvbmZpZy5tZXRob2RdIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzIHx8IHt9XG4gICk7XG5cbiAgdXRpbHMuZm9yRWFjaChcbiAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcbiAgICBmdW5jdGlvbiBjbGVhbkhlYWRlckNvbmZpZyhtZXRob2QpIHtcbiAgICAgIGRlbGV0ZSBjb25maWcuaGVhZGVyc1ttZXRob2RdO1xuICAgIH1cbiAgKTtcblxuICB2YXIgYWRhcHRlciA9IGNvbmZpZy5hZGFwdGVyIHx8IGRlZmF1bHRzLmFkYXB0ZXI7XG5cbiAgcmV0dXJuIGFkYXB0ZXIoY29uZmlnKS50aGVuKGZ1bmN0aW9uIG9uQWRhcHRlclJlc29sdXRpb24ocmVzcG9uc2UpIHtcbiAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxuICAgIHJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgICAgcmVzcG9uc2UuZGF0YSxcbiAgICAgIHJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LCBmdW5jdGlvbiBvbkFkYXB0ZXJSZWplY3Rpb24ocmVhc29uKSB7XG4gICAgaWYgKCFpc0NhbmNlbChyZWFzb24pKSB7XG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xuICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlYXNvbik7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVcGRhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIGNvbmZpZywgZXJyb3IgY29kZSwgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICBlcnJvci5jb25maWcgPSBjb25maWc7XG4gIGlmIChjb2RlKSB7XG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XG4gIH1cbiAgZXJyb3IucmVxdWVzdCA9IHJlcXVlc3Q7XG4gIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gIHJldHVybiBlcnJvcjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vY3JlYXRlRXJyb3InKTtcblxuLyoqXG4gKiBSZXNvbHZlIG9yIHJlamVjdCBhIFByb21pc2UgYmFzZWQgb24gcmVzcG9uc2Ugc3RhdHVzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmUgQSBmdW5jdGlvbiB0aGF0IHJlc29sdmVzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IEEgZnVuY3Rpb24gdGhhdCByZWplY3RzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFRoZSByZXNwb25zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSkge1xuICB2YXIgdmFsaWRhdGVTdGF0dXMgPSByZXNwb25zZS5jb25maWcudmFsaWRhdGVTdGF0dXM7XG4gIC8vIE5vdGU6IHN0YXR1cyBpcyBub3QgZXhwb3NlZCBieSBYRG9tYWluUmVxdWVzdFxuICBpZiAoIXJlc3BvbnNlLnN0YXR1cyB8fCAhdmFsaWRhdGVTdGF0dXMgfHwgdmFsaWRhdGVTdGF0dXMocmVzcG9uc2Uuc3RhdHVzKSkge1xuICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICB9IGVsc2Uge1xuICAgIHJlamVjdChjcmVhdGVFcnJvcihcbiAgICAgICdSZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlICcgKyByZXNwb25zZS5zdGF0dXMsXG4gICAgICByZXNwb25zZS5jb25maWcsXG4gICAgICBudWxsLFxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcbiAgICAgIHJlc3BvbnNlXG4gICAgKSk7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gdGhlIGRhdGEgZm9yIGEgcmVxdWVzdCBvciBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGJlIHRyYW5zZm9ybWVkXG4gKiBAcGFyYW0ge0FycmF5fSBoZWFkZXJzIFRoZSBoZWFkZXJzIGZvciB0aGUgcmVxdWVzdCBvciByZXNwb25zZVxuICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZm5zIEEgc2luZ2xlIGZ1bmN0aW9uIG9yIEFycmF5IG9mIGZ1bmN0aW9uc1xuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSwgaGVhZGVycywgZm5zKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICB1dGlscy5mb3JFYWNoKGZucywgZnVuY3Rpb24gdHJhbnNmb3JtKGZuKSB7XG4gICAgZGF0YSA9IGZuKGRhdGEsIGhlYWRlcnMpO1xuICB9KTtcblxuICByZXR1cm4gZGF0YTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUnKTtcblxudmFyIERFRkFVTFRfQ09OVEVOVF9UWVBFID0ge1xuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbmZ1bmN0aW9uIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCB2YWx1ZSkge1xuICBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnMpICYmIHV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddKSkge1xuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEFkYXB0ZXIoKSB7XG4gIHZhciBhZGFwdGVyO1xuICBpZiAodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBicm93c2VycyB1c2UgWEhSIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy94aHInKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBGb3Igbm9kZSB1c2UgSFRUUCBhZGFwdGVyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMvaHR0cCcpO1xuICB9XG4gIHJldHVybiBhZGFwdGVyO1xufVxuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGFkYXB0ZXI6IGdldERlZmF1bHRBZGFwdGVyKCksXG5cbiAgdHJhbnNmb3JtUmVxdWVzdDogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlcXVlc3QoZGF0YSwgaGVhZGVycykge1xuICAgIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgJ0NvbnRlbnQtVHlwZScpO1xuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0FycmF5QnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0J1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzRmlsZShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCbG9iKGRhdGEpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XG4gICAgICByZXR1cm4gZGF0YS5idWZmZXI7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIGRhdGEudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgdHJhbnNmb3JtUmVzcG9uc2U6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXNwb25zZShkYXRhKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICB9IGNhdGNoIChlKSB7IC8qIElnbm9yZSAqLyB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICAvKipcbiAgICogQSB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyB0byBhYm9ydCBhIHJlcXVlc3QuIElmIHNldCB0byAwIChkZWZhdWx0KSBhXG4gICAqIHRpbWVvdXQgaXMgbm90IGNyZWF0ZWQuXG4gICAqL1xuICB0aW1lb3V0OiAwLFxuXG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJyxcblxuICBtYXhDb250ZW50TGVuZ3RoOiAtMSxcblxuICB2YWxpZGF0ZVN0YXR1czogZnVuY3Rpb24gdmFsaWRhdGVTdGF0dXMoc3RhdHVzKSB7XG4gICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xuICB9XG59O1xuXG5kZWZhdWx0cy5oZWFkZXJzID0ge1xuICBjb21tb246IHtcbiAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKidcbiAgfVxufTtcblxudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB7fTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB1dGlscy5tZXJnZShERUZBVUxUX0NPTlRFTlRfVFlQRSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKCkge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gYnRvYSBwb2x5ZmlsbCBmb3IgSUU8MTAgY291cnRlc3kgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkY2hhbWJlcnMvQmFzZTY0LmpzXG5cbnZhciBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPSc7XG5cbmZ1bmN0aW9uIEUoKSB7XG4gIHRoaXMubWVzc2FnZSA9ICdTdHJpbmcgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXInO1xufVxuRS5wcm90b3R5cGUgPSBuZXcgRXJyb3I7XG5FLnByb3RvdHlwZS5jb2RlID0gNTtcbkUucHJvdG90eXBlLm5hbWUgPSAnSW52YWxpZENoYXJhY3RlckVycm9yJztcblxuZnVuY3Rpb24gYnRvYShpbnB1dCkge1xuICB2YXIgc3RyID0gU3RyaW5nKGlucHV0KTtcbiAgdmFyIG91dHB1dCA9ICcnO1xuICBmb3IgKFxuICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyXG4gICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnM7XG4gICAgLy8gaWYgdGhlIG5leHQgc3RyIGluZGV4IGRvZXMgbm90IGV4aXN0OlxuICAgIC8vICAgY2hhbmdlIHRoZSBtYXBwaW5nIHRhYmxlIHRvIFwiPVwiXG4gICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xuICAgIHN0ci5jaGFyQXQoaWR4IHwgMCkgfHwgKG1hcCA9ICc9JywgaWR4ICUgMSk7XG4gICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcbiAgICBvdXRwdXQgKz0gbWFwLmNoYXJBdCg2MyAmIGJsb2NrID4+IDggLSBpZHggJSAxICogOClcbiAgKSB7XG4gICAgY2hhckNvZGUgPSBzdHIuY2hhckNvZGVBdChpZHggKz0gMyAvIDQpO1xuICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcbiAgICAgIHRocm93IG5ldyBFKCk7XG4gICAgfVxuICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnRvYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBlbmNvZGUodmFsKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsKS5cbiAgICByZXBsYWNlKC8lNDAvZ2ksICdAJykuXG4gICAgcmVwbGFjZSgvJTNBL2dpLCAnOicpLlxuICAgIHJlcGxhY2UoLyUyNC9nLCAnJCcpLlxuICAgIHJlcGxhY2UoLyUyQy9naSwgJywnKS5cbiAgICByZXBsYWNlKC8lMjAvZywgJysnKS5cbiAgICByZXBsYWNlKC8lNUIvZ2ksICdbJykuXG4gICAgcmVwbGFjZSgvJTVEL2dpLCAnXScpO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgVVJMIGJ5IGFwcGVuZGluZyBwYXJhbXMgdG8gdGhlIGVuZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIGJhc2Ugb2YgdGhlIHVybCAoZS5nLiwgaHR0cDovL3d3dy5nb29nbGUuY29tKVxuICogQHBhcmFtIHtvYmplY3R9IFtwYXJhbXNdIFRoZSBwYXJhbXMgdG8gYmUgYXBwZW5kZWRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgdXJsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVpbGRVUkwodXJsLCBwYXJhbXMsIHBhcmFtc1NlcmlhbGl6ZXIpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIGlmICghcGFyYW1zKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIHZhciBzZXJpYWxpemVkUGFyYW1zO1xuICBpZiAocGFyYW1zU2VyaWFsaXplcikge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXNTZXJpYWxpemVyKHBhcmFtcyk7XG4gIH0gZWxzZSBpZiAodXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMocGFyYW1zKSkge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcGFydHMgPSBbXTtcblxuICAgIHV0aWxzLmZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiBzZXJpYWxpemUodmFsLCBrZXkpIHtcbiAgICAgIGlmICh2YWwgPT09IG51bGwgfHwgdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodXRpbHMuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGtleSA9IGtleSArICdbXSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSBbdmFsXTtcbiAgICAgIH1cblxuICAgICAgdXRpbHMuZm9yRWFjaCh2YWwsIGZ1bmN0aW9uIHBhcnNlVmFsdWUodikge1xuICAgICAgICBpZiAodXRpbHMuaXNEYXRlKHYpKSB7XG4gICAgICAgICAgdiA9IHYudG9JU09TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoKGVuY29kZShrZXkpICsgJz0nICsgZW5jb2RlKHYpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XG4gICAgdXJsICs9ICh1cmwuaW5kZXhPZignPycpID09PSAtMSA/ICc/JyA6ICcmJykgKyBzZXJpYWxpemVkUGFyYW1zO1xuICB9XG5cbiAgcmV0dXJuIHVybDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lVVJMcyhiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xuICByZXR1cm4gcmVsYXRpdmVVUkxcbiAgICA/IGJhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJykgKyAnLycgKyByZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKVxuICAgIDogYmFzZVVSTDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XG4gICAgICAgIHZhciBjb29raWUgPSBbXTtcbiAgICAgICAgY29va2llLnB1c2gobmFtZSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuXG4gICAgICAgIGlmICh1dGlscy5pc051bWJlcihleHBpcmVzKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdleHBpcmVzPScgKyBuZXcgRGF0ZShleHBpcmVzKS50b0dNVFN0cmluZygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhwYXRoKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdwYXRoPScgKyBwYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhkb21haW4pKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2RvbWFpbj0nICsgZG9tYWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWN1cmUgPT09IHRydWUpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnc2VjdXJlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBjb29raWUuam9pbignOyAnKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQobmFtZSkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBkb2N1bWVudC5jb29raWUubWF0Y2gobmV3IFJlZ0V4cCgnKF58O1xcXFxzKikoJyArIG5hbWUgKyAnKT0oW147XSopJykpO1xuICAgICAgICByZXR1cm4gKG1hdGNoID8gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoWzNdKSA6IG51bGwpO1xuICAgICAgfSxcblxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUobmFtZSkge1xuICAgICAgICB0aGlzLndyaXRlKG5hbWUsICcnLCBEYXRlLm5vdygpIC0gODY0MDAwMDApO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudiAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGU6IGZ1bmN0aW9uIHdyaXRlKCkge30sXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKCkgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBYnNvbHV0ZVVSTCh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBoYXZlIGZ1bGwgc3VwcG9ydCBvZiB0aGUgQVBJcyBuZWVkZWQgdG8gdGVzdFxuICAvLyB3aGV0aGVyIHRoZSByZXF1ZXN0IFVSTCBpcyBvZiB0aGUgc2FtZSBvcmlnaW4gYXMgY3VycmVudCBsb2NhdGlvbi5cbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICB2YXIgbXNpZSA9IC8obXNpZXx0cmlkZW50KS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgdmFyIHVybFBhcnNpbmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIHZhciBvcmlnaW5VUkw7XG5cbiAgICAvKipcbiAgICAqIFBhcnNlIGEgVVJMIHRvIGRpc2NvdmVyIGl0J3MgY29tcG9uZW50c1xuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byBiZSBwYXJzZWRcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgKi9cbiAgICBmdW5jdGlvbiByZXNvbHZlVVJMKHVybCkge1xuICAgICAgdmFyIGhyZWYgPSB1cmw7XG5cbiAgICAgIGlmIChtc2llKSB7XG4gICAgICAgIC8vIElFIG5lZWRzIGF0dHJpYnV0ZSBzZXQgdHdpY2UgdG8gbm9ybWFsaXplIHByb3BlcnRpZXNcbiAgICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG4gICAgICAgIGhyZWYgPSB1cmxQYXJzaW5nTm9kZS5ocmVmO1xuICAgICAgfVxuXG4gICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcblxuICAgICAgLy8gdXJsUGFyc2luZ05vZGUgcHJvdmlkZXMgdGhlIFVybFV0aWxzIGludGVyZmFjZSAtIGh0dHA6Ly91cmwuc3BlYy53aGF0d2cub3JnLyN1cmx1dGlsc1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaHJlZjogdXJsUGFyc2luZ05vZGUuaHJlZixcbiAgICAgICAgcHJvdG9jb2w6IHVybFBhcnNpbmdOb2RlLnByb3RvY29sID8gdXJsUGFyc2luZ05vZGUucHJvdG9jb2wucmVwbGFjZSgvOiQvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdDogdXJsUGFyc2luZ05vZGUuaG9zdCxcbiAgICAgICAgc2VhcmNoOiB1cmxQYXJzaW5nTm9kZS5zZWFyY2ggPyB1cmxQYXJzaW5nTm9kZS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sICcnKSA6ICcnLFxuICAgICAgICBoYXNoOiB1cmxQYXJzaW5nTm9kZS5oYXNoID8gdXJsUGFyc2luZ05vZGUuaGFzaC5yZXBsYWNlKC9eIy8sICcnKSA6ICcnLFxuICAgICAgICBob3N0bmFtZTogdXJsUGFyc2luZ05vZGUuaG9zdG5hbWUsXG4gICAgICAgIHBvcnQ6IHVybFBhcnNpbmdOb2RlLnBvcnQsXG4gICAgICAgIHBhdGhuYW1lOiAodXJsUGFyc2luZ05vZGUucGF0aG5hbWUuY2hhckF0KDApID09PSAnLycpID9cbiAgICAgICAgICAgICAgICAgIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lIDpcbiAgICAgICAgICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXG4gICAgICB9O1xuICAgIH1cblxuICAgIG9yaWdpblVSTCA9IHJlc29sdmVVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuXG4gICAgLyoqXG4gICAgKiBEZXRlcm1pbmUgaWYgYSBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiBhcyB0aGUgY3VycmVudCBsb2NhdGlvblxuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxuICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4sIG90aGVyd2lzZSBmYWxzZVxuICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XG4gICAgICB2YXIgcGFyc2VkID0gKHV0aWxzLmlzU3RyaW5nKHJlcXVlc3RVUkwpKSA/IHJlc29sdmVVUkwocmVxdWVzdFVSTCkgOiByZXF1ZXN0VVJMO1xuICAgICAgcmV0dXJuIChwYXJzZWQucHJvdG9jb2wgPT09IG9yaWdpblVSTC5wcm90b2NvbCAmJlxuICAgICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnZzICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgbm9ybWFsaXplZE5hbWUpIHtcbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLCBmdW5jdGlvbiBwcm9jZXNzSGVhZGVyKHZhbHVlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgIT09IG5vcm1hbGl6ZWROYW1lICYmIG5hbWUudG9VcHBlckNhc2UoKSA9PT0gbm9ybWFsaXplZE5hbWUudG9VcHBlckNhc2UoKSkge1xuICAgICAgaGVhZGVyc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJzW25hbWVdO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbi8vIEhlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXG4vLyBjLmYuIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2h0dHBfbWVzc2FnZV9oZWFkZXJzXG52YXIgaWdub3JlRHVwbGljYXRlT2YgPSBbXG4gICdhZ2UnLCAnYXV0aG9yaXphdGlvbicsICdjb250ZW50LWxlbmd0aCcsICdjb250ZW50LXR5cGUnLCAnZXRhZycsXG4gICdleHBpcmVzJywgJ2Zyb20nLCAnaG9zdCcsICdpZi1tb2RpZmllZC1zaW5jZScsICdpZi11bm1vZGlmaWVkLXNpbmNlJyxcbiAgJ2xhc3QtbW9kaWZpZWQnLCAnbG9jYXRpb24nLCAnbWF4LWZvcndhcmRzJywgJ3Byb3h5LWF1dGhvcml6YXRpb24nLFxuICAncmVmZXJlcicsICdyZXRyeS1hZnRlcicsICd1c2VyLWFnZW50J1xuXTtcblxuLyoqXG4gKiBQYXJzZSBoZWFkZXJzIGludG8gYW4gb2JqZWN0XG4gKlxuICogYGBgXG4gKiBEYXRlOiBXZWQsIDI3IEF1ZyAyMDE0IDA4OjU4OjQ5IEdNVFxuICogQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXG4gKiBUcmFuc2Zlci1FbmNvZGluZzogY2h1bmtlZFxuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhlYWRlcnMgSGVhZGVycyBuZWVkaW5nIHRvIGJlIHBhcnNlZFxuICogQHJldHVybnMge09iamVjdH0gSGVhZGVycyBwYXJzZWQgaW50byBhbiBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZUhlYWRlcnMoaGVhZGVycykge1xuICB2YXIgcGFyc2VkID0ge307XG4gIHZhciBrZXk7XG4gIHZhciB2YWw7XG4gIHZhciBpO1xuXG4gIGlmICghaGVhZGVycykgeyByZXR1cm4gcGFyc2VkOyB9XG5cbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLnNwbGl0KCdcXG4nKSwgZnVuY3Rpb24gcGFyc2VyKGxpbmUpIHtcbiAgICBpID0gbGluZS5pbmRleE9mKCc6Jyk7XG4gICAga2V5ID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cigwLCBpKSkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKGkgKyAxKSk7XG5cbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAocGFyc2VkW2tleV0gJiYgaWdub3JlRHVwbGljYXRlT2YuaW5kZXhPZihrZXkpID49IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gKHBhcnNlZFtrZXldID8gcGFyc2VkW2tleV0gOiBbXSkuY29uY2F0KFt2YWxdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gcGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSArICcsICcgKyB2YWwgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcGFyc2VkO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBTeW50YWN0aWMgc3VnYXIgZm9yIGludm9raW5nIGEgZnVuY3Rpb24gYW5kIGV4cGFuZGluZyBhbiBhcnJheSBmb3IgYXJndW1lbnRzLlxuICpcbiAqIENvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB0byB1c2UgYEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseWAuXG4gKlxuICogIGBgYGpzXG4gKiAgZnVuY3Rpb24gZih4LCB5LCB6KSB7fVxuICogIHZhciBhcmdzID0gWzEsIDIsIDNdO1xuICogIGYuYXBwbHkobnVsbCwgYXJncyk7XG4gKiAgYGBgXG4gKlxuICogV2l0aCBgc3ByZWFkYCB0aGlzIGV4YW1wbGUgY2FuIGJlIHJlLXdyaXR0ZW4uXG4gKlxuICogIGBgYGpzXG4gKiAgc3ByZWFkKGZ1bmN0aW9uKHgsIHksIHopIHt9KShbMSwgMiwgM10pO1xuICogIGBgYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3ByZWFkKGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xuICAgIHJldHVybiBjYWxsYmFjay5hcHBseShudWxsLCBhcnIpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIGlzQnVmZmVyID0gcmVxdWlyZSgnaXMtYnVmZmVyJyk7XG5cbi8qZ2xvYmFsIHRvU3RyaW5nOnRydWUqL1xuXG4vLyB1dGlscyBpcyBhIGxpYnJhcnkgb2YgZ2VuZXJpYyBoZWxwZXIgZnVuY3Rpb25zIG5vbi1zcGVjaWZpYyB0byBheGlvc1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXksIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBGb3JtRGF0YSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRm9ybURhdGEodmFsKSB7XG4gIHJldHVybiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbCBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWwpIHtcbiAgdmFyIHJlc3VsdDtcbiAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSAmJiAoQXJyYXlCdWZmZXIuaXNWaWV3KSkge1xuICAgIHJlc3VsdCA9IEFycmF5QnVmZmVyLmlzVmlldyh2YWwpO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCA9ICh2YWwpICYmICh2YWwuYnVmZmVyKSAmJiAodmFsLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyaW5nXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJpbmcsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmluZyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgTnVtYmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBOdW1iZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIHVuZGVmaW5lZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIE9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIE9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbCkge1xuICByZXR1cm4gdmFsICE9PSBudWxsICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRGF0ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRGF0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRmlsZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRmlsZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRmlsZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRmlsZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgQmxvYlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgQmxvYiwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQmxvYih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQmxvYl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRnVuY3Rpb25cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmVhbVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyZWFtLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTdHJlYW0odmFsKSB7XG4gIHJldHVybiBpc09iamVjdCh2YWwpICYmIGlzRnVuY3Rpb24odmFsLnBpcGUpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVVJMU2VhcmNoUGFyYW1zKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIFVSTFNlYXJjaFBhcmFtcyAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsIGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xufVxuXG4vKipcbiAqIFRyaW0gZXhjZXNzIHdoaXRlc3BhY2Ugb2ZmIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIFN0cmluZyB0byB0cmltXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXG4gKi9cbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHdlJ3JlIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50XG4gKlxuICogVGhpcyBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlciwgYW5kIHJlYWN0LW5hdGl2ZS5cbiAqIEJvdGggZW52aXJvbm1lbnRzIHN1cHBvcnQgWE1MSHR0cFJlcXVlc3QsIGJ1dCBub3QgZnVsbHkgc3RhbmRhcmQgZ2xvYmFscy5cbiAqXG4gKiB3ZWIgd29ya2VyczpcbiAqICB0eXBlb2Ygd2luZG93IC0+IHVuZGVmaW5lZFxuICogIHR5cGVvZiBkb2N1bWVudCAtPiB1bmRlZmluZWRcbiAqXG4gKiByZWFjdC1uYXRpdmU6XG4gKiAgbmF2aWdhdG9yLnByb2R1Y3QgLT4gJ1JlYWN0TmF0aXZlJ1xuICovXG5mdW5jdGlvbiBpc1N0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci5wcm9kdWN0ID09PSAnUmVhY3ROYXRpdmUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICk7XG59XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFuIEFycmF5IG9yIGFuIE9iamVjdCBpbnZva2luZyBhIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgYG9iamAgaXMgYW4gQXJyYXkgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBpbmRleCwgYW5kIGNvbXBsZXRlIGFycmF5IGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgJ29iaicgaXMgYW4gT2JqZWN0IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcbiAqIHRoZSB2YWx1ZSwga2V5LCBhbmQgY29tcGxldGUgb2JqZWN0IGZvciBlYWNoIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmogVGhlIG9iamVjdCB0byBpdGVyYXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW1cbiAqL1xuZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG4gIC8vIERvbid0IGJvdGhlciBpZiBubyB2YWx1ZSBwcm92aWRlZFxuICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRm9yY2UgYW4gYXJyYXkgaWYgbm90IGFscmVhZHkgc29tZXRoaW5nIGl0ZXJhYmxlXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIG9iaiA9IFtvYmpdO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSB2YWx1ZXNcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iai5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2ldLCBpLCBvYmopO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJdGVyYXRlIG92ZXIgb2JqZWN0IGtleXNcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICBmbi5jYWxsKG51bGwsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxuICogaW1tdXRhYmx5IG1lcmdlcyB0aGUgcHJvcGVydGllcyBvZiBlYWNoIG9iamVjdCBhbmQgcmV0dXJucyByZXN1bHQuXG4gKlxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cbiAqIHRoZSBhcmd1bWVudHMgbGlzdCB3aWxsIHRha2UgcHJlY2VkZW5jZS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XG4gKiBjb25zb2xlLmxvZyhyZXN1bHQuZm9vKTsgLy8gb3V0cHV0cyA0NTZcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmoxIE9iamVjdCB0byBtZXJnZVxuICogQHJldHVybnMge09iamVjdH0gUmVzdWx0IG9mIGFsbCBtZXJnZSBwcm9wZXJ0aWVzXG4gKi9cbmZ1bmN0aW9uIG1lcmdlKC8qIG9iajEsIG9iajIsIG9iajMsIC4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XG4gICAgaWYgKHR5cGVvZiByZXN1bHRba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlc3VsdFtrZXldID0gbWVyZ2UocmVzdWx0W2tleV0sIHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdmFsO1xuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGZvckVhY2goYXJndW1lbnRzW2ldLCBhc3NpZ25WYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBFeHRlbmRzIG9iamVjdCBhIGJ5IG11dGFibHkgYWRkaW5nIHRvIGl0IHRoZSBwcm9wZXJ0aWVzIG9mIG9iamVjdCBiLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBvYmplY3QgdG8gYmUgZXh0ZW5kZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7T2JqZWN0fSB0aGlzQXJnIFRoZSBvYmplY3QgdG8gYmluZCBmdW5jdGlvbiB0b1xuICogQHJldHVybiB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIHZhbHVlIG9mIG9iamVjdCBhXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChhLCBiLCB0aGlzQXJnKSB7XG4gIGZvckVhY2goYiwgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodGhpc0FyZyAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhW2tleV0gPSBiaW5kKHZhbCwgdGhpc0FyZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFba2V5XSA9IHZhbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gYTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzQXJyYXk6IGlzQXJyYXksXG4gIGlzQXJyYXlCdWZmZXI6IGlzQXJyYXlCdWZmZXIsXG4gIGlzQnVmZmVyOiBpc0J1ZmZlcixcbiAgaXNGb3JtRGF0YTogaXNGb3JtRGF0YSxcbiAgaXNBcnJheUJ1ZmZlclZpZXc6IGlzQXJyYXlCdWZmZXJWaWV3LFxuICBpc1N0cmluZzogaXNTdHJpbmcsXG4gIGlzTnVtYmVyOiBpc051bWJlcixcbiAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICBpc1VuZGVmaW5lZDogaXNVbmRlZmluZWQsXG4gIGlzRGF0ZTogaXNEYXRlLFxuICBpc0ZpbGU6IGlzRmlsZSxcbiAgaXNCbG9iOiBpc0Jsb2IsXG4gIGlzRnVuY3Rpb246IGlzRnVuY3Rpb24sXG4gIGlzU3RyZWFtOiBpc1N0cmVhbSxcbiAgaXNVUkxTZWFyY2hQYXJhbXM6IGlzVVJMU2VhcmNoUGFyYW1zLFxuICBpc1N0YW5kYXJkQnJvd3NlckVudjogaXNTdGFuZGFyZEJyb3dzZXJFbnYsXG4gIGZvckVhY2g6IGZvckVhY2gsXG4gIG1lcmdlOiBtZXJnZSxcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHRyaW06IHRyaW1cbn07XG4iLCIvKiFcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJjb25zdCBhcGlVUkxNb3ZpZXMgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9tb3ZpZXNcIjtcbmNvbnN0IGFwaVVSTEFjdG9ycyA9IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwL2FjdG9yc1wiO1xuY29uc3QgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xuY29uc3QgY3JlYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZXMnKTtcblxuLy9BTEwgTU9WSUVTIFBBR0VcbmZ1bmN0aW9uIGdldE1vdmllcygpIHsgYXhpb3MuZ2V0KGFwaVVSTE1vdmllcykgXG4gICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBsZXQgbW92aWVzID0gcmVzdWx0LmRhdGE7XG4gICAgICAgIHBvcHVsYXRlTW92aWVzKG1vdmllcyk7XG4gICAgfSlcbn07XG5cbmZ1bmN0aW9uIHBvcHVsYXRlTW92aWVzKGFycil7XG4gICAgY29uc3QgYXBwbGllZFRlbXBsYXRlcyA9IGFyci5tYXAoZmlsbSA9PiBjcmVhdGUubW92aWVSb3coZmlsbS5pZCwgZmlsbS50aXRsZSwgZmlsbS5yZWxlYXNlZCwgZmlsbS5kaXJlY3RvciwgZmlsbS5yYXRpbmcsIGZpbG0ucG9zdGVyLCBmaWxtLmFjdG9ycykpLmpvaW4oJ1xcbicpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWFpbi1ib2R5XCIpLmlubmVySFRNTCA9IGFwcGxpZWRUZW1wbGF0ZXM7XG5cbiAgICBjb25zdCBzdGFyRWxlbWVudCA9IGA8aW1nIHN0eWxlPVwibWFyZ2luLXRvcDogLTNweDtcIiBzcmM9XCJodHRwOi8vcG5naW1nLmNvbS91cGxvYWRzL3N0YXIvc3Rhcl9QTkc0MTQ3Mi5wbmdcIiBoZWlnaHQ9XCIyMFwiIHdpZHRoPVwiMjBcIj5gXG4gICAgXG4gICAgZm9yIChsZXQgZmlsbSBvZiBhcnIpe1xuICAgICAgICBjb25zdCBhcHBsaWVkTGlzdHMgPSBmaWxtLmFjdG9ycy5tYXAoYWN0b3IgPT4gY3JlYXRlLmNyZWF0ZUFjdG9yTGlzdChhY3Rvci5maXJzdF9uYW1lLCBhY3Rvci5sYXN0X25hbWUpKS5qb2luKCdcXG4nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhcHBsaWVkTGlzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjYWN0b3ItbGlzdFtkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApLmlubmVySFRNTCA9IFwiPGxpPjxpPk5PIEFDVE9SUyBMSVNURUQ8L2k+PC9saT5cIjtcbiAgICAgICAgfSBlbHNlIHtkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjYWN0b3ItbGlzdFtkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApLmlubmVySFRNTCA9IGFwcGxpZWRMaXN0c307XG5cbiAgICAgICAgY29uc3Qgc3RhclJhdGluZyA9ICc8Yj5SYXRpbmc6PC9iPiAnICsgc3RhckVsZW1lbnQucmVwZWF0KGZpbG0ucmF0aW5nKTtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI3N0YXItcmF0aW5nW2RhdGEtaWQ9XCIke2ZpbG0uaWR9XCJdYCkuaW5uZXJIVE1MID0gc3RhclJhdGluZztcblxuICAgICAgICAvLyBNT1ZJRSBST1cgTUVOVSBCVVRUT05TXG4gICAgICAgIGxldCBkZWxldGVGaWxtQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2RlbGV0ZS1maWxtW2RhdGEtaWQ9XCIke2ZpbG0uaWR9XCJdYCk7XG4gICAgICAgIGxldCB1cGRhdGVGaWxtQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2VkaXQtZmlsbVtkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApO1xuXG4gICAgICAgIC8vIFVQREFURSBGSUVMRCBBUkVBXG4gICAgICAgIGxldCBjbG9zZVVwZGF0ZUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCNzdG9wLXBvc3RbZGF0YS1pZD1cIiR7ZmlsbS5pZH1cIl1gKTtcbiAgICAgICAgbGV0IHVwZGF0ZUZpZWxkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLnVwZGF0ZS1maWVsZFtkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApO1xuICAgICAgICBsZXQgdXBkYXRlRmllbGRQb3N0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjdXBkYXRlLXBvc3RlcltkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApO1xuICAgICAgICBsZXQgdXBkYXRlRmllbGRUaXRsZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCN1cGRhdGUtdGl0bGVbZGF0YS1pZD1cIiR7ZmlsbS5pZH1cIl1gKTtcbiAgICAgICAgbGV0IHVwZGF0ZUZpZWxkUmVsZWFzZWQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjdXBkYXRlLXJlbGVhc2VkW2RhdGEtaWQ9XCIke2ZpbG0uaWR9XCJdYCk7XG4gICAgICAgIGxldCB1cGRhdGVGaWVsZERpcmVjdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI3VwZGF0ZS1kaXJlY3RvcltkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApO1xuICAgICAgICBsZXQgdXBkYXRlRmllbGRSYXRpbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjdXBkYXRlLXJhdGluZ1tkYXRhLWlkPVwiJHtmaWxtLmlkfVwiXWApO1xuICAgICAgICBsZXQgc3VibWl0VXBkYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLnVwZGF0ZS1mb3JtW2RhdGEtaWQ9XCIke2ZpbG0uaWR9XCJdYCk7XG5cbiAgICAgICAgZGVsZXRlRmlsbUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBheGlvcy5kZWxldGUoYXBpVVJMTW92aWVzK2AvJHtmaWxtLmlkfWApXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmlsbSBEZWxldGVkXCIpXG4gICAgICAgICAgICAgICAgZ2V0TW92aWVzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgICB1cGRhdGVGaWxtQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZih1cGRhdGVGaWVsZC5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGUtbWVudScpKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlRmllbGQuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZS1tZW51JylcbiAgICAgICAgICAgIH0gZWxzZSB7dXBkYXRlRmllbGQuY2xhc3NMaXN0LmFkZCgnaGlkZS1tZW51Jyl9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsb3NlVXBkYXRlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHVwZGF0ZUZpZWxkLmNsYXNzTGlzdC5hZGQoJ2hpZGUtbWVudScpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1Ym1pdFVwZGF0ZS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZU1vdmllID0gYXhpb3MucHV0KGFwaVVSTE1vdmllcytgLyR7ZmlsbS5pZH1gLCB7XG4gICAgICAgICAgICAgICAgcG9zdGVyOiB1cGRhdGVGaWVsZFBvc3Rlci52YWx1ZSxcbiAgICAgICAgICAgICAgICB0aXRsZTogdXBkYXRlRmllbGRUaXRsZS52YWx1ZSxcbiAgICAgICAgICAgICAgICByZWxlYXNlZDogdXBkYXRlRmllbGRSZWxlYXNlZC52YWx1ZSxcbiAgICAgICAgICAgICAgICBkaXJlY3RvcjogdXBkYXRlRmllbGREaXJlY3Rvci52YWx1ZSxcbiAgICAgICAgICAgICAgICByYXRpbmc6IHVwZGF0ZUZpZWxkUmF0aW5nLnZhbHVlLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0ZWQnKTtcbiAgICAgICAgICAgICAgICBnZXRNb3ZpZXMoKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZC5jbGFzc0xpc3QuYWRkKCdoaWRlLW1lbnUnKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cbiAgICB9ICBcbn07XG5cbi8vQUREIE1PVklFIFBBR0VcbmZ1bmN0aW9uIHBvcHVsYXRlQWRkTW92aWUgKCkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWFpbi1ib2R5XCIpLmlubmVySFRNTCA9IGNyZWF0ZS5uZXdNb3ZpZSgpO1xuXG4gICAgbGV0IGFkZE5ld01vdmllPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjc3VibWl0LW1vdmllYCk7XG4gICAgbGV0IG5ld01vdmllTGluaz0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2ZpbG1Qb3N0ZXJgKTtcbiAgICBsZXQgbmV3TW92aWVUaXRsZT0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2ZpbG1UaXRsZWApO1xuICAgIGxldCBuZXdNb3ZpZVJlbGVhc2U9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCNmaWxtUmVsZWFzZWApO1xuICAgIGxldCBuZXdNb3ZpZURpcmVjdG9yPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjZmlsbURpcmVjdG9yYCk7XG4gICAgbGV0IG5ld01vdmllUmF0aW5nPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjZmlsbVJhdGluZ2ApO1xuXG4gICAgYWRkTmV3TW92aWUuYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFkZE1vdmllID0gYXhpb3MucG9zdChhcGlVUkxNb3ZpZXMsIHtcbiAgICAgICAgICAgIHBvc3RlciA6IG5ld01vdmllTGluay52YWx1ZSxcbiAgICAgICAgICAgIHRpdGxlOiBuZXdNb3ZpZVRpdGxlLnZhbHVlLFxuICAgICAgICAgICAgcmVsZWFzZWQ6IG5ld01vdmllUmVsZWFzZS52YWx1ZSxcbiAgICAgICAgICAgIGRpcmVjdG9yOiBuZXdNb3ZpZURpcmVjdG9yLnZhbHVlLFxuICAgICAgICAgICAgcmF0aW5nOiBuZXdNb3ZpZVJhdGluZy52YWx1ZVxuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdWNjZXNzXCIpXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1haW4tYm9keVwiKS5pbm5lckhUTUwgPSBjcmVhdGUuZGlzcGxheU5ld01vdmllKG5ld01vdmllVGl0bGUudmFsdWUsIG5ld01vdmllTGluay52YWx1ZSwgbmV3TW92aWVSZWxlYXNlLnZhbHVlLCBuZXdNb3ZpZURpcmVjdG9yLnZhbHVlLCBuZXdNb3ZpZVJhdGluZy52YWx1ZSkgXG4gICAgICAgIH0pXG4gICAgfSlcblxufTtcblxuLy8gQUxMIEFDVE9SUyBQQUdFXG5cbmZ1bmN0aW9uIGdldEFjdG9ycygpIHsgYXhpb3MuZ2V0KGFwaVVSTEFjdG9ycykgXG4gICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBsZXQgc3RhcnMgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgcG9wdWxhdGVBY3RvcnMoc3RhcnMpO1xuICAgIH0pXG59O1xuXG5mdW5jdGlvbiBwb3B1bGF0ZUFjdG9ycyhhcnIpIHtcbiAgICBjb25zdCBhcHBsaWVkVGVtcGxhdGVzID0gYXJyLm1hcChzdGFyID0+IGNyZWF0ZS5hY3RvclJvdyhzdGFyLmlkLCBzdGFyLmZpcnN0X25hbWUsIHN0YXIubGFzdF9uYW1lKSkuam9pbignXFxuJyk7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tYWluLWJvZHlcIikuaW5uZXJIVE1MID0gYXBwbGllZFRlbXBsYXRlcztcblxuICAgIGZvciAobGV0IHN0YXJzIG9mIGFycil7XG4gICAgICAgIGNvbnN0IGFwcGxpZWRMaXN0cyA9IHN0YXJzLmZpbG1zLm1hcChmaWxtID0+IGNyZWF0ZS5jcmVhdGVNb3ZpZUxpc3QoZmlsbS50aXRsZSkpLmpvaW4oJ1xcbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFwcGxpZWRMaXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCNtb3ZpZS1saXN0W2RhdGEtaWQ9XCIke3N0YXJzLmlkfVwiXWApLmlubmVySFRNTCA9IFwiPGxpPjxpPk5PIEFDVE9SUyBMSVNURUQ8L2k+PC9saT5cIjtcbiAgICAgICAgfSBlbHNlIHtkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjbW92aWUtbGlzdFtkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKS5pbm5lckhUTUwgPSBhcHBsaWVkTGlzdHN9O1xuXG4gICAgICAgIC8vIEFDVE9SIFJPVyBNRU5VIEJVVFRPTlNcbiAgICAgICAgbGV0IGRlbGV0ZUFjdG9yQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2RlbGV0ZS1hY3RvcltkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKTtcbiAgICAgICAgbGV0IHVwZGF0ZUFjdG9yQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI2VkaXQtYWN0b3JbZGF0YS1pZD1cIiR7c3RhcnMuaWR9XCJdYCk7XG5cbiAgICAgICAgLy8gQUNUT1IgVVBEQVRFIE1FTlUgRklFTERTICYgQlVUVE9OU1xuICAgICAgICBsZXQgdXBkYXRlQWN0b3JGaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC51cGRhdGUtYWN0b3ItZmllbGRbZGF0YS1pZD1cIiR7c3RhcnMuaWR9XCJdYCk7XG4gICAgICAgIGxldCB1cGRhdGVBY3Rvckxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjZmlsbS1vcHRpb25zW2RhdGEtaWQ9XCIke3N0YXJzLmlkfVwiXWApO1xuICAgICAgICBsZXQgdXBkYXRlQWN0b3JGTmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCN1cGRhdGUtZmlyc3QtbmFtZVtkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKTtcbiAgICAgICAgbGV0IHVwZGF0ZUFjdG9yTE5hbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAjdXBkYXRlLWxhc3QtbmFtZVtkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKTtcbiAgICAgICAgbGV0IHN1Ym1pdFVwZGF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC51cGRhdGUtZm9ybVtkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKTtcbiAgICAgICAgbGV0IGNsb3NlVXBkYXRlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgI3N0b3AtcG9zdFtkYXRhLWlkPVwiJHtzdGFycy5pZH1cIl1gKTtcblxuICAgICAgICBjbG9zZVVwZGF0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB1cGRhdGVBY3RvckZpZWxkLmNsYXNzTGlzdC5hZGQoJ2hpZGUtbWVudScpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGVsZXRlQWN0b3JCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYXhpb3MuZGVsZXRlKGFwaVVSTEFjdG9ycytgLyR7c3RhcnMuaWR9YClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGaWxtIERlbGV0ZWRcIilcbiAgICAgICAgICAgICAgICBnZXRBY3RvcnMoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZUFjdG9yQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZih1cGRhdGVBY3RvckZpZWxkLmNsYXNzTGlzdC5jb250YWlucygnaGlkZS1tZW51JykpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGVBY3RvckZpZWxkLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGUtbWVudScpXG4gICAgICAgICAgICB9IGVsc2Uge3VwZGF0ZUFjdG9yRmllbGQuY2xhc3NMaXN0LmFkZCgnaGlkZS1tZW51Jyl9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGZpbG1BcnIgPSBzdGFycy5maWxtcy5tYXAoZmlsbSA9PiBmaWxtLnRpdGxlKTtcbiAgICAgICAgYXhpb3MuZ2V0KGFwaVVSTE1vdmllcylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgIGxldCB0aXRsZXMgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIGNyZWF0ZS5wb3B1bGF0ZURyb3Bkb3duKHRpdGxlcywgZmlsbUFyciwgdXBkYXRlQWN0b3JMaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3VibWl0VXBkYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBsZXQgbW92aWVMaXN0ID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAjZmlsbS1vcHRpb25zW2RhdGEtaWQ9XCIke3N0YXJzLmlkfVwiXSBvcHRpb246Y2hlY2tlZGApKS5tYXAoZWxlbWVudCA9PiBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpKS5maWx0ZXIoZWxlbWVudCA9PiBlbGVtZW50KTtcbiAgICAgICAgICAgIGF4aW9zLnB1dChhcGlVUkxBY3RvcnMrYC8ke3N0YXJzLmlkfWAsIHtcbiAgICAgICAgICAgICAgICAgZmlyc3RfbmFtZTogdXBkYXRlQWN0b3JGTmFtZS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgbGFzdF9uYW1lOiB1cGRhdGVBY3RvckxOYW1lLnZhbHVlLFxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGF4aW9zLmRlbGV0ZShhcGlVUkxBY3RvcnMgK2AvJHtzdGFycy5pZH0vbW92aWVzYCwge1xuICAgICAgICAgICAgICAgICAgICAgZGF0YTogbW92aWVMaXN0XG4gICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICByZXR1cm4gYXhpb3MucG9zdChhcGlVUkxBY3RvcnMgKyAgYC8ke3N0YXJzLmlkfS9tb3ZpZXNgLCB7XG4gICAgICAgICAgICAgICAgICAgICBtb3ZpZXM6IG1vdmllTGlzdFxuICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0ZWQnKTtcbiAgICAgICAgICAgICAgICAgZ2V0QWN0b3JzKCk7XG4gICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59O1xuXG4vL0FERCBBTiBBQ1RPUiBQQUdFXG5mdW5jdGlvbiBwb3B1bGF0ZUFkZEFjdG9yUGFnZSgpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1haW4tYm9keVwiKS5pbm5lckhUTUwgPSBjcmVhdGUubmV3QWN0b3IoKTtcbiAgICBsZXQgZHJvcERvd25NZW51ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ZpbG0tb3B0aW9ucycpO1xuICAgIGF4aW9zLmdldChhcGlVUkxNb3ZpZXMpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgbGV0IHRpdGxlcyA9IHJlc3VsdC5kYXRhO1xuICAgICAgICBjcmVhdGUucG9wdWxhdGVGdWxsRHJvcGRvd24odGl0bGVzLCBkcm9wRG93bk1lbnUpO1xuICAgIH0pXG4gICAgbGV0IGFkZE5ld0FjdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2FkZC1hY3RvcicpO1xuICAgIGxldCBuZXdBY3RvckZOYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2FjdG9yLWZpcnN0LW5hbWUnKTtcbiAgICBsZXQgbmV3QWN0b3JMTmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNhY3Rvci1sYXN0LW5hbWUnKTtcblxuICAgIGFkZE5ld0FjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGZ1bmN0aW9uIChldmVudCl7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGxldCBtb3ZpZUxpc3QgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyNmaWxtLW9wdGlvbnMgb3B0aW9uOmNoZWNrZWQnKSkubWFwKGVsZW1lbnQgPT4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSkuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudCk7XG4gICAgICAgYXhpb3MucG9zdChhcGlVUkxBY3RvcnMsIHtcbiAgICAgICAgICAgIGZpcnN0X25hbWU6IG5ld0FjdG9yRk5hbWUudmFsdWUsXG4gICAgICAgICAgICBsYXN0X25hbWU6IG5ld0FjdG9yTE5hbWUudmFsdWUsXG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICBheGlvcy5wb3N0KGFwaVVSTEFjdG9ycyArYC8ke3Jlc3VsdC5kYXRhLmlkfS9tb3ZpZXNgLCB7XG4gICAgICAgICAgICAgICAgbW92aWVzOiBtb3ZpZUxpc3QsXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWFpbi1ib2R5XCIpLmlubmVySFRNTCA9IGNyZWF0ZS5kaXNwbGF5TmV3QWN0b3IobmV3QWN0b3JGTmFtZS52YWx1ZSwgbmV3QWN0b3JMTmFtZS52YWx1ZSwgbW92aWVMaXN0KTtcbiAgICAgICAgfSlcbiAgICB9KVxufTtcblxuXG5cblxuLy9IVE1MIFdJTkRPVyBTRUxFQ1RJT05TXG5pZiAod2luZG93LmxvY2F0aW9uLmhyZWYuZW5kc1dpdGgoJy9tb3ZpZXMuaHRtbCcpKXtcbiAgICBnZXRNb3ZpZXMoKTtcblxuICAgIGxldCBzZWFyY2hGb3JGaWxtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI21vdmllLXNlYXJjaCcpO1xuICAgIFxuICAgIGZ1bmN0aW9uIGdldE1vdmllKGZpbG0pIHtcbiAgICBheGlvcy5nZXQoYXBpVVJMTW92aWVzICsgYC8ke2ZpbG19YClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgbGV0IGZpbG0gPSByZXN1bHQuZGF0YVswXTtcbiAgICAgICAgICAgIHBvcHVsYXRlTW92aWVzKFtmaWxtXSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICBcbiAgICBzZWFyY2hGb3JGaWxtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgbGV0IHRhcmdldE1vdmllID0gZXZlbnQudGFyZ2V0LnNlYXJjaEZpZWxkLnZhbHVlO1xuICAgICAgICBnZXRNb3ZpZSh0YXJnZXRNb3ZpZSk7XG4gICAgICAgIGV2ZW50LnRhcmdldC5zZWFyY2hGaWVsZC52YWx1ZSA9ICcnO1xuICAgIH0pO1xuXG59IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5ocmVmLmVuZHNXaXRoKCcvYWRkLW1vdmllLmh0bWwnKSkge1xuICAgIHBvcHVsYXRlQWRkTW92aWUoKTtcblxufSBlbHNlIGlmICh3aW5kb3cubG9jYXRpb24uaHJlZi5lbmRzV2l0aCgnL2FjdG9ycy5odG1sJykpIHtcbiAgICBnZXRBY3RvcnMoKTtcbiAgICBsZXQgc2VhcmNoRm9yQWN0b3IgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYWN0b3Itc2VhcmNoJyk7XG4gICAgXG4gICAgZnVuY3Rpb24gZ2V0QWN0b3IoYWN0b3IpIHtcbiAgICBheGlvcy5nZXQoYXBpVVJMQWN0b3JzICsgYC8ke2FjdG9yfWApXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGxldCBhY3RvciA9IHJlc3VsdC5kYXRhWzBdO1xuICAgICAgICAgICAgcG9wdWxhdGVBY3RvcnMoW2FjdG9yXSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICBcbiAgICBzZWFyY2hGb3JBY3Rvci5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBmdW5jdGlvbihldmVudCl7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGxldCB0YXJnZXRBY3RvciA9IGV2ZW50LnRhcmdldC5zZWFyY2hGaWVsZC52YWx1ZTtcbiAgICAgICAgY29uc29sZS5sb2codGFyZ2V0QWN0b3IpO1xuICAgICAgICBnZXRBY3Rvcih0YXJnZXRBY3Rvcik7XG4gICAgICAgIGV2ZW50LnRhcmdldC5zZWFyY2hGaWVsZC52YWx1ZSA9ICcnO1xuICAgIH0pO1xuXG59IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5ocmVmLmVuZHNXaXRoKCcvYWRkLWFjdG9yLmh0bWwnKSkge1xuICAgIHBvcHVsYXRlQWRkQWN0b3JQYWdlKCk7XG5cbn0gZWxzZSBpZiAod2luZG93LmxvY2F0aW9uLmhyZWYuZW5kc1dpdGgoJy9pbmRleC5odG1sJykpIHtcbiAgICBjb25zdCBob21lUGFnZVRlbXBsYXRlID0gY3JlYXRlLmRpc3BsYXlIb21lUGFnZU1lbnUoKTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1haW4tYm9keVwiKS5pbm5lckhUTUwgPSBob21lUGFnZVRlbXBsYXRlO1xufSIsImNvbnN0IG1vdmllUm93ID0gKGlkLCB0aXRsZSwgcmVsZWFzZWQsIGRpcmVjdG9yLCByYXRpbmcsIHBvc3RlcikgPT4ge1xuICAgIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyIGl0ZW0tcm93c1wiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTIgYm9yZGVyLXRvcCBib3JkZXItbGVmdCBib3JkZXItYm90dG9tXCI+XG4gICAgICAgICAgICA8aW1nIHNyYz1cIiR7cG9zdGVyfVwiIGhlaWdodD1cIjIwMHB4XCI+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtMiBib3JkZXItdG9wIGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgIDxwPjxiPlNpdGUgSUQ6PC9iPiAke2lkfTwvcD5cbiAgICAgICAgICAgIDxwPjxiPlRpdGxlOjwvYj4gJHt0aXRsZX08L3A+XG4gICAgICAgICAgICA8cD48Yj5SZWxlYXNlZDo8L2I+ICR7cmVsZWFzZWR9PC9wPlxuICAgICAgICAgICAgPHAgaWQ9XCJzdGFyLXJhdGluZ1wiIGRhdGEtaWQ9XCIke2lkfVwiPjwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC0yIGJvcmRlci10b3AgYm9yZGVyLWJvdHRvbVwiPlxuICAgICAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAwcHg7XCI+PGI+QWN0b3JzOjwvYj48dWwgaWQ9XCJhY3Rvci1saXN0XCIgZGF0YS1pZD0ke2lkfT4gPC91bD48L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC0yIGJvcmRlci10b3AgYm9yZGVyLXJpZ2h0IGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBpZD1cImVkaXQtZmlsbVwiIGRhdGEtaWQ9XCIke2lkfVwiIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tYmxvY2sgYnRuLW91dGxpbmUtZGFuZ2VyXCI+VXBkYXRlPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gaWQ9XCJkZWxldGUtZmlsbVwiIGRhdGEtaWQ9XCIke2lkfVwiIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tYmxvY2sgYnRuLW91dGxpbmUtd2FybmluZ1wiPkRlbGV0ZTwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJyb3cgdXBkYXRlLWZpZWxkIGhpZGUtbWVudSBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgIDxmb3JtIGNsYXNzPVwidXBkYXRlLWZvcm1cIiBkYXRhLWlkPVwiJHtpZH1cIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLXJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC0yIGJvcmRlci10b3AgYm9yZGVyLWxlZnQgYm9yZGVyLWJvdHRvbVwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ1cGRhdGUtZm9ybS1maWVsZHNcIiB0eXBlPVwidGV4dFwiIGRhdGEtaWQ9XCIke2lkfVwiICBpZD1cInVwZGF0ZS1wb3N0ZXJcIiB2YWx1ZT1cIiR7cG9zdGVyfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtMiBib3JkZXItdG9wIGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwidXBkYXRlLWZvcm0tZmllbGRzXCIgdHlwZT1cInRleHRcIiBkYXRhLWlkPVwiJHtpZH1cIiAgaWQ9XCJ1cGRhdGUtdGl0bGVcIiB2YWx1ZT1cIiR7dGl0bGV9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cInVwZGF0ZS1mb3JtLWZpZWxkc1wiIHR5cGU9XCJ0ZXh0XCIgZGF0YS1pZD1cIiR7aWR9XCIgIGlkPVwidXBkYXRlLXJlbGVhc2VkXCIgdmFsdWU9XCIke3JlbGVhc2VkfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtMiBib3JkZXItdG9wIGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ1cGRhdGUtZm9ybS1maWVsZHNcIiB0eXBlPVwidGV4dFwiIGRhdGEtaWQ9XCIke2lkfVwiICBpZD1cInVwZGF0ZS1kaXJlY3RvclwiIHZhbHVlPVwiJHtkaXJlY3Rvcn1cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ1cGRhdGUtZm9ybS1maWVsZHNcIiB0eXBlPVwidGV4dFwiIGRhdGEtaWQ9XCIke2lkfVwiICBpZD1cInVwZGF0ZS1yYXRpbmdcIiB2YWx1ZT1cIiR7cmF0aW5nfVwiPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC0yIGJvcmRlci10b3AgYm9yZGVyLXJpZ2h0IGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBpZCA9IFwic3RvcC1wb3N0XCIgZGF0YS1pZD1cIiR7aWR9XCIgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2UtYnV0dG9uIGJ0bi1zbSBidG4tb3V0bGluZS1kYXJrXCI+WDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGNsYXNzPVwidXBkYXRlLWJ1dHRvbiBidG4taW5mb1wiIGlkPVwic3VibWl0LXVwZGF0ZVwiIGRhdGEtaWQ9XCIke2lkfVwiIHZhbHVlPVwiVXBkYXRlIE1vdmllXCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9mb3JtPlxuICAgIDwvZGl2PlxuICAgIGBcbn07XG5cbmNvbnN0IGNyZWF0ZUFjdG9yTGlzdCA9IChmTmFtZSwgbE5hbWUpID0+IHtcbiAgICByZXR1cm4gYFxuICAgIDxsaT4ke2ZOYW1lfSAke2xOYW1lfTwvbGk+XG4gICAgYFxufTtcblxuY29uc3QgbmV3TW92aWUgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyIGl0ZW0tcm93c1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC00IGJvcmRlclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWdyb3VwXCI+XG4gICAgICAgICAgICAgICAgPGZvcm0gaWQ9XCJzdWJtaXQtbW92aWVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBhbGlnbi1pdGVtcy1jZW50ZXIganVzdGlmeS1jb250ZW50LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2xcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDI+TW92aWUgSW5mb3JtYXRpb248L2gyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLXNtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPVwiaW5wdXQtZmllbGRFIHNhbXBsZS1wb3N0ZXJcIiBzcmM9XCJodHRwczovL3ZpYS5wbGFjZWhvbGRlci5jb20vMTUwXCIgYWx0PVwicG9zdGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVCYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWVudUJhclwiIGZvcj1cImZpbG1Qb3N0ZXJcIj5Nb3ZpZSBQb3N0ZXIgPGk+bGluayBPbmx5PC9pPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cImlucHV0LWZpZWxkRVwiIHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaWxtUG9zdGVyXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVCYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWVudUJhclwiIGZvcj1cImZpbG1UaXRsZVwiPk1vdmllIFRpdGxlPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwiaW5wdXQtZmllbGRBXCIgdHlwZT1cInRleHRcIiBpZD1cImZpbG1UaXRsZVwiPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVCYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWVudUJhclwiIGZvcj1cImZpbG1SZWxlYXNlXCI+WWVhciBSZWxlYXNlZDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cImlucHV0LWZpZWxkQlwiIHR5cGU9XCJ0ZXh0XCIgaWQ9XCJmaWxtUmVsZWFzZVwiPlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVCYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWVudUJhclwiIGZvcj1cImZpbG1EaXJlY3RvclwiPkRpcmVjdG9yPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJpbnB1dC1maWVsZENcIiB0eXBlPVwidGV4dFwiIGlkPVwiZmlsbURpcmVjdG9yXCI+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudUJhclwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9XCJtZW51QmFyXCIgZm9yPVwiZmlsbVJhdGluZ1wiPlN0YXIgUmF0aW5nPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwiaW5wdXQtZmllbGREXCIgdHlwZT1cInRleHRcIiBpZD1cImZpbG1SYXRpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJzdWJtaXRcIiBpZD1cInN1Ym1pc3Npb25cIiB2YWx1ZT1cIlNVQk1JVFwiPlxuICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIDwvZGl2PiBcbiAgICAgICA8L2Rpdj5cbiAgICBgXG59O1xuXG5jb25zdCBkaXNwbGF5TmV3TW92aWUgPSAodGl0bGUsIHBvc3RlciwgcmVsZWFzZWQsIGRpcmVjdG9yLCByYXRpbmcpID0+IHtcbiAgICByZXR1cm4gYFxuICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlciBpdGVtLXJvd3NcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC00IGJvcmRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBhbGlnbi1pdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTEyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxoND5OZXcgTW92aWUgSW5mb3JtYXRpb248L2g0PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicm93IGp1c3RpZnktY29udGVudC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTEyIGJvcmRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPVwic2FtcGxlLXBvc3RlciBib3JkZXJcIiBzcmM9XCIke3Bvc3Rlcn1cIiBhbHQ9XCJwb3N0ZXJcIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgzPlxuICAgICAgICAgICAgICAgICAgICBUaXRsZTogXG4gICAgICAgICAgICAgICAgICAgIDxzbWFsbCBjbGFzcz1cInRleHQtbXV0ZWRcIj4gJHt0aXRsZX08L3NtYWxsPlxuICAgICAgICAgICAgICAgIDwvaDM+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxoMz5cbiAgICAgICAgICAgICAgICAgICAgUmVsZWFzZSBZZWFyOiAgXG4gICAgICAgICAgICAgICAgICAgIDxzbWFsbCBjbGFzcz1cInRleHQtbXV0ZWRcIj4gJHtyZWxlYXNlZH08L3NtYWxsPlxuICAgICAgICAgICAgICAgIDwvaDM+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxoMz5cbiAgICAgICAgICAgICAgICAgICAgRGlyZWN0ZWQgQnk6ICBcbiAgICAgICAgICAgICAgICAgICAgPHNtYWxsIGNsYXNzPVwidGV4dC1tdXRlZFwiPiAke2RpcmVjdG9yfTwvc21hbGw+XG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgzPlxuICAgICAgICAgICAgICAgICAgICBZb3VyIFJhdGluZzogIFxuICAgICAgICAgICAgICAgICAgICA8c21hbGwgY2xhc3M9XCJ0ZXh0LW11dGVkXCI+ICR7cmF0aW5nfSBTdGFyczwvc21hbGw+XG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJ0bi1ncm91cFwiPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIuL2luZGV4Lmh0bWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeSBidG4tc21cIj5BbGwgTW92aWVzPC9idXR0b24+PC9hPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIuL2FkZC1tb3ZpZS5odG1sXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXN1Y2Nlc3MgYnRuLXNtXCI+QWRkIEFub3RoZXI8L2J1dHRvbj48L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXZcbiAgICA8L2Rpdj5cbiAgICBgXG59XG5cblxuY29uc3QgYWN0b3JSb3cgPSAoaWQsIGZpcnN0X25hbWUsIGxhc3RfbmFtZSkgPT4ge1xuICAgIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyIGl0ZW0tcm93c1wiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTMgYm9yZGVyLXRvcCBib3JkZXItbGVmdCBib3JkZXItYm90dG9tXCI+XG4gICAgICAgICAgICA8cD48Yj5TaXRlIElEOjwvYj4gJHtpZH08L3A+XG4gICAgICAgICAgICA8cD48Yj5GaXJzdCBOYW1lOjwvYj4gJHtmaXJzdF9uYW1lfTwvcD5cbiAgICAgICAgICAgIDxwPjxiPkxhc3QgTmFtZTo8L2I+ICR7bGFzdF9uYW1lfTwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtMyBib3JkZXItdG9wIGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgIDxwIHN0eWxlPVwibWFyZ2luLWJvdHRvbTogMHB4O1wiPjxiPkZpbG1zOjwvYj48dWwgaWQ9XCJtb3ZpZS1saXN0XCIgZGF0YS1pZD0ke2lkfT4gPC91bD48L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTIgYm9yZGVyLXRvcCBib3JkZXItcmlnaHQgYm9yZGVyLWJvdHRvbVwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBpZD1cImVkaXQtYWN0b3JcIiBkYXRhLWlkPVwiJHtpZH1cIiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLWJsb2NrIGJ0bi1vdXRsaW5lLWRhbmdlclwiPlVwZGF0ZTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiBpZD1cImRlbGV0ZS1hY3RvclwiIGRhdGEtaWQ9XCIke2lkfVwiIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tYmxvY2sgYnRuLW91dGxpbmUtd2FybmluZ1wiPkRlbGV0ZTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwicm93IHVwZGF0ZS1hY3Rvci1maWVsZCBoaWRlLW1lbnUganVzdGlmeS1jb250ZW50LWNlbnRlclwiIGRhdGEtaWQ9XCIke2lkfVwiPlxuICAgICAgICA8Zm9ybSBjbGFzcz1cInVwZGF0ZS1mb3JtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9ybS1yb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtNCBib3JkZXItdG9wIGJvcmRlci1sZWZ0IGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVwidXBkYXRlLWZvcm0tZmllbGRzXCIgdHlwZT1cInRleHRcIiBkYXRhLWlkPVwiJHtpZH1cIiAgaWQ9XCJ1cGRhdGUtZmlyc3QtbmFtZVwiIHZhbHVlPVwiJHtmaXJzdF9uYW1lfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJ1cGRhdGUtZm9ybS1maWVsZHNcIiB0eXBlPVwidGV4dFwiIGRhdGEtaWQ9XCIke2lkfVwiICBpZD1cInVwZGF0ZS1sYXN0LW5hbWVcIiB2YWx1ZT1cIiR7bGFzdF9uYW1lfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtNCBib3JkZXItdG9wIGJvcmRlci1sZWZ0IGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCBtdWx0aXBsZSBuYW1lPVwiZmlsbS1saXN0XCIgaWQ9XCJmaWxtLW9wdGlvbnNcIiBkYXRhLWlkPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gc2VsZWN0ZWQgZGlzYWJsZWQ+U2VsZWN0IEZpbG1zIEhlcmU8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbC00IGJvcmRlci10b3AgYm9yZGVyLXJpZ2h0IGJvcmRlci1ib3R0b21cIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBpZCA9IFwic3RvcC1wb3N0XCIgZGF0YS1pZD1cIiR7aWR9XCIgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2UtYnV0dG9uIGJ0bi1zbSBidG4tb3V0bGluZS1kYXJrXCI+WDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGNsYXNzPVwidXBkYXRlLWJ1dHRvbiBidG4taW5mb1wiIGlkPVwic3VibWl0LXVwZGF0ZVwiIGRhdGEtaWQ9XCIke2lkfVwiIHZhbHVlPVwiVXBkYXRlIE1vdmllXCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9mb3JtPlxuICAgIDwvZGl2PlxuICAgIGBcbn1cblxuY29uc3QgY3JlYXRlTW92aWVMaXN0ID0gKHRpdGxlKSA9PiB7XG4gICAgcmV0dXJuIGBcbiAgICA8bGk+JHt0aXRsZX08L2xpPlxuICAgIGBcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vdmllT3B0aW9uKGZpbG0pe1xuICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnLCBmaWxtLmlkKTtcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gZmlsbS50aXRsZTtcbiAgICByZXR1cm4gb3B0aW9uO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlQ2hlY2tlZE1vdmllT3B0aW9uKGZpbG0gKSB7XG4gICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnZGF0YS1pZCcsIGZpbG0uaWQpO1xuICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJ3NlbGVjdGVkJylcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gZmlsbS50aXRsZTtcbiAgICByZXR1cm4gb3B0aW9uO1xufVxuXG5mdW5jdGlvbiBwb3B1bGF0ZUZ1bGxEcm9wZG93bihhcnIsIGxvYyl7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspe1xuICAgICAgICBsb2MuYXBwZW5kQ2hpbGQoY3JlYXRlTW92aWVPcHRpb24oYXJyW2ldKSk7XG4gICAgfSAgXG59O1xuXG5mdW5jdGlvbiBwb3B1bGF0ZURyb3Bkb3duKGFyciwgY2hlY2tBcnIsIGxvYyl7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspe1xuICAgICAgICBpZihjaGVja0Fyci5pbmNsdWRlcyhhcnJbaV0udGl0bGUpKSB7XG4gICAgICAgICAgICBsb2MuYXBwZW5kQ2hpbGQoY3JlYXRlQ2hlY2tlZE1vdmllT3B0aW9uKGFycltpXSkpOyBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvYy5hcHBlbmRDaGlsZChjcmVhdGVNb3ZpZU9wdGlvbihhcnJbaV0pKTtcbiAgICAgICAgfVxuXG4gICAgfSAgXG59O1xuXG5mdW5jdGlvbiBuZXdBY3RvcigpIHtcbiAgICByZXR1cm4gYFxuICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlciBpdGVtLXJvd3NcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC00IGJvcmRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj5cbiAgICAgICAgICAgICAgICA8Zm9ybSBpZD1cImFkZC1hY3RvclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51QmFyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cIm1lbnVCYXJcIiBmb3I9XCJhY3Rvci1maXJzdC1uYW1lXCI+QWN0b3IncyBGaXJzdCBOYW1lPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJhY3Rvci1maXJzdC1uYW1lXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVCYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWVudUJhclwiIGZvcj1cImFjdG9yLWxhc3QtbmFtZVwiPkFjdG9yJ3MgTGFzdCBOYW1lPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJhY3Rvci1sYXN0LW5hbWVcIj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51QmFyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cIm1lbnVCYXJcIiBmb3I9XCJhY3RvcnMtbW92aWVzXCI+QWN0b3IncyBNb3ZpZXM8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxzZWxlY3QgbXVsdGlwbGUgbmFtZT1cImZpbG0tbGlzdFwiIGlkPVwiZmlsbS1vcHRpb25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxvcHRpb24gc2VsZWN0ZWQgZGlzYWJsZWQ+U2VsZWN0IEZpbG1zIEhlcmU8L29wdGlvbj5cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICA8aHIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGlkPVwic3VibWlzc2lvblwiIHZhbHVlPVwiU1VCTUlUXCI+XG4gICAgICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIFxuICAgIGBcbn07XG5cbmNvbnN0IGRpc3BsYXlOZXdBY3RvciA9IChmaXJzdF9uYW1lLCBsYXN0X25hbWUpID0+IHtcbiAgICByZXR1cm4gYFxuICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlciBpdGVtLXJvd3NcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC00IGJvcmRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBhbGlnbi1pdGVtcy1jZW50ZXIganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxoMz5cbiAgICAgICAgICAgICAgICAgICAgTmV3IEFjdG9yIEluZm9ybWF0aW9uXG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgzPlxuICAgICAgICAgICAgICAgICAgICBOYW1lOiBcbiAgICAgICAgICAgICAgICAgICAgPHNtYWxsIGNsYXNzPVwidGV4dC1tdXRlZFwiPiAke2ZpcnN0X25hbWV9ICR7bGFzdF9uYW1lfTwvc21hbGw+XG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdyBqdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgIDxpPlNlZSBBY3RvciBMaXN0IGZvciBBc3NpZ25lZCBGaWxtczwvaT5cbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJidG4tZ3JvdXBcIj5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiLi9hY3RvcnMuaHRtbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1zbVwiPkFsbCBBY3RvcnM8L2J1dHRvbj48L2E+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIi4vYWRkLWFjdG9yLmh0bWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tc3VjY2VzcyBidG4tc21cIj5BZGQgQW5vdGhlcjwvYnV0dG9uPjwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2RpdlxuICAgIDwvZGl2PlxuICAgIGBcbn07XG5cbmNvbnN0IGRpc3BsYXlIb21lUGFnZU1lbnUgPSAoKT0+IHtcbiAgICByZXR1cm4gYFxuICAgIDxkaXYgY2xhc3M9XCJyb3cganVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLTggXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ncm91cFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkIHRleHQtY2VudGVyXCIgc3R5bGU9XCJ3aWR0aDogMThyZW07XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9XCJjYXJkLWltZy10b3AgaG9tZS1wYWdlLXBpY3MgXCIgc3JjPVwiaHR0cHM6Ly9sZXdlcy5saWIuZGUudXMvZmlsZXMvMjAxNy8wNy9Nb3ZpZS1yZWVsLWZpbG0tcmVlbC1jbGlwYXJ0LmpwZWdcIiBhbHQ9XCJNb3ZpZSByZWVsXCIgc3R5bGU9XCJtYXgtd2lkdGg6IDMwMHB4O1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ib2R5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aDUgY2xhc3M9XCJjYXJkLXRpdGxlXCI+TU9WSUVTPC9oNT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiY2FyZC10ZXh0XCI+U29tZSBxdWljayBleGFtcGxlIHRleHQgdG8gYnVpbGQgb24gdGhlIGNhcmQgdGl0bGUgYW5kIG1ha2UgdXAgdGhlIGJ1bGsgb2YgdGhlIGNhcmQncyBjb250ZW50LjwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIuL21vdmllcy5odG1sXCIgY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIj5HbyBUbyBNb3ZpZXM8L2E+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYXJkIHRleHQtY2VudGVyXCIgc3R5bGU9XCJ3aWR0aDogMThyZW07XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9XCJjYXJkLWltZy10b3AgaG9tZS1wYWdlLXBpY3MgXCIgc3JjPVwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFRWUFBQURBQ0FNQUFBRFJMVDBUQUFBQWgxQk1WRVgvLy84QUFBRDcrL3YzOS9mdzhQRDUrZm56OC9QbjUrZnI2K3Vpb3FLMHRMVGg0ZUdGaFlYVDA5UE96czZibTV2SnljbC9mMys2dXJxTmpZMWZYMSsvdjc4OVBUM1oyZGtzTEN3ZUhoNUNRa0tycTZ0WVdGaE1URXgzZDNjeU1qSnZiMjhYRnhjaUlpSjVlWGxlWGw1SlNVa3ZMeTluWjJlVGs1TkJRVUZ3Y0hBTkRRMmVucDZUM0drL0FBQVloa2xFUVZSNG5MMWQ2YUtxT0F5V1JWa1ZGQkVWWE5EamxhUG4vWjl2U05tNlFxc3crVE56RHdnbGJiWXZTVHVieVpBZVJzK0xwdVdQcStNbUM2bWZqRUNHRnp2UnoybTN6OTlhZnJ2OFpwR3pTWXovNiswTXhVK3RwQ3lLRTgreTNKTjJjcnlwWDJrbWY4K0Q5cnRkdTQ1RzBmRyttZnoxSEVwTzVidmZoZFVOMGRlMHJkWHppMi9KY283YXhYY3ROUEVKelFhZ1M1Uk04bVo3dFVsVE53NXQ1c29MWGh0UjQ4dzBiVDJSYk5qQlhudUYzYjg5SGh0S3VoWG1tSy9WdmZSK3d4Ni91NmZZVEJ1LzVaOGU3TlFINVFLWllrSldXKzIrSXY1aUM5aFEwbjFFNFVnNXovOE42aGZZKy9KZlo5N1AzUEpDUE40bzZvZisyNmYwSXB2Zk9BTnM2RGthSTN6K0M3SWxYTnlKdURDYmJjcExtN0VHZ1NqTWp5dk9ueTg5Yk5BMFh4L241Wm5vQmJ2bERDekVVL1REb3J3NDRxcE1mbThoOThLeGx3MWp6Y1doZk5MaitTclMxUGtyMWx1Yzk4Q2h2ZGhPLzJqYVlhUzVnRVdaaWwvVFQ4OHhsUFcyQ0hHVk96ZFhmbzY5ZzdkTWF6TEx5OWNSUmxDU2Rmc1Jmc3Q5aUEzYVlScnJPZk9LaGhPM3Z0dEFMSlpqdk0vUlhQSEZZSkFObXVhTU1Rb082V2t0SGFlZUZRZkxZVHZDeTg2WFBtZk1sV0FEN2RpTVNQVmkzUGNNRVZ5cjc5M0pMT3ZWTUxFTUcwVDI3SHQ2TnBJblhnOWhlVG40OGpYRy90Vi93MHFLRGRyMXkzRUlhRjQrT3QrajlTQTBGb3U4akhTK2U0MmVEL0ZSNUUzVGRQOXVJQUtDU1RqTmtWZnhFQzVhc09uZlJiNjdRYW5XSmRtZ0ZWOE5SRURnWks5ckRiRVczUVF1S04vcGthVHNPbnlQTEJ0R2Rtb3JjbXIrL3NFTFJORUQ4RXJrOXNqUVBaTzRTWm9ONDFodmtzQmNJM01NM29FbUNHbzMybGMyZTVQTGVLSDlRUVZPLythZmowVkFRYnZLMXByUVBkaG8zNGlrcVVtNWY0UGVkRWRDNmYyWVFDaHEzdzcwSk4rcEJvdnBmL3lLbmR4Q0VzVEFYUHBLVWZFbzdKaTdLTU92aC9DbUFiTXZKb2YvVElaa3ZPbVdQaDJNaUFEMWFSUVlmQzFYUzRKUWZHcXZUZGt3blFjTUNXbHNxd25tZXRmOFl5MVlEaUE1bjZySXU2d2diMVRZb0xGbzZuY0VtckdkTDQwUHNZQlgwUk1jOXBFbjdYY3RsZGd3ZG5DeHdwZVl3dy9pQUx2dlFTVDY2RWQ2RmZXQXNqd2FPWW1obHdIRkJmdEh6dDR5QitqcU0rekhrbGRtaGhvYnhqYWFFT2lIMkQvWWFZZmxlbUgrS2tWcmVZUmdyc1lHYld3ZjZsZnJsa0FaVExLaElEaVlud0VlcHNndjVaRCtUNDBOWTBOUmtEZHJ0Y05kWS8xL3NWODFSS2tROE9iUVNZME52Y0RoSjJSdW9rdWp6NWZhamRZQ1Z2bk85MmVxNGFUaTdsM1YyUENwMHBham5OSEJrZmFwUWpLVlVJcTFJaHZHanl3dzhwbEFDRjc1R1RhdUpCT0kzU3AwR1MxN3dxRU43U2dCVnZvaEJIZFVTbjh5SlE1RE5GSGVBcEZCKyt1Z3dEOEVmQlRzeEV3V204Wm9PcmkrSkNxa0JyZGkvOW1UbG1yS25GdnAwVWVuejRZbFJ5ZUNEY2lhZnhqZXAycU92eXcyM2RHVXl1Rk9zQ0g5Z3V0YnRYRE1VbWJEQktCa1N6N09CdnVidCtWcTRZOTVVR1hEVkRsTm9BSlhrUUFRZmc2NEtQNWdwOG9HSlh1c1NBRm1GcER5L2pTRzhWVFo4RkJsdy92RGtjbFEwWm5qeFZ2N0F2NWM3b2J2SVVoWWtTT2tUNGNtUVVFbjBWdnRDeWgyNXFvaVJDOWxOa3hZdGhtMU1COWd4VDNWUUlNUFVzVk5WYjNwQ1lENmpySkdGeUJ3OEF1c2E2MWFES0NFVFNPYUlwMVprZDNnVEZEazhpa1FpK2lzYXMrVXZlbXZxeTdFbERZSlBGQllueXVHa3E2cTJkOVFtUTNUeGRwWlBZZWdHUDU5NWEwK1ZaZVNjbEF4bmVPd3FFRWRORE95aWtFM0RHT3UwenpicWxZWkswTDBtc1lCREVjaXA0cFgwSWdHWjlQd1ZuL25uK01lM0l0M2Z2dVh2U0kzYVhuM1ZGWmd5bXlRVEkrcTA2VmlNRlRVRHdqZU1uaG83OHgzd3NTeVRkTzBiZHRhcGRINXFGMjJmNmdVVlZrM3pONnFiRkIxMEdRcHJLcGF6a09jRG4rMDNJOTVxc09zQi9obnJaVWpIMFdJL3VQc3lTQ2RFR0FFY05oQmpCeDV2dmJyaW5LcFdDcFMyWndwZTlQN2FSQ0hGYXAzUVNXS3d1ZzYrZEdpSHQySkdYL2w3UHRabFEyM2FUclRIdUNlb21VdGttdnZaeURLeHp4aVpheVFxZlQ0aVkyNVlkaUorN2ZtUnVFOU5hMWZVSWhBYjFDUGdxaG9maCtFT3A3ZElKVUxyU2x2K2tHdHlPVW15a2oxa1kvYWlOWFFQL2hJcUVINjVWK1AzK2RCOEFGckQxRldZR1Q1T0pJcDNiWXN6L01zMnphcm1UY3RUSFRlWTFkN0FEbGFQcTlrbXkvN0w0bDhtWWtidlo3NzdMaEltZmdROTZiZmNEWGM3dXZudlV1L1pILzVQWjZ5SnlZZVBYcjhZN0lCM0VOK0UxY3gyTGVyeEVNSVhGVnd6M3h6enFzYm5tVEdCY09tdDZYeWkvdmEwQkJOb1NKL1lOeVFWdVo2NmlzNUFKU0lFbm1vaU9rKzhWdCs4QVhXbFRpVTJuVXBrZUdld0dDNkVMNmpCQnBQL2JxU0NlUUNIeVd6NmcyM0tRSjlySVBDUjM0Q252VnVmcGpPYktuODl2anVrd241Q0xTa2VhR0VLNHQzRVMxVGxIQ0YxYWVkaXJnUmFSMzFoZiswejY0VndVcXUxMllLWjNvTHFWRlE4eitjaTlKY0lFRjJITnIzd0tINFhjZTA5dFhqY2sxRWMvelh0ckdWNDRMSW9uMU9McFFESThIbTJLQllIb3NqUm9rbHdnTXRLNVlDODFZNjV4V2NwaU8xWWNXY0VPdGY5bnlkWDFjS3cvK3kyWVdoUldsOFpqUG9zdUhVUmlmeVhDQWhnME4zd2VqVjZZc0F2WGNiUXFrSDVTLyt1d2NiYjlIb1FwTm9XeDA3ME00Z2lFRDZrZFc5QzRVdWJRcE9WQUIwUVM5ckRnVkFsVkVzN2E4UjRkZklPVzBrRWlnNTg4ZGVmQ2pFQmxTcGhocUFybXRydENBYjJySS8xMGtETWk3NlZDN2wvUng5QXNjZmlWUllUdlhXcWdWWFNlbXhkQVkzNDhTNElkVjc4aFZrekZDRzV1M0dIYmQ4MFRNUU5Vek9iT2xKN0tacEdrUitrTHBMUWdURDh2N1drZVFzSkl2cFBCa1ZvSGNRNENZSUppNUsrREkxVENvUXRvSW4vU0czYU5XeU9RQlpyeHpvakhYaEZweWtWcW0wck5pSjFuNVVwTjZYanJWVlZjbWV1TE1uMnhUU1Bvb2tncTJDL3BuY3Q1dnJlNk82aVgycDhaZHpmbHFzTWNOeDJ6S2JZNmpRRVZWYUlsUEhZTW5TVFNFVk1Ra1gzSS9VZVI5U1VZWCszaUZ3QnN5QmlaK05RaEt0OVQ5ZUVuWHpBSUk4bUlzdk5TWEhaQ0VKZE50a1JLSWwxTDk5aFdBTUZoU0YxOWdxYlZnZnFndjdYWG5tWUk4Wm0yQXI5Zzh3bXpCUVRyOVhpQ3BhWVBSUEVLSjVUakZ2cFpqdlAzNlVmVDVYWlpZTFVFMk0wNkM0R0RqUU11T05KZnlwQlg3OW9LRThjZVlsd1VBbDBDbEtsNVp0ZTNIUWNldURkUCt5QnJzODN1OHR4Wkk3blcwcDVUbWdLODZhZ0MvZklsMEMvdlR2SnZFU045Z09hSVFEK2ZSbDQxdXA1K0gzTmV1UlZOUDZ4VmRjREp5U1BrSHF5d3pYdjhSOU1BTlhOQ1VLTmNOTWNWcGpWRld6cDA2VGtJQTVvTEVjWGJXb2hwZVNGdDl0TFlQMWM3ZmJIVS9yRkptR013cnNKRGR5QU9KNC9sWVZvNnMxR1pndEZBL3JpZllhWXRVQWpnZVdLTlIzcjlIaVVTbVc1WUdtcU9uK29HUTRveFp4QXplRVRrNmNWRlBTUE8ybllNQWlCSU9hdVFJZm5oemxoWmFUU3VXRDJmSVR6QlF0eDdieTFoVTh2MEJoUlFXVnBsU3FFdDF4SUhxVVJsVXdGMEdMYWFMdVB3cHhVV3NLbVhFTmhhWlN0RmNxS3RqaVFDMmhtM09rRHZpZ0FGTjJrc3RqdzBOVjMvSTdLZVVsQzFUTFhLRjEvNmNxc3Vid1FXa251N2lMMTlFWGtPYlJVSzRTNWl1M3EvVHZZZkNHUXJQMnhxekNVWTdiZUZkQXByS09rWWdOcEc0SWxkRnZQcXIrbHVibXB2b2s2V1p0YjJZaU1lUmtNbUZ6SWtscHRMQVFCdVdMU0c5RXVheFJ0QU9EOU9vRU5zVHllLzY4emFiNWdETmhyblNiZ1l0SmxRN0w2MHBjdmloM2RBa0NTR25BRU5nQWxtdlBmdzVOYU5WWE5VYWNYb2Vick0xODRpMVVKNXFwcG5vTFR5NFlyMnphR1J4Nm1FTEoydWxLbzFkT0p4dEZ1THltZXc3TkQvaXFRZkVaTHNXSmVtSk1ORjZPejhzbGdHUEIyNUtzbHEwOUE0ZlBhbDJTL1NUV2ltWUFWeXFPY2lHdTBBdVdiZHlEK28wci9JOWN0MUh6bFNpS1lDWGdKZWZIcHdUR2c2d1U3cUtmbGFzYXhaWGZrczFhNE5DanJLUlVLWDI3V2sxOGJlQmZKT1ZJK29RbVJWT0pCeFU3WlEwcGpwRGxGaFlLMDZ0OG40d2oyZFhacFFSWHVpK1NnaDFlaE5kUk9jTFl2OVU3VjhSSVl5NEY1VldhRWYydlRQVTBOdGZJdE5BK3J5bkhoak1aT0tHUDZGYXY4VmJHZUh0Q0lwa0JMYlNPRFRMMURkaFBrVTVsWXJpZFREQ2dVN1lXU1hZWFZTVEtwUVB6SHNVbVU1VlN5MVR0RVE1dWpVYjR5a2R5RGl1UzJqeGlUbmsxeUkvc21xcGQ1YUxHWHJoRVlrUTE3bGgvekdDTExxSFowT0toamNWSlJxd3RPdlJBVXRHdTNrQzV4TFVYUEJ0R0hSbzcwekJzYUZNTE1vNUFNUllWdkdReXdVeElzd0ZGTkczNXlGclpYdlpEcVlOMnB5bjZiQVI2WURsUWE5bkhmMXJUWGNZTmpoa0w4OEFuSTFNRysvdnJ2cTlEUDI4Q2laYjkvYytqNGlZMGg2UlVHRkp0b0M3amE2SmwyWGg4ZStVTlpBWnMvWUNndHFCMjYyUDBJOVEweGdCL0kzYzU4YVNLSDF3V3JkaGhzNkhjZ0drTWxMUU83RGZaT282ZGF1NTdHbFA3ZFdaNDQwanRjQm15T0VBVjBsU0xoQmVYbUZheVhJVnh1RnB4dk9OQmo2Yy8wR2sxWXFleThwNkhNVmdDWWlQeFJWc3A3Wlp3S21hZTdYVG9XSmk5Q0RkcDlEekNRVU10N1psM0RHSkcvWlBUMWpSZDBCdmR6YklYaTJORURHbFUzTG9aY3V2WjVLUlp6WmJUK040TFFYNjdIUTU1VGlZVWo5Uklobk51dlVYL1FXbFVYLzc2ZFE3OFp6NzRLTFllRXJrOStNUTZCem53TCtkaUZVQXJ6czUrdW1IYWxwZVVVdUVHL2d0cEVkS1dER01sMTc3UjZFc1AreDZXWGdRa3hjSDFZRWk0RDdDWEJaOTR1NnBWQlFybXpPdmZJVUpQSU1nbkJFTmlZMkNwbUpYbms5OGNjNFpyNERmSEl3Q3B1blYvVDJUVDJnNDM0a0h6ZkZna0IvWVNTY21GaEFBbHFuSjQxZGdzTWFlM1hNRjJFMVhVdkY0Mk5JR2RIR3psZ1dsZUFHeWp6OWx0SklLaEF2OHdGazdlN3hob1Zjb2xJOHZHZngxa1lVaVI0MzBoTWpWdFZKeklBOEVuTHFKYlIwZ3lxY2ZrMGZHQk1oVGIxREowSTRuSTRKdDBYRmQ4SWNHOHgxMVJLd3hTLzNKWFZVU3c0U1ZmNGlESWNGWCtuQnd6MSsxOUJFQlFkRWJCSnZwTUNHMlNhZTlqdEdGbXRzbmQzYnJkVlNqMGdmdUZQczZHUkdYYkY1Z3FqaU9VNUpwMFluelRMSnZ1YTZzdzN6QXR1eGE1R09zV0lueW8ybVhLSWllMDJ4TDVhaXVWcDR0WmZRcmsvTWNkQ2NHR2kwbzlBZklhT1h3d2QvSWJHSHVIYWowMEVVVzJBanNTVkZuV0xBclJaSHV0YUpQY3hhSFgzWE1kT1p0NDR3Yk8wcU5xaUVuaVo4R0FwL204ZmE1S1N4N3lHamt4bFA3a3NFRmZ4cVUzK2ZvNW5iS3QzelVQemsrd1JtdHJmeXJGZmZORFJCZVBBQmh0T0cvZWdrNDQxdkZLdlpldUpCTHN0d2NxcGZhcUZvbzE2d1lhQlMrYkVwRnF5SFBZdHAvZm9CTnJUNE5jOEg0cEtHSjhiYUNkRUtuTG5QTHQyTTR5U2lzeG9KWWdKWnAxSER5ckxZWW1tT1djZWttQU1xR29GWERiU05UNkJ2SGdieUdPTW44Y2E1YkE2cVBCZWlZbjhVdElCQk51Q3l3NWJKZGRQM3VwdmxsY3JYMGkyb0hBcy9xbThOdWE5eG1sNVIzT3Z4NExwUEZwWmVSUnY5emo2NFZOQVFtY1ExU1pVQm1pM1FmN1d6YTI2RXFPTHNDWjNuZGtBaHFWVS9wMTB0c2pzMFZxSk95SWIyTE1wcTlFYmwyM0YwM3gwWmFHblI1K0JiRm4yOVl5alU3VTZ4YUI4SHhDdEdwQVlDdWxjSFRpY0JXNndhdm5RRVBXRmlkRXFXam5kSEJnV2RFWFFoa2cyaG82K1hDYmZvODdZbnBkV2FtZ043TGlwRlY1Y1pqVnNXTmhYeTFIY3Yrd3k0MXphWE4yREx5S3ZxTHRCdGw5M01iUFcvUWNzMlRFeFM5ekgxZ21IMllRMkVERkRMb3JVQmdjUUFUcm5hbWZ3b1ZkaEJZQUxvSnFpTDdZVE5OZ2k4OUVFV2JpWGkrdHNjK3JBdEovb04xOWJnSi95WTIvYWF1SmFMR3VYUXVrYmhKdUtsQ0lxeUdlMmNpd2ZOT2l1a2kzbUxFN3JzTStuOXp3bHF2TlpyV3NUeHoza0xqN0doOWY4bmoxZmZ5UTI0aVI0QVdscDhaSDU4VmYySFNENUY5dm5taDRhUkg1cFVjYnc0TVVIQkNuUFNlTi8zVW01OFJQa1JZemw0N2paS0tOajRUb0l2S3hZcVJUeDkxZlZxSGsrNGs4TzZRUUQzeEZ6dEhDUGQ2dXNPWkhERFdEWXJtaFg0NjhQZHBPT2wwejN5TXpWc2RXVC83dmFDMmM1T0p2RW1IY1YrRXZVSTdFUVNNWmViT1hxM1ExSXlRb3JGbUhGZTRjM3RvbElZTmQ2Wm9LY1JGQmFwdzVNS0lqTUxlbDErVi90NzhsandycGdIMVRtUWg4eFB0ckd0SytJbEVMc3dZM1I4UUh3U0UyWXRjUUFZQU9yS0xSZHd4MHBOdWZJNlNqT2FXdGg4d1AzSERwb1kzelhDTHFBdGZBRTViUGNyblFrNE1DVzdSSDlYT2o3NFlWU3pQMm9kd1RVeGR1V3FKUHl6ay82Y2w1b2JSaFBJVklxRlNIYXVqMVNodWcrczM0K1lXanJLL2Fpd21DaDNhRVdHS000NTBwTW1RTDN3RWNDaVhQZjI2bzBhR0xuRnNxeUpiVTlSVmlvVGRiRUZSTXNCZVdMbXQ2SUJaZXFCMDEwaTAwUGVNZDRNMzRuVDFHb2lxZ2MwQlJqeThTSmUwa0N4ekEvNTJwbldhSnF3VC96YjZIWnVtaGIwWmc2WnhBTk9WeVlxb2tXeXo4cnJBSmNXMG9TOFRpM2JDR2t3SmJlcm1BN3JXQmMxUHNrbGU2SkhJVnZ1RHlnY1pUT0p2clNqN0IwK2hhTFJKNXUvVjlYeDFNelBPcHpxcFl5dlVxUVpvR1JpQi80QytUeVRTdU9la2FFZDUwNzFwQVJzVUhNZUxuY0w0bnliTUxmN1VxOXpDNG1WLzNYV3hXUGlaejFIajkwTEhYSTRKNC9CY1ZmRSsxS2I4dVZlK044SE80VWJJeFNPTm41WTNURFY4UTNjM1gzcmNqeFdDQzB6TFpodE55SmNkSUpVRDRJTDgzTXArN0crM2FyZjcyM3Y3a0V4S2VxdmhodXZQdlpMYUpSdE9CWmtMYVVvZ0FGejNTaXNaamE1WldmM0llZGQxVmhWb1RubkMxR2ZaTnE1UVNLcEw0RTM0M1JXSjN4SDVxVVJXWFZ0aEZOdUFWUGhxbXBsTWUxekdzSTJ0VlZtRC9QMGk5QlFQV1dUdkRqbGlBMnVWRGl4SHQrb0grTDV0cTgzRkU3eUVjcnZZVnFxbVFiREFmRUdJN3VPVFhvSHhXTWFTZ1VTaUIxSWsrNmZsV3M5ZUFIOWxrRnJ4dVdJTWtvZEV0cC9EandkWWViQythMWZnd0EwNmJmc2loUVJqcUpORkNpZzJxbXdDSUNCM0ZWd05rem1TblZDQWFPS1dza1lJbWVTQ3pCKzZIUnlteUJCblQ1dXZsaXFNL0owN3cxMUhyK0RlUm5Veno1RmlMQVVsZ1kwZ3Uwd1JWTGQzNzJOekdVbzJMSTNIeXpGaStIcExIeHUya204WkdwNzYyc3c1N2JHYll5QWZaTU5MQmpRYTRWeTF5Yms5NlNPcXMvK0RqTHQvY21rQU9oRWpTV09jT2dXTG9ac2liN25Dcm1rNWlXYlp5clU1QXQ5WnFzSGo4aXhQVGNBTDBGeXVKU1pSUEExR2xvYjErdlBSMDZDb0Foc0tLa2M3aVFyV0gyUHhzSmw4TjlqRG1vS2ZiZFZTa3F6bW45SjJpa1U0UG9GUG54ZVNyWWJZYmpsbHFPM256aDBEWmtVYUxvbXZjUlBwU3JXVmZVWG9kdkVWMlU4dXh3aDh3MUlRaDl6ODl4RmFlSktSQ0ZvUWNDUmdCL1VnZXhlZFBlcHgyUmIvOWZwOXR5aDdRTnRaWmhlQXlrSGtaZjhxalltdmFpRm1kT0kvU1pPNVhqdFJXZGlNZEt3THVDZ1ZDRjJQcDNqNFNHSHQ5VTRPUEVGZ3RoNEhJc1lLSkkvc3NkOEl6VWx1S3VIbzRiWUZvZEZrZjZqNGN5MzlFY1F2enQrbE5CUmVLUzdEeTFkb01EdXg4T2xZTUNNQWJIVUo0a3Z0Y2ZVY1preWdtSElUR3NlaU5MOGRhdGVqb0NMcnVjWEZyUXpiakVtMG1PZmVzdEZCVTJUQlZ5ZHdPS2hFM1lvNTJvaTJzT1Rhc3pyb0dRa2dsS20vVUpFZDdRaVZSVlMzdmp2bEN1Umd2dlFncWlIVkdBNnlmTkovZ1dKK0tpT1ZRVUorSTIxTVJLRHRTWURtclhEVVdzMWhobmdUTTBpVGxIbVZnMFQ2M09ta29QMmJyTkZ3bW5yY01pOVRxaW9QNFVjVjRvd0xVbDllSG4yTTdaRittT3l1MGphVjMydTNsSkxnU0twZnAvdDc0eWR3dGRUL3E4UkFNUk9OdmpZbzNEOEJ5blNpaCtXZ205TStqR1YxaERQL3FXSWRUNWp2bU9XUWdkYnc0Q2dCQi9QOG5PbVE4RVh2dHJSdVZJZ2JScW1QY0l3cWhKb3Fib0hwZ253NnUvVFJTTWJ1TFlsbHN6NG1EbzgvWWZlSEdVNCt6Q25EaHVpQ1FMR2gzYXRLbUtvTXFJd3NCcGt3NFRmdVFLWllkTjlQOEVqN3gwWjBXdEI3OXRSM0ZnblFUWlNPZkp0a3NOM0k2eVJkK0llWlh1U0xKR1lNeVB1N0pOS3U1K0hJWUd5UXNSRUpSVldkVzZnRkM4Y2xBV292ZndzUTJKV0kxVUtNUHhoR3p3V3paN2t6SmhsbktiY1hMR1RaMEpMdWZzTUlZZXVRc2JsN1pWQ2hPUkU5ZWcwVVBGeVlZQ25qS1Ftd0JLYVY3OWQ4SlU5eDZ6cTdIbnVoNmlwRkEyNDJ3QjFGSGtXODJCK1I2dXJvNCtHWkdQWWkzVkI0TGRDUHAyTGM3TDByd2FudVFVOVdqRkpRb1piYkVFclh5NTZONlRlVDd4RDdCb3VrV0hndnlFOUNhdSs4cVM1empDOGNoMlArdXB3Zk1xczNVMVBtYkV4VXU4bFA1RTBVMlFHQ2dlMUMyUlYxN2Nra25paXBxMmhNV2VjSGRVbmxLdUJ4QzJGNm5yS2xnejR1SjVCTFJnZ0JSZU4xMlB4TkJvalZkKzVjRERnVG0vc3JFZGFVWkZxUDFwRms0SHpqbzQ2U0ZtaVhwaDc1dUltUXM4RHJWeTNaZC9EbHBXcnllWUU4SDkvdVRKcHdQVEozMFoyY3dLcEhYSnhhZ3NwK3pwVENiT0dLeG1DM2NBdm45UHlUUmVzOXFndkVndEdzcHFGd2VNNzFsdDNrajhtWFJwRTVMUitDemNXRmU0TUsrUmx5OGdHZkZSblZ0alYwbG5jU1d5dGZwNWFFaDJMcVBqU0V0RVA1ZkRQT3owanN1SGJkN3lpQ3BYOUw1QUg0MXRpM1c4Lzlqd2d4MmdTbkZuUExzVVRLWmRhM3NFRTd0M3F5bWdlVlNtSTdHVU9Ubi81VUpRSERxcGQ4WlRnc2RySHlhS0czWFEzWjJTeXNZK3VST1dzWXZJczg1bGErMkxDK0pJNlNqbnRORWMwTzBQR3UzaXo5VkFsbUdGb25yWEIrbG9yZzhvMUJPN1A4RDFXY3hCeGFOQWpFQUFBQUFTVVZPUks1Q1lJST1cIiBhbHQ9XCJBY3RpbmcgTWFza3NcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtYm9keVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGg1IGNsYXNzPVwiY2FyZC10aXRsZVwiPkFDVE9SUzwvaDU+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImNhcmQtdGV4dFwiPlNvbWUgcXVpY2sgZXhhbXBsZSB0ZXh0IHRvIGJ1aWxkIG9uIHRoZSBjYXJkIHRpdGxlIGFuZCBtYWtlIHVwIHRoZSBidWxrIG9mIHRoZSBjYXJkJ3MgY29udGVudC48L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiLi9hY3RvcnMuaHRtbFwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCI+R28gVG8gQWN0b3JzPC9hPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj4gXG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG5cbiAgICBgXG59XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtb3ZpZVJvdyxcbiAgICBuZXdNb3ZpZSxcbiAgICBjcmVhdGVBY3Rvckxpc3QsXG4gICAgZGlzcGxheU5ld01vdmllLFxuICAgIGFjdG9yUm93LFxuICAgIGNyZWF0ZU1vdmllTGlzdCxcbiAgICBjcmVhdGVNb3ZpZU9wdGlvbixcbiAgICBjcmVhdGVDaGVja2VkTW92aWVPcHRpb24sXG4gICAgcG9wdWxhdGVGdWxsRHJvcGRvd24sXG4gICAgcG9wdWxhdGVEcm9wZG93bixcbiAgICBuZXdBY3RvcixcbiAgICBkaXNwbGF5TmV3QWN0b3IsXG4gICAgZGlzcGxheUhvbWVQYWdlTWVudVxufTsiXX0=
