/*!@license
* jQuery UI based embed widget for embedding source files from GitHub.
*
* Depends on:
* jquery.js
* jquery.ui.js
* highlight.js
*/

/*global document, jQuery, hljs*/
(function ($, hljs) {
	$.widget("ui.jqGhEmbed", {
		options: {
			/* type="string" Default height */
			height: "500px",
			/* type="string" Url GitHUb tree folder to download JSON config containing options from. Exclisive with the embed array option. */
			remoteUrl: null,
			repo: null,
			owner: null,
			type: null,
			ref: null,
			/* type="array" Array of objecs to embed with path, type, label and others.
			```
			[{
				"label": "JS",
				"path": "16.2/EN/editors/date-and-time-formats/fiddle/demo.js"
			},
			{
				"label": "HTML",
				"path": "16.2/EN/editors/date-and-time-formats/fiddle/demo.html"
			}]
			```
			*/
			embed:  [{
				/* type="string" Path to the file to embe, relative to the repo path or remote json location. */
				path: null,
				/* type="string" Type of the file (matching Highlight.JS options). */
				type: null
			}]
		},
		locale: {
			fiddleEN: "Show In JsFiddle",
			fiddleJA: "JsFiddle で表示",
			copyAllEN: "Copy to Clipboard",
			copyAllJA: "クリップボードへコピー",
			errorInitEN: "Something went wrong..",
			errorInitJA:  "Something went wrong..",
			errorContentEN: "Failed to get file contents",
			errorInitJA: "Failed to get file contents"
		},
		css: {
			/* Classes applied to the loader shown while loading */
			loaderClass: "loader",
			container: "ui-tabs",
			tabHeader: "ui-tabs-nav",
			/* Applied to the tabs panel container when content has been loaded */
			contentLoaded: "content-loaded",
			/* Class applied to the JSFiddle button */
			jsFiddle: "JSFiddle",
			/* Class applied to the copy button */
			copyAllButton: "codeViewerSelectAll"
		},
		_ghAPI: "", //"https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}",
		_ghRawAPI: "https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}",
		_fiddleUrl: "https://jsfiddle.net/gh/get/jquery/1.9.1/${owner}/${repo}/tree/${ref}/${path}/fiddle",
		_create: function () {
			var link;
			this.element.css("height", this.options.height);
			this.element.addClass(this.css.container);

			//find embed link:
			link = this.element.children("a")[0];
			if (link && !this.options.remoteUrl && link.hostname === "github.com") {
				this._parsePath(link.pathname);
			}
			// show loader
			this.loader = $(this._loaderHtml());
			this.loader.appendTo(this.element);

        	if (this.options.remoteUrl) {
				this._remoteInit();
			} else {
				this._render();
			}
		},
		_remoteInit: function () {
			var self = this;
			this._getGhFile(this.options.remoteUrl + "/.gh-embed.json")
				.done(function(data) {
					self.options = $.extend(self.options, JSON.parse(data));
					self._render();
				})
				.fail(function() {
					console.log("fail");
				});
		},
		_render: function () {
			var html = "", self = this;
			html += this._fiddleHtml();
			html += this._copyHtml();
			html += this._createTabs();
			this.element.html(html);
			this.loader = $(this._loaderHtml(true));
			this.loader.appendTo(this.element);
			this.element.tabs({
				activate: function( ev, ui ) {
					self.activateTab(self.element.tabs( "option", "active" ));
				}
			});
			this.activateTab(0);
			this._attachEvents();
		},
		_loaderHtml: function name(hidden) {
			return "<div class='" + this.css.loaderClass +
						(hidden? " hidden" : "") + "'></div>";
		},
		_fiddleHtml: function () {
			var text = this.options.remoteUrl.indexOf("EN/") > 0 ? this.locale.fiddleEN : this.locale.fiddleJA;
			return "<div class='" + this.css.jsFiddle + "'><a href='" + this._getUrl(this.options.remoteUrl, "fiddle") + "'target='_blank'>" + text + "</a></div>";
		},
		_copyHtml: function () {
			var text = this.options.remoteUrl.indexOf("EN/") > 0 ? this.locale.copyAllEN : this.locale.copyAllJA;
			return "<span class='" + this.css.copyAllButton + "'>" + text + "</span>";
		},
		_createTabs: function () {
			var tab, tabId, mainHeader = "<ul class='" + this.css.tabHeader + "' >", tabs = "";

			for (var i = 0; i < this.options.embed.length; i++) {
				tab = this.options.embed[i];
				tabId = tab.label || "tab-" + (i+1);
				mainHeader += "<li><a href='#" + tabId + "'>" + tab.label + "</a></li>";
				tabs += "<div id='" + tabId + "' tabindex='0'></div>";
			}
			mainHeader += "</ul>"

			return mainHeader + tabs;
		},
		_attachEvents: function () {
			var self = this;
			this.copyButton = this.element.children("." + this.css.copyAllButton);
			this.copyButton.on("click", $.proxy(this._selectAll, this));
			this.element.on("keydown", ".ui-tabs-panel", function (e) {
				if (e.ctrlKey) {
					if (e.keyCode == 65 || e.keyCode == 97) { // 'A' or 'a'
						e.preventDefault();
						self._selectAll(true);
					}
				}
			});
		},
		_selectAll: function (skipCopy) {
			var range;
			this.activePanel
			if (document.createRange) {
				range = document.createRange(), selection = document.getSelection();
				range.selectNodeContents(this.activePanel[0]);
				selection.removeAllRanges();
				selection.addRange(range);
			}
			else if (document.body.createTextRange) {
				range = document.body.createTextRange();
				range.moveToElementText(this.activePanel[0]);
				range.select();
			}
			if (!skipCopy) {
				document.execCommand("copy");
			}
		},
		_parsePath: function (path) {
			path = path.replace(/^\//, "").split("/");
			this.options.owner = path[0];
			this.options.repo = path[1];
			this.options.ref = path[3];
			this.options.remoteUrl = path.slice(4).join("/");
		},
		/**
		 * Get file contents with fallback
		 * @param path Resource path to get content for
		 * @returns jQuery.Deferred
		 */
		_getGhFile: function (path) {
			var self = this,
				result = $.Deferred();
			 $.get({
				url: this._getUrl(path),
				headers: {
					Accept: 'application/vnd.github.VERSION.raw'
				}
			})
			.then(null, function() {
				 // fail filter, try raw:
				 return $.get({
					url: self._getUrl(path, "raw"),
					headers: {
						Accept: 'application/vnd.github.VERSION.raw'
					}
				})
			})
			.done(function(data) {
				result.resolve(data);
			})
			.fail(function() {
				result.reject();
			});
			return result;
		},
		_getUrl: function (path, type) {
			var url, settings = ["owner", "repo", "ref"];

			switch (type) {
				case "fiddle":
					url = this._fiddleUrl;
					break;
				case "raw":
					url = this._ghRawAPI;
					break;
				default:
					url = this._ghAPI;
					break;
			}
			for (var i = 0; i < settings.length; i++) {
				url = url.replace("${" + settings[i] + "}", this.options[ settings[i] ]) ;
				
			}
			url = url.replace("${path}", path);
			return url;
		},
		_loadTabContent: function (tab) {
			var self = this;
			self.loader.show();
			if (tab.type === "htmlpage") {
				var frame = $("<iframe>", { src: tab.url }).appendTo(this.activePanel);
				frame.one("load", function() {
					self.loader.fadeOut();
				});
				this.activePanel.addClass(this.css.contentLoaded);
			} else {
				//ajax load:
				this._getGhFile(tab.path)
				.done(function(data) {
					var code = $("<code>").appendTo(self.activePanel);
					code.wrap("<pre>");
					code.text(data);
					hljs.highlightBlock(code[0]);
				})
				.fail(function() {
					self.activePanel.html("Failed to grab content");
				})
				.always(function() {
					self.activePanel.addClass(self.css.contentLoaded);
					self.loader.fadeOut();
				});
			}
			
		},
		activateTab: function (index) {
			var tab = this.options.embed[ index ];
			if (tab) {
				this.element.tabs("option", "active", index);
				this.activePanel = this.element.find("#" + tab.label);
				if (!this.activePanel.hasClass(this.css.contentLoaded)) {
					this._loadTabContent(tab);
				} else {
					this.loader.hide();
				}
			}
		},
		destroy: function () {
			this.element.tabs( "destroy" );
			this.loader.remove();
			this.element.children("." + this.css.tabHeader).remove();
			//this.element.children("")
		}
	});
})(jQuery, hljs);