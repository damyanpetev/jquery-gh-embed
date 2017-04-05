/*!@license
 * jQuery UI based embed widget for embedding source files from GitHub.
 * 
 * Depends on:
 * jquery.js
 * jquery.ui.js
 * highlight.js
 * 
 * Usage:
 * Can can be initialized on container with link containing the `remoteUrl` or via options.
 */

/*global document, jQuery, hljs*/
(function ($, hljs) {
	$.widget("ui.ghEmbed", {
		options: {
			/* type="string" Default height of the widget */
			height: "500px",
			/* type="string" Url for GitHub folder path to download JSON config containing options from. Exclisive with the embed array option. */
			remoteUrl: null,
			/* type="string" Default file name for json configuration under the remoteUrl. */
			remoteConfigName: ".gh-embed.json",
			/* Repository name */
			repo: null,
			/* Repository owner name (user, organization) */
			owner: null,
			/* Pattern for the source link. Can contain placoholders for the repo, owner and ref. GitHub main url can be omitted.  */
			srcUrlPattern: "https://github.com/${owner}/${repo}/tree/${ref}",
			/* Relative path in the repository tree to build fiddle link with. Parsed from remoteUrl if set or provided via link element */
			relativePath: null,
			/* Relative path to the fiddle folder. Leave empty to skip. */
			fiddleFolder: "/fiddle",
			/* Git reference such as a branch name, tag or commit SHA */
			ref: null,
			/* type="array" Array of files to embed as tabs with path, label, type and others.
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
				/* type="string" Required. Path to the file to embe, relative to the repo path or remote json location. */
				path: null,
				/* type="string" Required. Label and ID for the tab, should be unique.*/
				label: null,
				/* type="string" Type of the file (matching Highlight.JS options) or "htmlpage" to embed live page instead from `url` . */
				type: null,
				/* type="string" When type is "htmlpage", this URL is embedded instead */
				url: null
			}]
		},
		locale: {
			fiddle: "Show In JsFiddle",
			gitHubLink: "On GitHub",
			copyAll: "Copy to Clipboard",
			errorInit: "Something went wrong..",
			errorContent: "An error has occurred while retrieving data.",
		},
		css: {
			/* Classes applied to the loader element */
			loaderClass: "loader",
			/* Class applied to to the main element. Tabs class added in advance of creating them for intiail layout */
			container: "ui-tabs ui-ghembed ui-widget",
			/* Class applied to error messages */
			errorText: "ui-state-error error-text",
			/* Class applied to the tabs panel container when content has been loaded */
			contentLoaded: "content-loaded",
			/* Class applied to the JSFiddle button */
			jsFiddle: "JSFiddle",
			/* Class applied to the source container element */
			gitHubLinkContainer: "github-link-container",
			/* Class applied to the source link */
			gitHubLink: "github-link",
			/* Class applied to the copy button */
			copyAllButton: "codeViewerSelectAll"
		},
		_ghAPI: "", //"https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}",
		_ghRawAPI: "https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}",
		_fiddleUrl: "https://jsfiddle.net/gh/get/jquery/1.9.1/${owner}/${repo}/tree/${ref}/${path}",
		_createWidget: function () {
			// clear out doc embed before options are applied
			this.options.embed = [];			
			$.Widget.prototype._createWidget.apply(this, arguments);
		},
		_create: function () {
			var link;
			this.element.css("height", this.options.height);
			this.element.addClass(this.css.container);

			if (!this.options.remoteUrl && !this.options.embed.length) {
				//find embed link:
				link = this.element.children("a")[0];
				if (link && link.hostname === "github.com") {
					this.options.remoteUrl = link.href;
				}
			}
			
			// show loader
			this.$loader = $(this._loaderHtml());
			this.$loader.appendTo(this.element);

        	if (this.options.remoteUrl) {
				this._parsePath(this.options.remoteUrl.split("github.com/").pop());
				this._remoteInit();
			} else {
				this._render();
			}
		},
		_remoteInit: function () {
			var self = this;
			this._getGhFile(this.options.relativePath + "/" + this.options.remoteConfigName)
				.done(function(data) {
					self.options = $.extend(self.options, JSON.parse(data));
					self._render();
				})
				.fail(function() {
					self.element.append(self._errorHtml(self.locale.errorContent));
					self.$loader.fadeOut();
				});
		},
		_render: function () {
			var html = "", self = this;
			if (!this.options.repo || !this.options.owner || !this.options.ref || !this.options.embed.length) {
				this.element.append(this._errorHtml(self.locale.errorInit));
				this.$loader.fadeOut();
				return;
			}
			html += this._fiddleHtml();
			html += this._copyHtml();
			html += this._createTabs();
			html += this._sourceLinkHtml();
			html += this._loaderHtml(true);
			this.element.html(html);
			this.$loader = this.element.children("." + this.css.loaderClass);
			this.$copyAllButton = this.element.children("." + this.css.copyAllButton);

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
			var result = "", 
				text = this.locale.fiddle;
			if (this.options.relativePath) {
				result = "<div class='" + this.css.jsFiddle + "'><a href='" + this._getUrl(this.options.relativePath + this.options.fiddleFolder, "fiddle") + "'target='_blank'>" + text + "</a></div>";
			}
			return result;
		},
		_sourceLinkHtml: function () {
			var result = "",
				text = this.locale.gitHubLink;
			if (this.options.srcUrlPattern) {
				result = "<div class='" + this.css.gitHubLinkContainer  + "'><a href='" + this._getUrl("", "src") + "'target='_blank' class='" + this.css.gitHubLink  + "'>" + text + "</a></div>";
			}
			return result;
		},
		_copyHtml: function () {
			var text = this.locale.copyAll;
			return "<span class='" + this.css.copyAllButton + "'>" + text + "</span>";
		},
		_createTabs: function () {
			var tab, tabId, mainHeader = "<ul>", tabs = "";

			for (var i = 0; i < this.options.embed.length; i++) {
				tab = this.options.embed[i];
				tabId = tab.label || "tab-" + (i+1);
				mainHeader += "<li><a href='#" + tabId + "'>" + tab.label + "</a></li>";
				tabs += "<div id='" + tabId + "' tabindex='0'></div>";
			}
			mainHeader += "</ul>"

			return mainHeader + tabs;
		},
		_errorHtml: function (text) {
			return "<div class='" + this.css.errorText + "'>" + text + "</div>";
		},
		_attachEvents: function () {
			var self = this;
			this.copyButton = this.element.children("." + this.css.copyAllButton);
			this.copyButton.on("click", function (e) {
				self._selectAll(true);
			} );
			this.element.on("keydown", ".ui-tabs-panel", function (e) {
				if (e.ctrlKey) {
					if (e.keyCode == 65 || e.keyCode == 97) { // 'A' or 'a'
						e.preventDefault();
						self._selectAll();
					}
				}
			});
		},
		_selectAll: function (copy) {
			var range;
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
			if (copy) {
				document.execCommand("copy");
			}
		},
		_parsePath: function (path) {
			path = path.replace(/^\//, "").split("/");
			this.options.owner = path[0];
			this.options.repo = path[1];
			this.options.ref = path[3];
			this.options.relativePath = path.slice(4).join("/");
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
				case "src":
					url = this.options.srcUrlPattern;
					if (url.indexOf("https://github.com") != 0) {
						url = "https://github.com" + url;
					}
					break;
				default:
					url = this._ghAPI;
					break;
			}
			for (var i = 0; i < settings.length; i++) {
				url = url.replace("${" + settings[i] + "}", this.options[ settings[i] ]) ;
				
			}
			url = url.replace("${path}", path);
			console.log(url);
			return url;
		},
		_loadTabContent: function (tab) {
			var self = this;
			self.$loader.show();
			if (tab.type === "htmlpage") {
				var frame = $("<iframe>", { src: tab.url }).appendTo(this.activePanel);
				frame.one("load", function() {
					self.$loader.fadeOut();
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
					self.activePanel.html(self._errorHtml(self.locale.errorContent));
				})
				.always(function() {
					self.activePanel.addClass(self.css.contentLoaded);
					self.$loader.fadeOut();
				});
			}
			
		},
		activateTab: function (index) {
			var tab = this.options.embed[ index ];
			if (!tab) {
				return;
			}
			this.element.tabs("option", "active", index);
			this.activePanel = this.element.find("#" + tab.label);

			if (!this.activePanel.hasClass(this.css.contentLoaded)) {
				this._loadTabContent(tab);
			}

			if (tab.type === "htmlpage") {
				this.$copyAllButton.hide();
			} else {
				this.$copyAllButton.show();
			}
		},
		destroy: function () {
			this.element.tabs( "destroy" );
			this.$loader.remove();
			this.element.children("ul").remove();
			//this.element.children("")
		}
	});
})(jQuery, hljs);