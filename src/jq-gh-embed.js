/*!@license
* jQuery UI based embed widget for embedding source files from GitHub.
*
* Depends on:
* jquery.js
* jquery.ui.js
* highlight.js
*/

/*global window*/
(function ($) {
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
		css: {
			/* Classes applied to the loader shown while loading */
			loaderClass: "loader",
			container: "ui-tabs",
			tabHeader: "ui-tabs-nav",
			/* Applied to the tabs panel container when content has been loaded */
			contentLoaded: "content-loaded"
		},
		_ghAPI: "", //"https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}",
		_ghRawAPI: "https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}",
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
			this._getGhFile(this.options.remoteUrl)
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
		},
		_loaderHtml: function name(hidden) {
			return "<div class='" + this.css.loaderClass +
						(hidden? " hidden" : "") + "'></div>";
		},
		_createTabs: function () {
			var tab, tabId, mainHeader = "<ul class='" + this.css.tabHeader + "' >", tabs = "";

			for (var i = 0; i < this.options.embed.length; i++) {
				tab = this.options.embed[i];
				tabId = tab.label || "tab-" + (i+1);
				mainHeader += "<li><a href='#" + tabId + "'>" + tab.label + "</a></li>";
				tabs += "<div id='" + tabId + "'></div>";
			}
			mainHeader += "</ul>"

			return mainHeader + tabs;
		},
		_parsePath: function (path) {
			path = path.replace(/^\//, "").split("/");
			this.options.owner = path[0];
			this.options.repo = path[1];
			this.options.ref = path[3];
			this.options.remoteUrl = path.slice(4).join("/") + "/.gh-embed.json";
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
					url: self._getUrl(path, true),
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
		_getUrl(path, raw) {
			var url = raw ? this._ghRawAPI : this._ghAPI,
				settings = ["owner", "repo", "ref"];

			for (var i = 0; i < settings.length; i++) {
				url = url.replace("${" + settings[i] + "}", this.options[ settings[i] ]) ;
				
			}
			url = url.replace("${path}", path);
			return url;
		},
		_loadTabContent(tabPanel, tab) {
			var self = this;
			self.loader.show();
			if (tab.type === "htmlpage") {
				var frame = $("<iframe>", { src: tab.url }).appendTo(tabPanel);
				frame.one("load", function() {
					self.loader.fadeOut();
				});
				tabPanel.addClass(this.css.contentLoaded);
			} else {
				//ajax load:
				this._getGhFile(tab.path)
				.done(function(data) {
					var code = $("<code>").appendTo(tabPanel);
					code.wrap("<pre>");
					code.text(data);
					hljs.highlightBlock(code[0]);
				})
				.fail(function() {
					tabPanel.html("Failed to grab content");
				})
				.always(function() {
					tabPanel.addClass(self.css.contentLoaded);
					self.loader.fadeOut();
				});
			}
			
		},
		activateTab: function (index) {
			var tab = this.options.embed[ index ],
				tabPanel;
			if (tab) {
				this.element.tabs("option", "active", index);
				tabPanel = this.element.find("#" + tab.label);
				if (!tabPanel.hasClass(this.css.contentLoaded)) {
					this._loadTabContent(tabPanel, tab);
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
})(jQuery);