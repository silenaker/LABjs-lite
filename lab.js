(function(window) {
    var scriptsCache = {};
    function LAB() {
        var curCbs = [],
        	curErrHandles = [],
            syncReqQueCbs = [],
            syncErrHandles = [],
            syncReqQue = [],
            loadingNum = 0,
            queIdx = -1;

        function nonOperate() {}

        function triggerCallbacks(err) {
        	if (err) {
        		errHandle(err);
        	} else {
        		try {
        			while (curCbs.length) {
        			    curCbs.shift().call(null);
        			}
        		} catch(e) {
        			errHandle(e);
        		}
        	}
        	curCbs = curErrHandles = [];
            curCbs.push.apply(curCbs, syncReqQueCbs.shift());
            curErrHandles.push.apply(curErrHandles, syncErrHandles.shift());
            (nextReqs = syncReqQue.shift()) && nextReqs.forEach(function(request) {
                request();
            });

            function errHandle(err) {
            	if (!curErrHandles.length) throw new Error(err);
            	while (curErrHandles.length) {
            	    curErrHandles.shift().call(null, err);
            	}
            }
        }

        function _load(url, callback) {
        	if (scriptsCache[url] && !scriptsCache[url].loaded) return;
            if (scriptsCache[url] && scriptsCache[url].loaded) {
                setTimeout(function() {
                    callback();
                });
                return;
            }
            document = window.document;
            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.charset = 'utf-8';
            script.async = true;
            script.src = url;
            script.onerror = function () {
            	delete scriptsCache[url];
            	script.remove();
            	callback({ msg: 'err', url: url });
            }
            script.onload = function() {
            	scriptsCache[url].loaded = 1;
                callback();
            }
            head.appendChild(script);
            setTimeout(function () {
            	if (scriptsCache[url].loaded === 0) {
            		delete scriptsCache[url];
            		script.remove();
            		callback({ msg: 'timeout', url: url });
            	}
            }, 5000);
            scriptsCache[url] = {
            	loaded: 0
            };
        }

        function load(url) {
            loadingNum++;
            _load(url, function(err) {
                if (err) {
                    loadingNum = 0;
                    triggerCallbacks(err);
                }
                if (loadingNum > 0) {
                    loadingNum--
                    if (!loadingNum) {
                        triggerCallbacks();
                    }
                }

            });
        }


        return {
            script: function(url) {
                if (curCbs.length) {
                    if (queIdx === -1 || syncReqQueCbs[queIdx]) {
                        syncReqQue[++queIdx] = [];
                    }
                    syncReqQue[queIdx].push(function() {
                        load(url);
                    });
                } else {
                    load(url);
                }
                return this;
            },
            wait: function(fn) {
                fn = fn || nonOperate;
                if (queIdx === -1) {
                    curCbs.push(fn);
                } else {
                    if (!syncReqQueCbs[queIdx]) {
                        syncReqQueCbs[queIdx] = [];
                    }
                    syncReqQueCbs[queIdx].push(fn);
                }
                return this;
            },
            catch: function(fn) {
                if (queIdx === -1) {
                    curErrHandles.push(fn);
                } else {
                    if (!syncErrHandles[queIdx]) {
                        syncErrHandles[queIdx] = [];
                    }
                    syncErrHandles[queIdx].push(fn);
                }
                return this;
            }
        }
    }
    window.$LAB = LAB;
})(window);
